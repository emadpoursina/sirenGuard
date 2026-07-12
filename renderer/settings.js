const savedIndicator = document.getElementById('saved-indicator');

let currentSettings = null;
let savedTimeout = null;

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

window.dashboard = {
  getSettings: () => currentSettings,
  updateSettings,
};

document.addEventListener('DOMContentLoaded', async () => {
  currentSettings = await window.sirenGuardSettings.getSettings();

  window.sirenGuardSettings.onSettingsChanged((settings) => {
    currentSettings = settings;
  });
});
