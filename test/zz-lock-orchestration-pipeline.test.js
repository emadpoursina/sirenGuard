import { test, expect, mock, beforeEach, afterEach } from 'bun:test';

const overlayShows = [];
const consequences = [];

function applyMocks() {
  mock.module('../store.js', () => ({
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
  }));

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
}

let lock;

beforeEach(async () => {
  mock.restore();
  applyMocks();
  overlayShows.length = 0;
  consequences.length = 0;
  const lockPath = require.resolve('../lock-orchestration.js');
  delete require.cache[lockPath];
  lock = require('../lock-orchestration.js');
  lock.cancel();
  lock.resetEscalationForTests();
});

afterEach(() => {
  mock.restore();
});

test('manual arm locks without showing reminder overlay', async () => {
  lock.arm({ triggerKind: 'manual' });
  expect(lock.isArmed()).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(overlayShows.length).toBe(0);
  expect(lock.isArmed()).toBe(false);
});

test('automatic app arm shows reminder then runs app consequence', async () => {
  lock.arm({
    triggerKind: 'app',
    context: { app: { name: 'Slack', bundleId: 'com.slack' } },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(overlayShows.length).toBe(1);
  expect(consequences[0]).toEqual({
    kind: 'app',
    app: { name: 'Slack', bundleId: 'com.slack' },
  });
  expect(lock.isArmed()).toBe(false);
});

test('escalated automatic arm skips cancel window but still shows reminder', async () => {
  lock.arm({ triggerKind: 'idle' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  consequences.length = 0;
  overlayShows.length = 0;

  lock.arm({ triggerKind: 'idle' });
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(overlayShows.length).toBe(1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(consequences[0]).toEqual({ kind: 'idle' });
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
  lock.arm({ triggerKind: 'idle', suppressCancel: true });
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(lock.isArmed()).toBe(false);
  expect(overlayShows.length).toBe(1);
});
