import { test, expect, mock, beforeEach } from 'bun:test';

const closeCalls = [];
const blockCalls = [];

mock.module('../website-server.js', () => ({
  requestCloseTab: (hostname, target) => {
    closeCalls.push({ hostname, target });
  },
}));

mock.module('../website-detection-trigger.js', () => ({
  registerSiteBlock: (site) => {
    blockCalls.push(site);
  },
}));

const action = await import('../website-consequence-action.js');

beforeEach(() => {
  closeCalls.length = 0;
  blockCalls.length = 0;
});

test('path target closes the matching tab and registers a path block', async () => {
  await action.executeWebsiteConsequence(
    'youtube.com',
    'youtube.com/shorts',
  );
  expect(closeCalls).toEqual([
    { hostname: 'youtube.com', target: 'youtube.com/shorts' },
  ]);
  expect(blockCalls).toEqual(['youtube.com/shorts']);
});

test('hostname-only targets still fall back to hostname blocking', async () => {
  await action.executeWebsiteConsequence('www.instagram.com');
  expect(closeCalls).toEqual([
    { hostname: 'www.instagram.com', target: 'instagram.com' },
  ]);
  expect(blockCalls).toEqual(['instagram.com']);
});
