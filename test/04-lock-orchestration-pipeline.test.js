import { test, expect, mock, beforeEach, afterEach } from 'bun:test';

const overlayShows = [];
const consequences = [];
const storePath = require.resolve('../store.js');
const lockPath = require.resolve('../lock-orchestration.js');

function createStoreMock() {
  return {
    getCancelWindowSeconds: () => 0.01,
    getReminder: () => ({
      mediaType: null,
      mediaPath: null,
      caption: 'Focus',
      minWatchSec: 1,
    }),
    getReminderMediaDir: () => '/tmp/reminder-media',
    ESCALATION_WINDOW_SEC: 900,
    MIN_WATCH_SEC: 10,
  };
}

let lock;

beforeEach(async () => {
  mock.restore();
  mock.module('../reminder-overlay.js', () => ({
    show: async (payload) => {
      overlayShows.push(payload);
    },
  }));
  mock.module('../app-consequence-action.js', () => ({
    executeAppConsequence: async (app) => {
      consequences.push({ kind: 'app', app });
    },
  }));
  mock.module('../website-consequence-action.js', () => ({
    executeWebsiteConsequence: async (hostname) => {
      consequences.push({ kind: 'website', hostname });
    },
  }));
  mock.module('../idle-consequence-action.js', () => ({
    executeIdleConsequence: async () => {
      consequences.push({ kind: 'idle' });
    },
  }));
  mock.module('child_process', () => ({
    exec: (_cmd, cb) => cb(null),
  }));

  overlayShows.length = 0;
  consequences.length = 0;
  delete require.cache[lockPath];
  require.cache[storePath] = {
    id: storePath,
    filename: storePath,
    loaded: true,
    exports: createStoreMock(),
  };
  lock = require('../lock-orchestration.js');
  lock.lockScreen = () => {};
  lock.cancel();
  lock.resetEscalationForTests();
});

afterEach(() => {
  delete require.cache[storePath];
});

test('manual arm shows reminder then locks screen', async () => {
  lock.arm({ triggerKind: 'manual' });
  expect(lock.isArmed()).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(overlayShows.length).toBe(1);
  expect(lock.isArmed()).toBe(false);
});

test('automatic arm shows reminder then completes pipeline', async () => {
  lock.arm({
    triggerKind: 'website',
    context: { hostname: 'example.com' },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(overlayShows.length).toBe(1);
  expect(consequences[0]).toEqual({ kind: 'website', hostname: 'example.com' });
  expect(lock.isArmed()).toBe(false);
});

test('escalated automatic arm skips cancel window but still shows reminder', async () => {
  lock.arm({ triggerKind: 'website', context: { hostname: 'a.com' } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  consequences.length = 0;
  overlayShows.length = 0;

  lock.arm({ triggerKind: 'website', context: { hostname: 'b.com' } });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(overlayShows.length).toBe(1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(consequences[0]).toEqual({ kind: 'website', hostname: 'b.com' });
  expect(lock.isArmed()).toBe(false);
});

test('cancel works during automatic cancel window', async () => {
  lock.arm({ triggerKind: 'website', context: { hostname: 'example.com' } });
  expect(lock.isArmed()).toBe(true);
  lock.cancel();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(overlayShows.length).toBe(0);
  expect(consequences.length).toBe(0);
});

test('manual arm stays armed until cancel before timeout elapses', () => {
  lock.arm({ triggerKind: 'manual' });
  expect(lock.isArmed()).toBe(true);
  lock.cancel();
});

test('suppressCancel on automatic trigger completes pipeline', async () => {
  lock.arm({ triggerKind: 'website', suppressCancel: true, context: { hostname: 'x.com' } });
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(lock.isArmed()).toBe(false);
  expect(overlayShows.length).toBe(1);
  expect(consequences[0]).toEqual({ kind: 'website', hostname: 'x.com' });
});

