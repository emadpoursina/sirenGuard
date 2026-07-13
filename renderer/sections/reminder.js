function initReminderSection() {
  const body = document.querySelector('#section-reminder .section-body');
  if (!body) return;

  body.innerHTML = `
    <div class="field">
      <label for="reminder-caption">Caption</label>
      <input id="reminder-caption" type="text" placeholder="Why are you breaking the loop?" />
    </div>

    <div class="field">
      <label for="reminder-media">Reminder media (image or short video)</label>
      <input id="reminder-media" type="file" accept="image/png,image/jpeg,video/mp4" />
      <p id="reminder-media-error" class="muted error-text" hidden></p>
      <div id="reminder-preview" class="reminder-preview" hidden></div>
    </div>

    <div class="field">
      <label>Safe app (idle redirect)</label>
      <div class="add-row">
        <select id="safe-app-select"><option value="">Pick running app…</option></select>
        <button id="safe-app-apply" type="button">Set</button>
      </div>
      <div class="add-row">
        <input id="safe-app-name" type="text" placeholder="App name" />
        <input id="safe-app-bundle" type="text" placeholder="Bundle ID" />
        <button id="safe-app-manual" type="button">Set manual</button>
      </div>
      <p id="safe-app-current" class="muted"></p>
    </div>

    <div class="field">
      <label for="confirmation-phrase">Confirmation phrase</label>
      <input id="confirmation-phrase" type="text" placeholder="Required for disable / quit / override" autocomplete="off" spellcheck="false" />
      <p class="muted">Friction gates show this phrase and require you to type it exactly.</p>
    </div>

    <div class="field">
      <span class="field-label">Override log</span>
      <ul id="override-log-list" class="flagged-list"></ul>
    </div>
  `;

  const captionInput = document.getElementById('reminder-caption');
  const mediaInput = document.getElementById('reminder-media');
  const mediaError = document.getElementById('reminder-media-error');
  const preview = document.getElementById('reminder-preview');
  const safeAppSelect = document.getElementById('safe-app-select');
  const safeAppApply = document.getElementById('safe-app-apply');
  const safeAppName = document.getElementById('safe-app-name');
  const safeAppBundle = document.getElementById('safe-app-bundle');
  const safeAppManual = document.getElementById('safe-app-manual');
  const safeAppCurrent = document.getElementById('safe-app-current');
  const phraseInput = document.getElementById('confirmation-phrase');
  const overrideLogList = document.getElementById('override-log-list');

  let syncing = false;
  let runningApps = [];

  function renderOverrideLog(log) {
    overrideLogList.innerHTML = '';
    const entries = Array.isArray(log) ? [...log].slice(-20).reverse() : [];
    entries.forEach((entry) => {
      const li = document.createElement('li');
      const when = entry.timestamp
        ? new Date(entry.timestamp).toLocaleString()
        : 'unknown';
      li.textContent = `${when} — ${entry.kind || 'unknown'}`;
      overrideLogList.appendChild(li);
    });
  }

  async function renderPreview(reminder) {
    preview.innerHTML = '';
    if (!reminder?.mediaPath) {
      preview.hidden = true;
      return;
    }
    const url = await window.sirenGuardSettings.getReminderPreview(
      reminder.mediaPath
    );
    if (!url) {
      preview.hidden = true;
      return;
    }
    preview.hidden = false;
    if (reminder.mediaType === 'video') {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.className = 'reminder-preview-media';
      preview.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Reminder preview';
      img.className = 'reminder-preview-media';
      preview.appendChild(img);
    }
  }

  function updateSafeAppLabel(safeApp) {
    if (!safeApp?.name && !safeApp?.bundleId) {
      safeAppCurrent.textContent = 'No safe app configured.';
      return;
    }
    safeAppCurrent.textContent = `Current: ${safeApp.name || '(no name)'} ${safeApp.bundleId || ''}`.trim();
  }

  function populateRunningApps(apps) {
    runningApps = Array.isArray(apps) ? apps : [];
    safeAppSelect.innerHTML = '<option value="">Pick running app…</option>';
    runningApps.forEach((app, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = app.name || app.bundleId || '(unknown)';
      safeAppSelect.appendChild(option);
    });
  }

  function syncFromSettings(settings) {
    syncing = true;
    const reminder = settings.reminder || {};
    captionInput.value = reminder.caption || '';
    phraseInput.value = settings.confirmationPhrase || '';
    updateSafeAppLabel(settings.safeApp || {});
    renderOverrideLog(settings.overrideLog);
    renderPreview(reminder);
    syncing = false;
  }

  captionInput.addEventListener('change', async () => {
    if (syncing) return;
    await window.dashboard.updateSettings({
      reminder: { caption: captionInput.value.trim() },
    });
  });

  phraseInput.addEventListener('change', async () => {
    if (syncing) return;
    await window.dashboard.updateSettings({
      confirmationPhrase: phraseInput.value,
    });
  });

  safeAppApply.addEventListener('click', async () => {
    const selected = safeAppSelect.value;
    if (selected === '') return;
    const app = runningApps[Number(selected)];
    if (!app) return;
    await window.dashboard.updateSettings({
      safeApp: { name: app.name, bundleId: app.bundleId },
    });
  });

  safeAppManual.addEventListener('click', async () => {
    const name = safeAppName.value.trim();
    const bundleId = safeAppBundle.value.trim();
    if (!name && !bundleId) return;
    await window.dashboard.updateSettings({
      safeApp: {
        name: name || null,
        bundleId: bundleId || null,
      },
    });
    safeAppName.value = '';
    safeAppBundle.value = '';
  });

  mediaInput.addEventListener('change', async () => {
    mediaError.hidden = true;
    const file = mediaInput.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const duration = await new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(video.duration);
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(null);
        video.src = URL.createObjectURL(file);
      });
      if (duration == null || duration > 30) {
        mediaError.textContent = 'Videos must be 30 seconds or shorter.';
        mediaError.hidden = false;
        mediaInput.value = '';
        return;
      }
      const buffer = await file.arrayBuffer();
      const result = await window.sirenGuardSettings.uploadReminderMedia({
        mimeType: file.type,
        data: Array.from(new Uint8Array(buffer)),
        durationSec: duration,
      });
      if (!result?.ok) {
        mediaError.textContent = result?.error || 'Upload failed.';
        mediaError.hidden = false;
      }
      mediaInput.value = '';
      return;
    }

    const buffer = await file.arrayBuffer();
    const result = await window.sirenGuardSettings.uploadReminderMedia({
      mimeType: file.type,
      data: Array.from(new Uint8Array(buffer)),
    });
    if (!result?.ok) {
      mediaError.textContent = result?.error || 'Upload failed.';
      mediaError.hidden = false;
    }
    mediaInput.value = '';
  });

  window.dashboard.registerSection('reminder', syncFromSettings);
  syncFromSettings(window.dashboard.getSettings());
  window.sirenGuardSettings.getRunningApps().then(populateRunningApps);
}
