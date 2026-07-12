const savedIndicator = document.getElementById('saved-indicator');

let currentSettings = null;
let savedTimeout = null;
const sectionHandlers = new Map();

function showSaved() {
  savedIndicator.hidden = false;
  if (savedTimeout) {
    clearTimeout(savedTimeout);
  }
  savedTimeout = setTimeout(() => {
    savedIndicator.hidden = true;
    savedTimeout = null;
  }, 1500);
}

async function updateSettings(partial) {
  currentSettings = await window.sirenGuardSettings.updateSettings(partial);
  showSaved();
  return currentSettings;
}

function notifySections(settings) {
  sectionHandlers.forEach((handler) => {
    handler(settings);
  });
}

window.dashboard = {
  getSettings: () => currentSettings,
  updateSettings,
  registerSection: (id, handler) => {
    sectionHandlers.set(id, handler);
  },
};

document.addEventListener('DOMContentLoaded', async () => {
  currentSettings = await window.sirenGuardSettings.getSettings();

  window.sirenGuardSettings.onSettingsChanged((settings) => {
    currentSettings = settings;
    notifySections(settings);
  });

  initGeneralSection();
  initButtonSection();
  initTriggersSection();
  initAboutSection();
});
