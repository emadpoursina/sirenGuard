function initTriggersSection() {
  const body = document.querySelector('#section-triggers .section-body');
  if (!body) return;

  body.innerHTML = `
    <div class="trigger-row readonly">
      <div class="trigger-head">
        <span class="status-pill on">On</span>
        <div class="trigger-meta">
          <span class="trigger-name">Manual Click → Lock</span>
          <span class="muted">Click the floating button to arm and lock</span>
        </div>
      </div>
    </div>

    <div class="trigger-row" id="idle-trigger-row">
      <div class="trigger-head">
        <label class="switch">
          <input id="idle-enabled" type="checkbox" />
          <span class="switch-track"></span>
        </label>
        <div class="trigger-meta">
          <span class="trigger-name">Idle-timer trigger</span>
          <span class="muted">Lock after the machine has been idle</span>
        </div>
      </div>
      <div class="field">
        <label for="idle-threshold">Idle threshold (seconds)</label>
        <input id="idle-threshold" type="number" min="1" step="1" value="300" />
      </div>
    </div>

    <div class="trigger-row" id="app-trigger-row">
      <div class="trigger-head">
        <label class="switch">
          <input id="app-enabled" type="checkbox" />
          <span class="switch-track"></span>
        </label>
        <div class="trigger-meta">
          <span class="trigger-name">App-detection trigger</span>
          <span class="muted">Lock when a flagged app stays frontmost</span>
        </div>
      </div>
      <div class="field">
        <label for="app-delay">Delay (seconds)</label>
        <input id="app-delay" type="number" min="1" step="1" value="10" />
      </div>
      <div class="flagged">
        <div class="flagged-head">
          <span class="field-label">Flagged apps</span>
          <span id="flagged-count" class="muted">0</span>
        </div>
        <ul id="flagged-list" class="flagged-list"></ul>
        <div class="add-row">
          <select id="running-apps-select"><option value="">Add from running apps…</option></select>
          <button id="add-from-running" type="button">Add</button>
        </div>
        <div class="add-row">
          <input id="manual-name" type="text" placeholder="App name" />
          <input id="manual-bundle" type="text" placeholder="Bundle ID" />
          <button id="add-manual" type="button">Add</button>
        </div>
      </div>
    </div>

    <div class="trigger-row" id="website-trigger-row">
      <div class="trigger-head">
        <label class="switch">
          <input id="website-enabled" type="checkbox" />
          <span class="switch-track"></span>
        </label>
        <div class="trigger-meta">
          <span class="trigger-name">Website-detection trigger</span>
          <span class="muted">Lock when a flagged website stays active in the browser</span>
        </div>
      </div>
      <div class="field">
        <label for="website-delay">Delay (seconds)</label>
        <input id="website-delay" type="number" min="1" step="1" value="10" />
      </div>
      <div class="flagged">
        <div class="flagged-head">
          <span class="field-label">Flagged websites</span>
          <span id="website-targets-count" class="muted">0</span>
        </div>
        <ul id="website-targets-list" class="flagged-list"></ul>
        <div class="add-row">
          <input id="website-domain-input" type="text" placeholder="e.g. *.youtube.com" />
          <button id="website-add-domain" type="button">Add</button>
        </div>
        <p class="muted extension-hint">
          Install the Siren Guard browser extension via
          <code>chrome://extensions</code> (Developer mode → Load unpacked →
          <code>siren-guard-extension/</code>).
        </p>
      </div>
    </div>

    <button id="add-trigger" type="button" class="disabled-action" disabled>Add trigger — coming soon</button>
  `;

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
  const websiteEnabled = document.getElementById('website-enabled');
  const websiteDelay = document.getElementById('website-delay');
  const websiteTargetsList = document.getElementById('website-targets-list');
  const websiteTargetsCount = document.getElementById('website-targets-count');
  const websiteDomainInput = document.getElementById('website-domain-input');
  const websiteAddDomainBtn = document.getElementById('website-add-domain');

  let flaggedApps = [];
  let websiteTargets = [];
  let runningApps = [];
  let syncing = false;

  function getTriggerEntry(triggers, id) {
    if (!Array.isArray(triggers)) return {};
    return triggers.find((t) => t.id === id) || {};
  }

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
      removeBtn.addEventListener('click', async () => {
        flaggedApps.splice(index, 1);
        renderFlagged();
        await persistTriggers();
      });

      li.appendChild(label);
      li.appendChild(removeBtn);
      flaggedList.appendChild(li);
    });
    flaggedCount.textContent = String(flaggedApps.length);
  }

  function renderWebsiteTargets() {
    websiteTargetsList.innerHTML = '';
    websiteTargets.forEach((target, index) => {
      const li = document.createElement('li');

      const label = document.createElement('div');
      label.className = 'app-label';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'app-name';
      nameSpan.textContent = target;

      label.appendChild(nameSpan);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', async () => {
        websiteTargets.splice(index, 1);
        renderWebsiteTargets();
        await persistTriggers();
      });

      li.appendChild(label);
      li.appendChild(removeBtn);
      websiteTargetsList.appendChild(li);
    });
    websiteTargetsCount.textContent = String(websiteTargets.length);
  }

  function isValidWebsiteTarget(value) {
    if (!value || /\s/.test(value)) {
      return false;
    }
    const pattern = value.startsWith('*.') ? value.slice(2) : value;
    return pattern.length > 0 && /^[a-z0-9.*-]+$/i.test(value);
  }

  async function persistTriggers() {
    const settings = window.dashboard.getSettings();
    const triggers = Array.isArray(settings?.triggers) ? [...settings.triggers] : [];
    const next = triggers.map((entry) => {
      if (entry.id === 'idle') {
        return {
          ...entry,
          enabled: idleEnabled.checked,
          thresholdSec: Number(idleThreshold.value) || 300,
        };
      }
      if (entry.id === 'app-detection') {
        return {
          ...entry,
          enabled: appEnabled.checked,
          delaySec: Number(appDelay.value) || 10,
          flaggedApps: flaggedApps.map((a) => ({
            name: a.name || undefined,
            bundleId: a.bundleId || undefined,
          })),
        };
      }
      if (entry.id === 'website-detection') {
        return {
          ...entry,
          enabled: websiteEnabled.checked,
          delaySec: Number(websiteDelay.value) || 10,
          targets: [...websiteTargets],
        };
      }
      return entry;
    });
    await window.dashboard.updateSettings({ triggers: next });
  }

  function syncFromSettings(settings) {
    syncing = true;
    const idle = getTriggerEntry(settings.triggers, 'idle');
    const appDetection = getTriggerEntry(settings.triggers, 'app-detection');
    const websiteDetection = getTriggerEntry(settings.triggers, 'website-detection');

    idleEnabled.checked = Boolean(idle.enabled);
    idleThreshold.value = idle.thresholdSec != null ? idle.thresholdSec : 300;
    appEnabled.checked = Boolean(appDetection.enabled);
    appDelay.value = appDetection.delaySec != null ? appDetection.delaySec : 10;
    flaggedApps = Array.isArray(appDetection.flaggedApps)
      ? appDetection.flaggedApps.map((a) => ({
          name: a.name,
          bundleId: a.bundleId,
        }))
      : [];
    renderFlagged();
    websiteEnabled.checked = Boolean(websiteDetection.enabled);
    websiteDelay.value =
      websiteDetection.delaySec != null ? websiteDetection.delaySec : 10;
    websiteTargets = Array.isArray(websiteDetection.targets)
      ? websiteDetection.targets.map((t) => String(t))
      : [];
    renderWebsiteTargets();
    syncing = false;
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

  idleEnabled.addEventListener('change', () => {
    if (!syncing) persistTriggers();
  });
  idleThreshold.addEventListener('change', () => {
    if (!syncing) persistTriggers();
  });
  appEnabled.addEventListener('change', () => {
    if (!syncing) persistTriggers();
  });
  appDelay.addEventListener('change', () => {
    if (!syncing) persistTriggers();
  });
  websiteEnabled.addEventListener('change', () => {
    if (!syncing) persistTriggers();
  });
  websiteDelay.addEventListener('change', () => {
    if (!syncing) persistTriggers();
  });

  addFromRunningBtn.addEventListener('click', async () => {
    const selected = runningAppsSelect.value;
    if (selected === '') return;
    const app = runningApps[Number(selected)];
    if (app) {
      addFlaggedApp({ name: app.name, bundleId: app.bundleId });
      runningAppsSelect.value = '';
      await persistTriggers();
    }
  });

  addManualBtn.addEventListener('click', async () => {
    const name = manualName.value.trim();
    const bundleId = manualBundle.value.trim();
    if (!name && !bundleId) return;
    addFlaggedApp({ name: name || null, bundleId: bundleId || null });
    manualName.value = '';
    manualBundle.value = '';
    await persistTriggers();
  });

  websiteAddDomainBtn.addEventListener('click', async () => {
    const raw = websiteDomainInput.value.trim().toLowerCase();
    if (!isValidWebsiteTarget(raw)) {
      return;
    }
    const exists = websiteTargets.some((t) => t.toLowerCase() === raw);
    if (exists) {
      return;
    }
    websiteTargets.push(raw);
    websiteDomainInput.value = '';
    renderWebsiteTargets();
    await persistTriggers();
  });

  window.dashboard.registerSection('triggers', syncFromSettings);
  syncFromSettings(window.dashboard.getSettings());

  window.sirenGuardSettings.getRunningApps().then(populateRunningApps);
}
