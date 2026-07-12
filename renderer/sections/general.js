function initGeneralSection() {
  const body = document.querySelector('#section-general .section-body');
  if (!body) return;

  body.innerHTML = `
    <div class="toggle-row">
      <label class="switch">
        <input id="launch-at-login" type="checkbox" />
        <span class="switch-track"></span>
      </label>
      <div class="toggle-meta">
        <span class="toggle-label">Launch at login</span>
        <span class="muted">Start Siren Guard when you log in</span>
      </div>
    </div>
    <div class="toggle-row">
      <label class="switch">
        <input id="start-minimized" type="checkbox" />
        <span class="switch-track"></span>
      </label>
      <div class="toggle-meta">
        <span class="toggle-label">Start minimized to tray</span>
        <span class="muted">Hide the floating button until you click the tray icon</span>
      </div>
    </div>
  `;

  const launchToggle = document.getElementById('launch-at-login');
  const startMinimizedToggle = document.getElementById('start-minimized');

  async function syncFromSettings(settings) {
    const meta = await window.sirenGuardSettings.getMeta();
    launchToggle.disabled = !meta.isPackaged;
    launchToggle.checked = Boolean(settings.launchAtLogin);
    startMinimizedToggle.checked = Boolean(settings.startMinimized);
  }

  launchToggle.addEventListener('change', async () => {
    const result = await window.sirenGuardSettings.setLaunchAtLogin(
      launchToggle.checked
    );
    if (!result.applied) {
      const settings = window.dashboard.getSettings();
      launchToggle.checked = Boolean(settings?.launchAtLogin);
      return;
    }
    const settings = window.dashboard.getSettings();
    if (settings) {
      settings.launchAtLogin = result.launchAtLogin;
    }
  });

  startMinimizedToggle.addEventListener('change', async () => {
    await window.dashboard.updateSettings({
      startMinimized: startMinimizedToggle.checked,
    });
  });

  window.dashboard.registerSection('general', syncFromSettings);
  syncFromSettings(window.dashboard.getSettings());
}
