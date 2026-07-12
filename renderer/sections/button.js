const COLOR_PRESETS = [
  { label: 'Red', value: '#D9534F' },
  { label: 'Amber', value: '#F0AD4E' },
  { label: 'Orange', value: '#E67E22' },
  { label: 'Blue', value: '#5BC0DE' },
];

function initButtonSection() {
  const body = document.querySelector('#section-trigger-button .section-body');
  if (!body) return;

  const swatchesHtml = COLOR_PRESETS.map(
    (preset) =>
      `<button type="button" class="color-swatch" data-color="${preset.value}" title="${preset.label}" aria-label="${preset.label}"></button>`
  ).join('');

  body.innerHTML = `
    <div class="field">
      <label for="cancel-window">Cancel window (seconds)</label>
      <input id="cancel-window" type="range" min="1" max="10" step="1" />
      <span id="cancel-window-value" class="range-value">2s</span>
    </div>
    <div class="field">
      <label for="button-opacity">Button opacity (idle)</label>
      <input id="button-opacity" type="range" min="10" max="100" step="5" />
      <span id="button-opacity-value" class="range-value">40%</span>
    </div>
    <div class="field">
      <span class="field-label">Button color</span>
      <div id="color-swatches" class="color-swatches">${swatchesHtml}</div>
    </div>
    <button id="reset-button-position" type="button">Reset button position</button>
  `;

  const cancelWindow = document.getElementById('cancel-window');
  const cancelWindowValue = document.getElementById('cancel-window-value');
  const buttonOpacity = document.getElementById('button-opacity');
  const buttonOpacityValue = document.getElementById('button-opacity-value');
  const colorSwatches = document.getElementById('color-swatches');
  const resetPositionBtn = document.getElementById('reset-button-position');

  function updateSwatchSelection(color) {
    colorSwatches.querySelectorAll('.color-swatch').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.color === color);
      btn.style.backgroundColor = btn.dataset.color;
    });
  }

  function syncFromSettings(settings) {
    const cancelSec = settings.cancelWindowSeconds != null ? settings.cancelWindowSeconds : 2;
    cancelWindow.value = String(cancelSec);
    cancelWindowValue.textContent = `${cancelSec}s`;

    const opacity = settings.buttonOpacity != null ? settings.buttonOpacity : 0.4;
    buttonOpacity.value = String(Math.round(opacity * 100));
    buttonOpacityValue.textContent = `${Math.round(opacity * 100)}%`;

    updateSwatchSelection(settings.buttonColor || '#D9534F');
  }

  cancelWindow.addEventListener('input', async () => {
    const seconds = Number(cancelWindow.value) || 2;
    cancelWindowValue.textContent = `${seconds}s`;
    await window.dashboard.updateSettings({ cancelWindowSeconds: seconds });
  });

  buttonOpacity.addEventListener('input', async () => {
    const opacity = Number(buttonOpacity.value) / 100;
    buttonOpacityValue.textContent = `${buttonOpacity.value}%`;
    await window.dashboard.updateSettings({ buttonOpacity: opacity });
  });

  colorSwatches.addEventListener('click', async (event) => {
    const swatch = event.target.closest('.color-swatch');
    if (!swatch) return;
    const color = swatch.dataset.color;
    updateSwatchSelection(color);
    await window.dashboard.updateSettings({ buttonColor: color });
  });

  resetPositionBtn.addEventListener('click', async () => {
    await window.sirenGuardSettings.resetButtonPosition();
  });

  window.dashboard.registerSection('button', syncFromSettings);
  syncFromSettings(window.dashboard.getSettings());
}
