const countdownEl = document.getElementById('countdown');
const phraseInput = document.getElementById('phrase-input');
const phraseTargetEl = document.getElementById('phrase-target');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const errorEl = document.getElementById('error');
const subtitleEl = document.getElementById('subtitle');

let remaining = 30;
let phraseRequired = true;
let expectedPhrase = '';
let timer = null;

function updateConfirmEnabled() {
  confirmBtn.disabled =
    remaining > 0 ||
    !phraseRequired ||
    phraseInput.value.length === 0 ||
    phraseInput.value !== expectedPhrase;
}

window.frictionGate.onInit((payload) => {
  remaining = payload.countdownSec || 30;
  phraseRequired = payload.phraseRequired !== false;
  expectedPhrase = payload.confirmationPhrase || '';
  countdownEl.textContent = String(remaining);

  if (!phraseRequired) {
    subtitleEl.textContent =
      'Set a confirmation phrase in Settings → Reminder before using friction gates.';
    phraseTargetEl.hidden = true;
    phraseInput.disabled = true;
    confirmBtn.disabled = true;
    return;
  }

  phraseTargetEl.textContent = expectedPhrase;
  phraseTargetEl.hidden = false;
  subtitleEl.textContent = 'Wait for the countdown, then type exactly:';

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
  if (phraseInput.value !== expectedPhrase) {
    errorEl.textContent = 'Type the phrase exactly as shown above.';
    return;
  }
  const result = await window.frictionGate.confirm(phraseInput.value);
  if (!result?.ok) {
    errorEl.textContent =
      result?.error === 'phrase mismatch'
        ? 'Type the phrase exactly as shown above.'
        : 'Could not confirm. Check your phrase in Settings.';
  }
});

cancelBtn.addEventListener('click', () => {
  window.frictionGate.cancel();
});
