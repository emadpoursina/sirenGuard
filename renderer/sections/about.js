function initAboutSection() {
  const body = document.querySelector('#section-about .section-body');
  if (!body) return;

  body.innerHTML = `
    <div class="about-row">
      <span class="field-label">Version</span>
      <span id="app-version" class="about-value">—</span>
    </div>
    <button id="reset-all-settings" type="button" class="danger">Reset all settings to default</button>
    <div class="about-row">
      <span class="field-label">Settings file</span>
      <button id="config-path" type="button" class="link-button">—</button>
    </div>
  `;

  const versionEl = document.getElementById('app-version');
  const resetBtn = document.getElementById('reset-all-settings');
  const configPathBtn = document.getElementById('config-path');

  async function loadMeta() {
    const meta = await window.sirenGuardSettings.getMeta();
    versionEl.textContent = meta.version || '—';
    configPathBtn.textContent = meta.configPath || '—';
  }

  resetBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Reset all settings to their defaults? This cannot be undone.'
    );
    if (!confirmed) return;
    await window.sirenGuardSettings.resetSettings();
  });

  configPathBtn.addEventListener('click', () => {
    window.sirenGuardSettings.revealConfig();
  });

  function syncFromSettings() {
    loadMeta();
  }

  window.dashboard.registerSection('about', syncFromSettings);
  loadMeta();
}
