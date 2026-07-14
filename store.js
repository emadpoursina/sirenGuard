const fs = require('fs');
const path = require('path');
const Store = require('electron-store').default;
const { websiteServerPort } = require('./config');

const RE_ENTRY_BLOCK_SEC = 5 * 60;
const ESCALATION_WINDOW_SEC = 15 * 60;
const MIN_WATCH_SEC = 10;

function defaultReminder() {
  return {
    mediaType: null,
    mediaPath: null,
    caption: '',
    minWatchSec: MIN_WATCH_SEC,
  };
}

function defaultSafeApp() {
  return {
    name: null,
    bundleId: null,
  };
}

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
    {
      id: 'website-detection',
      name: 'Website-detection',
      enabled: false,
      delaySec: 10,
      targets: [],
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
    reminder: defaultReminder(),
    safeApp: defaultSafeApp(),
    confirmationPhrase: '',
    overrideLog: [],
    overrideUntil: null,
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

function getWebsiteDetectionTrigger() {
  return getTriggerById('website-detection');
}

function setWebsiteDetectionTrigger(config) {
  setTriggerById('website-detection', config);
}

function getWebsiteTargets() {
  const trigger = getWebsiteDetectionTrigger();
  return trigger?.targets ?? [];
}

function setWebsiteTargets(targets) {
  setTriggerById('website-detection', { targets });
}

function getWebsiteServerPort() {
  const port = Number(websiteServerPort);
  return Number.isFinite(port) && port > 0 ? port : null;
}

function getReminder() {
  const reminder = store.get('reminder');
  if (!reminder || typeof reminder !== 'object') {
    return defaultReminder();
  }
  return { ...defaultReminder(), ...reminder };
}

function setReminder(reminder) {
  if (!reminder || typeof reminder !== 'object') {
    return;
  }
  store.set('reminder', { ...getReminder(), ...reminder });
}

function getSafeApp() {
  const safeApp = store.get('safeApp');
  if (!safeApp || typeof safeApp !== 'object') {
    return defaultSafeApp();
  }
  return { ...defaultSafeApp(), ...safeApp };
}

function setSafeApp(safeApp) {
  if (!safeApp || typeof safeApp !== 'object') {
    return;
  }
  store.set('safeApp', { ...getSafeApp(), ...safeApp });
}

function getConfirmationPhrase() {
  const phrase = store.get('confirmationPhrase');
  return typeof phrase === 'string' ? phrase : '';
}

function setConfirmationPhrase(phrase) {
  store.set('confirmationPhrase', typeof phrase === 'string' ? phrase : '');
}

function getOverrideLog() {
  const log = store.get('overrideLog');
  return Array.isArray(log) ? log : [];
}

function getOverrideUntil() {
  const value = store.get('overrideUntil');
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function setOverrideUntil(timestamp) {
  if (timestamp == null) {
    store.set('overrideUntil', null);
    return;
  }
  const next = Number(timestamp);
  store.set('overrideUntil', Number.isFinite(next) ? next : null);
}

function isTriggersSuspended(now = Date.now()) {
  const until = getOverrideUntil();
  if (!until) {
    return false;
  }
  if (now >= until) {
    setOverrideUntil(null);
    return false;
  }
  return true;
}

function appendOverrideLog(entry) {
  if (!entry || typeof entry !== 'object' || !entry.kind) {
    return;
  }
  const next = [
    ...getOverrideLog(),
    {
      timestamp: entry.timestamp ?? Date.now(),
      kind: entry.kind,
    },
  ];
  store.set('overrideLog', next);
}

function getReminderMediaDir(userDataPath) {
  const base =
    userDataPath ?? require('electron').app.getPath('userData');
  return path.join(base, 'reminder-media');
}

function ensureReminderMediaDir(userDataPath) {
  const dir = getReminderMediaDir(userDataPath);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getAllSettings() {
  return {
    buttonPosition: getButtonPosition(),
    launchAtLogin: getLaunchAtLogin(),
    startMinimized: getStartMinimized(),
    cancelWindowSeconds: getCancelWindowSeconds(),
    buttonOpacity: getButtonOpacity(),
    buttonColor: getButtonColor(),
    websiteServerPort: getWebsiteServerPort(),
    triggers: getTriggerConfig(),
    reminder: getReminder(),
    safeApp: getSafeApp(),
    confirmationPhrase: getConfirmationPhrase(),
    overrideLog: getOverrideLog(),
    overrideUntil: getOverrideUntil(),
  };
}

function updateSettings(partial) {
  if (!partial || typeof partial !== 'object') {
    return;
  }

  if (partial.buttonPosition !== undefined) {
    setButtonPosition(partial.buttonPosition);
  }
  if (partial.launchAtLogin !== undefined) {
    setLaunchAtLogin(partial.launchAtLogin);
  }
  if (partial.startMinimized !== undefined) {
    setStartMinimized(partial.startMinimized);
  }
  if (partial.cancelWindowSeconds !== undefined) {
    setCancelWindowSeconds(partial.cancelWindowSeconds);
  }
  if (partial.buttonOpacity !== undefined) {
    setButtonOpacity(partial.buttonOpacity);
  }
  if (partial.buttonColor !== undefined) {
    setButtonColor(partial.buttonColor);
  }
  if (partial.triggers !== undefined && Array.isArray(partial.triggers)) {
    const current = getTriggerConfig();
    if (!Array.isArray(current)) {
      setTriggerConfig(partial.triggers);
      return;
    }

    const merged = current.map((entry) => {
      const update = partial.triggers.find((t) => t.id === entry.id);
      return update ? { ...entry, ...update } : entry;
    });

    partial.triggers.forEach((t) => {
      if (t.id && !merged.some((m) => m.id === t.id)) {
        merged.push(t);
      }
    });

    setTriggerConfig(merged);
  }
  if (partial.reminder !== undefined) {
    setReminder(partial.reminder);
  }
  if (partial.safeApp !== undefined) {
    setSafeApp(partial.safeApp);
  }
  if (partial.confirmationPhrase !== undefined) {
    setConfirmationPhrase(partial.confirmationPhrase);
  }
  if (partial.overrideLog !== undefined && Array.isArray(partial.overrideLog)) {
    store.set('overrideLog', partial.overrideLog);
  }
  if (partial.overrideUntil !== undefined) {
    setOverrideUntil(partial.overrideUntil);
  }
}

function resetSettings() {
  store.clear();
}

function getStorePath() {
  return store.path;
}

function migrateTriggersSchema() {
  const current = store.get('triggers');

  if (Array.isArray(current)) {
    if (!current.some((t) => t.id === 'website-detection')) {
      store.set('triggers', [
        ...current,
        {
          id: 'website-detection',
          name: 'Website-detection',
          enabled: false,
          delaySec: 10,
          targets: [],
        },
      ]);
    }
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
  RE_ENTRY_BLOCK_SEC,
  ESCALATION_WINDOW_SEC,
  MIN_WATCH_SEC,
  defaultReminder,
  defaultSafeApp,
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
  getWebsiteDetectionTrigger,
  setWebsiteDetectionTrigger,
  getWebsiteTargets,
  setWebsiteTargets,
  getWebsiteServerPort,
  getReminder,
  setReminder,
  getSafeApp,
  setSafeApp,
  getConfirmationPhrase,
  setConfirmationPhrase,
  getOverrideLog,
  appendOverrideLog,
  getOverrideUntil,
  setOverrideUntil,
  isTriggersSuspended,
  getReminderMediaDir,
  ensureReminderMediaDir,
  migrateTriggersSchema,
  getAllSettings,
  updateSettings,
  resetSettings,
  getStorePath,
  defaultTriggersArray,
};
