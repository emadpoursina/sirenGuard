import { test, expect, mock, beforeEach } from 'bun:test';

const execCalls = [];

mock.module('../store.js', () => ({
  RE_ENTRY_BLOCK_SEC: 300,
}));

mock.module('child_process', () => ({
  exec: (cmd, cb) => {
    execCalls.push(cmd);
    cb(null, '');
  },
}));

const action = await import('../app-consequence-action.js');

beforeEach(() => {
  execCalls.length = 0;
  action.clearAppBlocks();
});

test('executeAppConsequence registers a re-entry block', async () => {
  const execFn = (cmd, cb) => {
    execCalls.push(cmd);
    cb(null, '');
  };
  await action.executeAppConsequence(
    { name: 'Slack', bundleId: 'com.tinyspeck.slackmacgap' },
    execFn,
  );
  expect(action.isAppBlocked({ bundleId: 'com.tinyspeck.slackmacgap' })).toBe(
    true,
  );
});

test('isAppBlocked returns false for unknown app', () => {
  expect(action.isAppBlocked({ name: 'Notes' })).toBe(false);
});
