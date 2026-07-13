const countdownEl = document.getElementById('countdown');
const phraseInput = document.getElementById('phrase-input');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const errorEl = document.getElementById('error');
const subtitleEl = document.getElementById('subtitle');

let remaining = 30;
let phraseRequired = true;
let timer = null;

function updateConfirmEnabled() {
  confirmBtn.disabled =
    remaining > 0 || !phraseRequired || phraseInput.value.length === 0;
}

window.frictionGate.onInit((payload) => {
  remaining = payload.countdownSec || 30;
  phraseRequired = payload.phraseRequired !== false;
  countdownEl.textContent = String(remaining);

  if (!phraseRequired) {
    subtitleEl.textContent =
      'Set a confirmation phrase in Settings → Reminder before using friction gates.';
    phraseInput.disabled = true;
    confirmBtn.disabled = true;
    return;
  }

  timer = setInterval(() => {
    remaining -= 1;
    countdownEl.textContent = String(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearInterval(timer);
      timer = null;
      phraseInput.disabled = false;
      phraseInput.focus();
    }
    updateConfirmEnabled();
  }, 1000);
});

phraseInput.addEventListener('input', updateConfirmEnabled);

confirmBtn.addEventListener('click', async () => {
  errorEl.textContent = '';
  const result = await window.frictionGate.confirm(phraseInput.value);
  if (!result?.ok) {
    errorEl.textContent =
      result?.error === 'phrase mismatch'
        ? 'Phrase does not match.'
        : 'Could not confirm. Check your phrase in Settings.';
  }
});

cancelBtn.addEventListener('click', () => {
  window.frictionGate.cancel();
});
