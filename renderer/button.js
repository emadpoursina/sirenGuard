const CLICK_THRESHOLD_MS = 200;
const DRAG_THRESHOLD_PX = 5;

const dragRegion = document.getElementById('drag-region');
const lockButton = document.getElementById('lock-button');
const countdownRing = document.getElementById('countdown-ring');

let mouseDownAt = null;
let armed = false;
let dragStart = null;
let dragging = false;
let rafPending = false;
let pendingPosition = null;

function applyButtonStyles(settings) {
  if (!settings) return;
  const opacity = settings.buttonOpacity != null ? settings.buttonOpacity : 0.4;
  const color = settings.buttonColor || '#D9534F';
  dragRegion.style.setProperty('--button-opacity', String(opacity));
  dragRegion.style.setProperty('--button-color', color);
}

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

lockButton.addEventListener('mousedown', (event) => {
  mouseDownAt = Date.now();
  dragging = false;
  dragStart = {
    screenX: event.screenX,
    screenY: event.screenY,
    windowX: null,
    windowY: null,
  };
  window.sirenGuard.getPosition().then((pos) => {
    if (dragStart) {
      dragStart.windowX = pos.x;
      dragStart.windowY = pos.y;
    }
  });
});

window.addEventListener('mousemove', (event) => {
  if (!dragStart || mouseDownAt === null) {
    return;
  }

  const dx = event.screenX - dragStart.screenX;
  const dy = event.screenY - dragStart.screenY;

  if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
    return;
  }

  if (dragStart.windowX == null || dragStart.windowY == null) {
    return;
  }

  dragging = true;
  pendingPosition = {
    x: dragStart.windowX + dx,
    y: dragStart.windowY + dy,
  };

  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (pendingPosition) {
        window.sirenGuard.setPosition(pendingPosition);
      }
    });
  }
});

function handleMouseUp() {
  if (mouseDownAt === null) {
    return;
  }

  if (dragging) {
    if (pendingPosition) {
      window.sirenGuard.savePosition(pendingPosition);
    }
    mouseDownAt = null;
    dragStart = null;
    dragging = false;
    pendingPosition = null;
    return;
  }

  const pressDuration = Date.now() - mouseDownAt;
  mouseDownAt = null;
  dragStart = null;

  if (pressDuration > CLICK_THRESHOLD_MS) {
    return;
  }

  if (armed) {
    window.sirenGuard.cancel();
    return;
  }

  window.sirenGuard.arm();
}

lockButton.addEventListener('mouseup', handleMouseUp);
window.addEventListener('mouseup', handleMouseUp);

window.sirenGuard.onSettingsChanged(applyButtonStyles);
window.sirenGuard.getSettings().then(applyButtonStyles);
