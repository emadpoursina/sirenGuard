const CLICK_THRESHOLD_MS = 200;

const lockButton = document.getElementById('lock-button');
const countdownRing = document.getElementById('countdown-ring');

let mouseDownAt = null;
let armed = false;

function setArmed(isArmed) {
  armed = isArmed;
  if (isArmed) {
    lockButton.classList.add('armed');
    countdownRing.hidden = false;
  } else {
    lockButton.classList.remove('armed');
    countdownRing.hidden = true;
  }
}

window.sirenGuard.onArmedState((payload) => {
  setArmed(Boolean(payload && payload.armed));
});

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

  if (armed) {
    window.sirenGuard.cancel();
    return;
  }

  window.sirenGuard.arm();
});
