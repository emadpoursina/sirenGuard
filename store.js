const Store = require('electron-store').default;

const store = new Store({
  defaults: {
    buttonPosition: { x: 100, y: 100 },
    launchAtLogin: false,
    startMinimized: false,
    cancelWindowSeconds: 2,
    buttonOpacity: 0.4,
    buttonColor: '#D9534F',
    triggers: {
      idle: {
        enabled: false,
        thresholdSec: 300,
      },
      appDetection: {
        enabled: false,
        delaySec: 10,
        flaggedApps: [],
      },
    },
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
  store.set('triggers', config);
}

function getIdleTrigger() {
  return store.get('triggers.idle');
}

function setIdleTrigger(config) {
  store.set('triggers.idle', config);
}

function getAppDetectionTrigger() {
  return store.get('triggers.appDetection');
}

function setAppDetectionTrigger(config) {
  store.set('triggers.appDetection', config);
}

function getFlaggedApps() {
  return store.get('triggers.appDetection.flaggedApps');
}

function setFlaggedApps(apps) {
  store.set('triggers.appDetection.flaggedApps', apps);
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
  getIdleTrigger,
  setIdleTrigger,
  getAppDetectionTrigger,
  setAppDetectionTrigger,
  getFlaggedApps,
  setFlaggedApps,
};
