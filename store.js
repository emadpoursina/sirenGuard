const Store = require('electron-store').default;

function defaultTriggersArray() {
  return [
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
      flaggedApps: [],
    },
  ];
}

const store = new Store({
  defaults: {
    buttonPosition: { x: 100, y: 100 },
    launchAtLogin: false,
    startMinimized: false,
    cancelWindowSeconds: 2,
    buttonOpacity: 0.4,
    buttonColor: '#D9534F',
    triggers: defaultTriggersArray(),
  },
});

function getButtonPosition() {
  return store.get('buttonPosition');
}

function setButtonPosition(position) {
  store.set('buttonPosition', position);
}

function getLaunchAtLogin() {
  return store.get('launchAtLogin');
}

function setLaunchAtLogin(enabled) {
  store.set('launchAtLogin', enabled);
}

function getStartMinimized() {
  return store.get('startMinimized');
}

function setStartMinimized(enabled) {
  store.set('startMinimized', enabled);
}

function getCancelWindowSeconds() {
  return store.get('cancelWindowSeconds');
}

function setCancelWindowSeconds(seconds) {
  store.set('cancelWindowSeconds', seconds);
}

function getButtonOpacity() {
  return store.get('buttonOpacity');
}

function setButtonOpacity(opacity) {
  store.set('buttonOpacity', opacity);
}

function getButtonColor() {
  return store.get('buttonColor');
}

function setButtonColor(color) {
  store.set('buttonColor', color);
}

function getTriggerConfig() {
  return store.get('triggers');
}

function setTriggerConfig(config) {
  if (!Array.isArray(config)) {
    console.warn('siren-guard: setTriggerConfig expected array, ignoring');
    return;
  }
  store.set('triggers', config);
}

function getTriggerById(id) {
  const triggers = store.get('triggers');
  if (!Array.isArray(triggers)) {
    return undefined;
  }
  return triggers.find((t) => t.id === id);
}

function setTriggerById(id, partial) {
  const triggers = store.get('triggers');
  if (!Array.isArray(triggers)) {
    return;
  }
  const next = triggers.map((t) => (t.id === id ? { ...t, ...partial } : t));
  store.set('triggers', next);
}

function getIdleTrigger() {
  return getTriggerById('idle');
}

function setIdleTrigger(config) {
  setTriggerById('idle', config);
}

function getAppDetectionTrigger() {
  return getTriggerById('app-detection');
}

function setAppDetectionTrigger(config) {
  setTriggerById('app-detection', config);
}

function getFlaggedApps() {
  const trigger = getAppDetectionTrigger();
  return trigger?.flaggedApps ?? [];
}

function setFlaggedApps(apps) {
  setTriggerById('app-detection', { flaggedApps: apps });
}

function migrateTriggersSchema() {
  const current = store.get('triggers');

  if (Array.isArray(current)) {
    return;
  }

  let next;
  if (current && typeof current === 'object') {
    if (!current.idle && !current.appDetection) {
      console.warn('siren-guard: unrecognized triggers shape, resetting to defaults');
      next = defaultTriggersArray();
    } else {
      const idle = current.idle || {};
      const appDetection = current.appDetection || {};
      next = [
        {
          id: 'idle',
          name: 'Idle-timer',
          enabled: !!idle.enabled,
          thresholdSec: Number(idle.thresholdSec) || 300,
        },
        {
          id: 'app-detection',
          name: 'App-detection',
          enabled: !!appDetection.enabled,
          delaySec: Number(appDetection.delaySec) || 10,
          flaggedApps: Array.isArray(appDetection.flaggedApps)
            ? appDetection.flaggedApps
            : [],
        },
      ];
    }
  } else {
    console.warn('siren-guard: unrecognized triggers shape, resetting to defaults');
    next = defaultTriggersArray();
  }

  store.set('triggers', next);
}

module.exports = {
  getButtonPosition,
  setButtonPosition,
  getLaunchAtLogin,
  setLaunchAtLogin,
  getStartMinimized,
  setStartMinimized,
  getCancelWindowSeconds,
  setCancelWindowSeconds,
  getButtonOpacity,
  setButtonOpacity,
  getButtonColor,
  setButtonColor,
  getTriggerConfig,
  setTriggerConfig,
  getTriggerById,
  setTriggerById,
  getIdleTrigger,
  setIdleTrigger,
  getAppDetectionTrigger,
  setAppDetectionTrigger,
  getFlaggedApps,
  setFlaggedApps,
  migrateTriggersSchema,
};
