const { exec } = require('child_process');

const CANCEL_WINDOW_MS = 2000;
const ARMED_EVENT = 'armed-state';

const LOCK_COMMAND = 'open -a ScreenSaverEngine';

let target = null;
let timer = null;

function emitArmed(armed) {
  if (target && !target.isDestroyed()) {
    target.send(ARMED_EVENT, { armed });
  }
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function lockScreen() {
  exec(LOCK_COMMAND, (err) => {
    if (err) {
      console.error('siren-guard: lock failed', err.message);
    }
  });
}

function arm() {
  clearTimer();
  emitArmed(true);

  timer = setTimeout(() => {
    timer = null;
    emitArmed(false);
    lockScreen();
  }, CANCEL_WINDOW_MS);
}

function cancel() {
  clearTimer();
  emitArmed(false);
}

function isArmed() {
  return timer !== null;
}

function attach(webContents) {
  target = webContents;
}

module.exports = {
  attach,
  arm,
  cancel,
  isArmed,
};
