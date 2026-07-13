import { test, expect, mock, beforeEach } from 'bun:test';

const lockCalls = { count: 0 };
let safeAppConfig = { name: null, bundleId: null };

mock.module('../lock-orchestration.js', () => ({
  lockScreen: () => {
    lockCalls.count += 1;
  },
}));

mock.module('../store.js', () => ({
  getSafeApp: () => safeAppConfig,
}));

const action = await import('../idle-consequence-action.js');

function mockExec({ fail = false } = {}) {
  const calls = [];
  const execFn = (cmd, cb) => {
    calls.push(cmd);
    if (fail) {
      cb(new Error('app not found'));
      return;
    }
    cb(null);
  };
  return { execFn, calls };
}

beforeEach(() => {
  lockCalls.count = 0;
  safeAppConfig = { name: null, bundleId: null };
});

test('executeIdleConsequence activates safe app by name then locks', async () => {
  safeAppConfig = { name: 'Notes', bundleId: null };
  const { execFn, calls } = mockExec();
  await action.executeIdleConsequence(execFn);
  expect(calls.length).toBe(1);
  expect(calls[0]).toContain('tell application "Notes" to activate');
  expect(lockCalls.count).toBe(1);
});

test('executeIdleConsequence activates safe app by bundle id then locks', async () => {
  safeAppConfig = { name: null, bundleId: 'com.apple.Notes' };
  const { execFn, calls } = mockExec();
  await action.executeIdleConsequence(execFn);
  expect(calls.length).toBe(1);
  expect(calls[0]).toContain(
    'tell application id "com.apple.Notes" to activate',
  );
  expect(lockCalls.count).toBe(1);
});

test('executeIdleConsequence locks only when safe app unset', async () => {
  const { execFn, calls } = mockExec();
  await action.executeIdleConsequence(execFn);
  expect(calls.length).toBe(0);
  expect(lockCalls.count).toBe(1);
});

test('executeIdleConsequence still locks when activation fails', async () => {
  safeAppConfig = { name: 'MissingApp', bundleId: null };
  const { execFn, calls } = mockExec({ fail: true });
  await action.executeIdleConsequence(execFn);
  expect(calls.length).toBe(1);
  expect(lockCalls.count).toBe(1);
});
