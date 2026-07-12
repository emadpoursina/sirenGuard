import { test, expect, mock, beforeEach } from 'bun:test';

let lastInstance = null;

class StoreStub {
  constructor(opts = {}) {
    this._data = {};
    this.path =
      '/Users/test/Library/Application Support/siren-guard/config.json';
    if (opts.defaults) {
      for (const k of Object.keys(opts.defaults)) {
        this._data[k] = opts.defaults[k];
      }
    }
    lastInstance = this;
  }
  get(key) {
    return this._data[key];
  }
  set(key, val) {
    this._data[key] = val;
  }
  clear() {
    this._data = {};
  }
}

await mock.module('electron-store', () => ({ default: StoreStub }));

const store = await import('../store.js');

const initialSnapshot = lastInstance
  ? JSON.parse(JSON.stringify(lastInstance._data))
  : {};

function restoreDefaults() {
  lastInstance._data = JSON.parse(JSON.stringify(initialSnapshot));
}

function setRawTriggers(value) {
  lastInstance._data.triggers = value;
}

beforeEach(() => {
  restoreDefaults();
});

test('getStorePath returns a non-empty string path', () => {
  const p = store.getStorePath();
  expect(typeof p).toBe('string');
  expect(p.length).toBeGreaterThan(0);
  expect(p.endsWith('config.json')).toBe(true);
});

test('defaultTriggersArray returns both triggers with required fields', () => {
  const arr = store.defaultTriggersArray();
  expect(Array.isArray(arr)).toBe(true);
  expect(arr.length).toBe(2);
  const idle = arr.find((t) => t.id === 'idle');
  const appDetection = arr.find((t) => t.id === 'app-detection');
  expect(idle).toBeDefined();
  expect(idle.name).toBe('Idle-timer');
  expect(typeof idle.enabled).toBe('boolean');
  expect(typeof idle.thresholdSec).toBe('number');
  expect(appDetection).toBeDefined();
  expect(appDetection.name).toBe('App-detection');
  expect(typeof appDetection.enabled).toBe('boolean');
  expect(typeof appDetection.delaySec).toBe('number');
  expect(Array.isArray(appDetection.flaggedApps)).toBe(true);
});

test('getTriggerConfig returns the default array shape', () => {
  const triggers = store.getTriggerConfig();
  expect(Array.isArray(triggers)).toBe(true);
  expect(triggers[0].id).toBe('idle');
  expect(triggers[1].id).toBe('app-detection');
});

test('setTriggerConfig ignores non-array input (guard)', () => {
  const before = store.getTriggerConfig();
  store.setTriggerConfig('not-an-array');
  store.setTriggerConfig({ id: 'idle' });
  store.setTriggerConfig(null);
  const after = store.getTriggerConfig();
  expect(after).toEqual(before);
});

test('getTriggerById returns matching trigger and undefined for unknown', () => {
  expect(store.getTriggerById('idle').id).toBe('idle');
  expect(store.getTriggerById('app-detection').id).toBe('app-detection');
  expect(store.getTriggerById('does-not-exist')).toBeUndefined();
});

test('getTriggerById returns undefined when triggers is not an array', () => {
  setRawTriggers('bad-shape');
  expect(store.getTriggerById('idle')).toBeUndefined();
});

test('setTriggerById merges partial and preserves untouched fields', () => {
  store.setTriggerById('idle', { enabled: true, thresholdSec: 120 });
  const idle = store.getTriggerById('idle');
  expect(idle.enabled).toBe(true);
  expect(idle.thresholdSec).toBe(120);
  expect(idle.name).toBe('Idle-timer');
  expect(idle.id).toBe('idle');
});

test('getFlaggedApps returns [] when app-detection has no flaggedApps', () => {
  store.setTriggerConfig([
    {
      id: 'idle',
      name: 'Idle-timer',
      enabled: false,
      thresholdSec: 300,
    },
    {
      id: 'app-detection',
      name: 'App-detection',
      enabled: false,
      delaySec: 10,
    },
  ]);
  expect(store.getFlaggedApps()).toEqual([]);
});

test('getFlaggedApps returns [] when app-detection trigger is missing', () => {
  store.setTriggerConfig([
    { id: 'idle', name: 'Idle-timer', enabled: false, thresholdSec: 300 },
  ]);
  expect(store.getFlaggedApps()).toEqual([]);
});

test('updateSettings merges triggers: updates existing by id, appends new', () => {
  store.updateSettings({
    triggers: [
      { id: 'idle', enabled: true, thresholdSec: 99 },
      { id: 'new-trigger', name: 'New', enabled: false },
    ],
  });
  const result = store.getTriggerConfig();
  expect(result.length).toBe(3);
  const idle = result.find((t) => t.id === 'idle');
  expect(idle.enabled).toBe(true);
  expect(idle.thresholdSec).toBe(99);
  expect(idle.name).toBe('Idle-timer');
  const appDetection = result.find((t) => t.id === 'app-detection');
  expect(appDetection).toBeDefined();
  expect(appDetection.delaySec).toBe(10);
  const newTrigger = result.find((t) => t.id === 'new-trigger');
  expect(newTrigger).toBeDefined();
  expect(newTrigger.name).toBe('New');
});

test('updateSettings ignores non-object partial without throwing', () => {
  const before = store.getTriggerConfig();
  store.updateSettings(null);
  store.updateSettings('string');
  store.updateSettings(undefined);
  expect(store.getTriggerConfig()).toEqual(before);
});

test('migrateTriggersSchema is a no-op when triggers is already an array', () => {
  const before = store.getTriggerConfig();
  store.migrateTriggersSchema();
  expect(store.getTriggerConfig()).toEqual(before);
});

test('migrateTriggersSchema converts legacy object shape to array', () => {
  setRawTriggers({
    idle: { enabled: true, thresholdSec: 120 },
    appDetection: {
      enabled: true,
      delaySec: 5,
      flaggedApps: [{ name: 'X', bundleId: 'com.x' }],
    },
  });
  store.migrateTriggersSchema();
  const triggers = store.getTriggerConfig();
  expect(Array.isArray(triggers)).toBe(true);
  expect(triggers.length).toBe(2);
  expect(triggers[0].id).toBe('idle');
  expect(triggers[0].enabled).toBe(true);
  expect(triggers[0].thresholdSec).toBe(120);
  expect(triggers[0].name).toBe('Idle-timer');
  expect(triggers[1].id).toBe('app-detection');
  expect(triggers[1].enabled).toBe(true);
  expect(triggers[1].delaySec).toBe(5);
  expect(triggers[1].flaggedApps).toEqual([{ name: 'X', bundleId: 'com.x' }]);
});

test('migrateTriggersSchema applies defaults for falsy legacy fields', () => {
  setRawTriggers({
    idle: {},
    appDetection: { flaggedApps: 'not-an-array' },
  });
  store.migrateTriggersSchema();
  const triggers = store.getTriggerConfig();
  expect(triggers[0].enabled).toBe(false);
  expect(triggers[0].thresholdSec).toBe(300);
  expect(triggers[1].enabled).toBe(false);
  expect(triggers[1].delaySec).toBe(10);
  expect(Array.isArray(triggers[1].flaggedApps)).toBe(true);
  expect(triggers[1].flaggedApps).toEqual([]);
});

test('migrateTriggersSchema resets to defaults for object without idle/appDetection', () => {
  setRawTriggers({ foo: 'bar' });
  store.migrateTriggersSchema();
  const triggers = store.getTriggerConfig();
  expect(Array.isArray(triggers)).toBe(true);
  expect(triggers.length).toBe(2);
  expect(triggers[0].id).toBe('idle');
  expect(triggers[1].id).toBe('app-detection');
});

test('migrateTriggersSchema resets to defaults for non-object shape', () => {
  setRawTriggers('bad-string');
  store.migrateTriggersSchema();
  let triggers = store.getTriggerConfig();
  expect(Array.isArray(triggers)).toBe(true);
  expect(triggers.length).toBe(2);

  setRawTriggers(null);
  store.migrateTriggersSchema();
  triggers = store.getTriggerConfig();
  expect(Array.isArray(triggers)).toBe(true);
  expect(triggers.length).toBe(2);
});

test('getAllSettings returns object with all expected keys', () => {
  const all = store.getAllSettings();
  expect(all).toBeDefined();
  expect(all).toHaveProperty('buttonPosition');
  expect(all).toHaveProperty('launchAtLogin');
  expect(all).toHaveProperty('startMinimized');
  expect(all).toHaveProperty('cancelWindowSeconds');
  expect(all).toHaveProperty('buttonOpacity');
  expect(all).toHaveProperty('buttonColor');
  expect(all).toHaveProperty('triggers');
  expect(Array.isArray(all.triggers)).toBe(true);
});

test('resetSettings clears the store so triggers become undefined', () => {
  store.resetSettings();
  expect(store.getTriggerConfig()).toBeUndefined();
  expect(store.getButtonColor()).toBeUndefined();
});
