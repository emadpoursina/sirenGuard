import { test, expect, mock, beforeEach } from 'bun:test';

mock.module('../store.js', () => ({
  getCancelWindowSeconds: () => 2,
}));

mock.module('child_process', () => ({
  exec: (_cmd, cb) => cb(null),
}));

const lock = await import('../lock-orchestration.js');

beforeEach(() => {
  lock.cancel();
});

test('arm with suppressCancel does not stay armed', () => {
  lock.arm({ suppressCancel: true });
  expect(lock.isArmed()).toBe(false);
});

test('normal arm enters armed state until timeout', () => {
  lock.arm();
  expect(lock.isArmed()).toBe(true);
  lock.cancel();
});
