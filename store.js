const Store = require('electron-store').default;

const store = new Store({
  defaults: {
    buttonPosition: { x: 100, y: 100 },
    launchAtLogin: false,
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
  getTriggerConfig,
  setTriggerConfig,
  getIdleTrigger,
  setIdleTrigger,
  getAppDetectionTrigger,
  setAppDetectionTrigger,
  getFlaggedApps,
  setFlaggedApps,
};
