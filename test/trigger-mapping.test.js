import { test, expect } from 'bun:test';
const {
  triggersArrayToLegacyObject,
  legacyObjectToTriggersArray,
} = require('../trigger-mapping');

test('triggersArrayToLegacyObject maps array to legacy object shape', () => {
  const arr = [
    {
      id: 'idle',
      name: 'Idle-timer',
      enabled: true,
      thresholdSec: 120,
    },
    {
      id: 'app-detection',
      name: 'App-detection',
      enabled: false,
      delaySec: 7,
      flaggedApps: [{ name: 'X', bundleId: 'com.x' }],
    },
  ];
  const legacy = triggersArrayToLegacyObject(arr);
  expect(legacy).toHaveProperty('idle');
  expect(legacy).toHaveProperty('appDetection');
  expect(legacy.idle.enabled).toBe(true);
  expect(legacy.idle.thresholdSec).toBe(120);
  expect(legacy.appDetection.enabled).toBe(false);
  expect(legacy.appDetection.delaySec).toBe(7);
  expect(legacy.appDetection.flaggedApps).toEqual([
    { name: 'X', bundleId: 'com.x' },
  ]);
});

test('triggersArrayToLegacyObject defaults flaggedApps to [] when missing', () => {
  const arr = [
    { id: 'idle', enabled: false, thresholdSec: 300 },
    { id: 'app-detection', enabled: false, delaySec: 10 },
  ];
  const legacy = triggersArrayToLegacyObject(arr);
  expect(Array.isArray(legacy.appDetection.flaggedApps)).toBe(true);
  expect(legacy.appDetection.flaggedApps).toEqual([]);
});

test('triggersArrayToLegacyObject tolerates missing entries via empty defaults', () => {
  const legacy = triggersArrayToLegacyObject([]);
  expect(legacy.idle).toEqual({ enabled: undefined, thresholdSec: undefined });
  expect(legacy.appDetection).toEqual({
    enabled: undefined,
    delaySec: undefined,
    flaggedApps: [],
  });
});

test('legacyObjectToTriggersArray maps legacy object to array shape', () => {
  const legacy = {
    idle: { enabled: true, thresholdSec: 90 },
    appDetection: {
      enabled: true,
      delaySec: 15,
      flaggedApps: [{ name: 'Y', bundleId: 'com.y' }],
    },
  };
  const arr = legacyObjectToTriggersArray(legacy);
  expect(Array.isArray(arr)).toBe(true);
  expect(arr.length).toBe(2);
  expect(arr[0].id).toBe('idle');
  expect(arr[0].name).toBe('Idle-timer');
  expect(arr[0].enabled).toBe(true);
  expect(arr[0].thresholdSec).toBe(90);
  expect(arr[1].id).toBe('app-detection');
  expect(arr[1].name).toBe('App-detection');
  expect(arr[1].enabled).toBe(true);
  expect(arr[1].delaySec).toBe(15);
  expect(arr[1].flaggedApps).toEqual([{ name: 'Y', bundleId: 'com.y' }]);
});

test('legacyObjectToTriggersArray applies defaults for missing numeric fields', () => {
  const arr = legacyObjectToTriggersArray({ idle: {}, appDetection: {} });
  expect(arr[0].enabled).toBe(false);
  expect(arr[0].thresholdSec).toBe(300);
  expect(arr[1].enabled).toBe(false);
  expect(arr[1].delaySec).toBe(10);
  expect(arr[1].flaggedApps).toEqual([]);
});

test('legacyObjectToTriggersArray coerces invalid numbers to defaults', () => {
  const arr = legacyObjectToTriggersArray({
    idle: { enabled: 1, thresholdSec: 'abc' },
    appDetection: { enabled: 0, delaySec: NaN, flaggedApps: 'no' },
  });
  expect(arr[0].enabled).toBe(true);
  expect(arr[0].thresholdSec).toBe(300);
  expect(arr[1].enabled).toBe(false);
  expect(arr[1].delaySec).toBe(10);
  expect(arr[1].flaggedApps).toEqual([]);
});

test('legacyObjectToTriggersArray tolerates missing idle/appDetection keys', () => {
  const arr = legacyObjectToTriggersArray({});
  expect(arr.length).toBe(2);
  expect(arr[0].id).toBe('idle');
  expect(arr[0].thresholdSec).toBe(300);
  expect(arr[1].id).toBe('app-detection');
  expect(arr[1].delaySec).toBe(10);
});

test('array -> legacy -> array round-trips stable for well-formed input', () => {
  const original = [
    {
      id: 'idle',
      name: 'Idle-timer',
      enabled: true,
      thresholdSec: 240,
    },
    {
      id: 'app-detection',
      name: 'App-detection',
      enabled: true,
      delaySec: 20,
      flaggedApps: [{ name: 'Z', bundleId: 'com.z' }],
    },
  ];
  const legacy = triggersArrayToLegacyObject(original);
  const back = legacyObjectToTriggersArray(legacy);
  expect(back[0].id).toBe('idle');
  expect(back[0].enabled).toBe(true);
  expect(back[0].thresholdSec).toBe(240);
  expect(back[1].id).toBe('app-detection');
  expect(back[1].enabled).toBe(true);
  expect(back[1].delaySec).toBe(20);
  expect(back[1].flaggedApps).toEqual([{ name: 'Z', bundleId: 'com.z' }]);
});
