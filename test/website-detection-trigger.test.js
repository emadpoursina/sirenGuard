import { test, expect, mock, beforeEach, afterEach } from 'bun:test';

const lockCalls = { arm: 0, cancel: 0, armed: false, suppress: false };

let websiteTriggerConfig = {
  enabled: true,
  delaySec: 0.05,
  targets: ['example.com'],
};

mock.module('../lock-orchestration.js', () => ({
  arm: (opts) => {
    lockCalls.arm += 1;
    lockCalls.suppress = Boolean(opts?.suppressCancel);
    lockCalls.armed = true;
  },
  cancel: () => {
    lockCalls.cancel += 1;
    lockCalls.armed = false;
  },
  isArmed: () => lockCalls.armed,
}));

mock.module('../store.js', () => ({
  getWebsiteDetectionTrigger: () => websiteTriggerConfig,
  isTriggersSuspended: () => false,
  RE_ENTRY_BLOCK_SEC: 300,
}));

const trigger = await import('../website-detection-trigger.js');

beforeEach(() => {
  lockCalls.arm = 0;
  lockCalls.cancel = 0;
  lockCalls.armed = false;
  websiteTriggerConfig = {
    enabled: true,
    delaySec: 0.05,
    targets: ['example.com'],
  };
  trigger.stop();
});

afterEach(() => {
  trigger.stop();
  mock.restore();
});

test('onSiteMatch arms after delaySec when enabled', async () => {
  trigger.onSiteMatch('example.com', 'https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(lockCalls.arm).toBe(1);
  expect(lockCalls.cancel).toBe(0);
});

test('onSiteLeave cancels when this trigger armed', async () => {
  trigger.onSiteMatch('example.com', 'https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 80));
  trigger.onSiteLeave();
  expect(lockCalls.cancel).toBe(1);
});

test('disabled trigger does not arm on match', async () => {
  websiteTriggerConfig.enabled = false;
  trigger.onSiteMatch('example.com', 'https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(lockCalls.arm).toBe(0);
});

test('onSiteMatch arms immediately when hostname is blocked', () => {
  trigger.registerSiteBlock('example.com');
  lockCalls.arm = 0;
  trigger.onSiteMatch('example.com', 'https://example.com');
  expect(lockCalls.arm).toBe(1);
  expect(lockCalls.suppress).toBe(true);
});

test('stop clears armed state owned by website trigger', async () => {
  trigger.onSiteMatch('example.com', 'https://example.com');
  await new Promise((resolve) => setTimeout(resolve, 80));
  trigger.stop();
  expect(lockCalls.cancel).toBe(1);
});
