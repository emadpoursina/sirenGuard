const Store = require('electron-store');

const store = new Store({
  defaults: {
    buttonPosition: { x: 100, y: 100 },
    launchAtLogin: false,
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

module.exports = {
  getButtonPosition,
  setButtonPosition,
  getLaunchAtLogin,
  setLaunchAtLogin,
};
