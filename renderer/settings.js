const idleEnabled = document.getElementById('idle-enabled');
const idleThreshold = document.getElementById('idle-threshold');
const appEnabled = document.getElementById('app-enabled');
const appDelay = document.getElementById('app-delay');
const flaggedList = document.getElementById('flagged-list');
const flaggedCount = document.getElementById('flagged-count');
const runningAppsSelect = document.getElementById('running-apps-select');
const addFromRunningBtn = document.getElementById('add-from-running');
const manualName = document.getElementById('manual-name');
const manualBundle = document.getElementById('manual-bundle');
const addManualBtn = document.getElementById('add-manual');
const saveBtn = document.getElementById('save');
const savedIndicator = document.getElementById('saved-indicator');

let flaggedApps = [];
let runningApps = [];

function renderFlagged() {
  flaggedList.innerHTML = '';
  flaggedApps.forEach((app, index) => {
    const li = document.createElement('li');

    const label = document.createElement('div');
    label.className = 'app-label';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'app-name';
    nameSpan.textContent = app.name || '(no name)';

    const bundleSpan = document.createElement('span');
    bundleSpan.className = 'app-bundle';
    bundleSpan.textContent = app.bundleId || '';

    label.appendChild(nameSpan);
    if (app.bundleId) {
      label.appendChild(bundleSpan);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      flaggedApps.splice(index, 1);
      renderFlagged();
    });

    li.appendChild(label);
    li.appendChild(removeBtn);
    flaggedList.appendChild(li);
  });
  flaggedCount.textContent = String(flaggedApps.length);
}

function populateConfig(config) {
  const idle = config.idle || {};
  const appDetection = config.appDetection || {};

  idleEnabled.checked = Boolean(idle.enabled);
  idleThreshold.value = idle.thresholdSec != null ? idle.thresholdSec : 300;
  appEnabled.checked = Boolean(appDetection.enabled);
  appDelay.value = appDetection.delaySec != null ? appDetection.delaySec : 10;
  flaggedApps = Array.isArray(appDetection.flaggedApps)
    ? appDetection.flaggedApps.map((a) => ({ name: a.name, bundleId: a.bundleId }))
    : [];
  renderFlagged();
}

function populateRunningApps(apps) {
  runningApps = Array.isArray(apps) ? apps : [];
  runningAppsSelect.innerHTML = '<option value="">Add from running apps…</option>';
  runningApps.forEach((app, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = app.name || app.bundleId || '(unknown)';
    runningAppsSelect.appendChild(option);
  });
}

function addFlaggedApp(app) {
  if (!app || (!app.name && !app.bundleId)) {
    return;
  }
  const exists = flaggedApps.some(
    (a) =>
      (a.name && app.name && a.name.toLowerCase() === app.name.toLowerCase()) ||
      (a.bundleId && app.bundleId && a.bundleId === app.bundleId)
  );
  if (exists) {
    return;
  }
  flaggedApps.push({ name: app.name, bundleId: app.bundleId });
  renderFlagged();
}

addFromRunningBtn.addEventListener('click', () => {
  const selected = runningAppsSelect.value;
  if (selected === '') {
    return;
  }
  const app = runningApps[Number(selected)];
  if (app) {
    addFlaggedApp({ name: app.name, bundleId: app.bundleId });
    runningAppsSelect.value = '';
  }
});

addManualBtn.addEventListener('click', () => {
  const name = manualName.value.trim();
  const bundleId = manualBundle.value.trim();
  if (!name && !bundleId) {
    return;
  }
  addFlaggedApp({ name: name || null, bundleId: bundleId || null });
  manualName.value = '';
  manualBundle.value = '';
});

saveBtn.addEventListener('click', async () => {
  const config = {
    idle: {
      enabled: idleEnabled.checked,
      thresholdSec: Number(idleThreshold.value) || 300,
    },
    appDetection: {
      enabled: appEnabled.checked,
      delaySec: Number(appDelay.value) || 10,
      flaggedApps: flaggedApps.map((a) => ({
        name: a.name || undefined,
        bundleId: a.bundleId || undefined,
      })),
    },
  };
  await window.sirenGuardSettings.setTriggerConfig(config);
  savedIndicator.hidden = false;
  setTimeout(() => {
    savedIndicator.hidden = true;
  }, 1500);
});

(async () => {
  const [config, runningApps] = await Promise.all([
    window.sirenGuardSettings.getTriggerConfig(),
    window.sirenGuardSettings.getRunningApps(),
  ]);
  populateConfig(config);
  populateRunningApps(runningApps);
})();
