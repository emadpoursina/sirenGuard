const CANCEL_WINDOW_MS = 2000;
const CLICK_THRESHOLD_MS = 200;

const lockButton = document.getElementById('lock-button');
const countdownRing = document.getElementById('countdown-ring');

let countdownTimer = null;
let mouseDownAt = null;

function clearCountdown() {
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }
  lockButton.classList.remove('armed');
  countdownRing.hidden = true;
}

function startCountdown() {
  clearCountdown();
  lockButton.classList.add('armed');
  countdownRing.hidden = false;

  countdownTimer = setTimeout(() => {
    countdownTimer = null;
    lockButton.classList.remove('armed');
    countdownRing.hidden = true;
    window.sirenGuard.lock();
  }, CANCEL_WINDOW_MS);
}

lockButton.addEventListener('mousedown', () => {
  mouseDownAt = Date.now();
});

lockButton.addEventListener('mouseup', () => {
  if (mouseDownAt === null) return;

  const pressDuration = Date.now() - mouseDownAt;
  mouseDownAt = null;

  if (pressDuration > CLICK_THRESHOLD_MS) {
    return;
  }

  if (countdownTimer) {
    clearCountdown();
    return;
  }

  startCountdown();
});
