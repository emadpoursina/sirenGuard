const { exec } = require('child_process');
const {
  getCancelWindowSeconds,
  getReminder,
  getReminderMediaDir,
  ESCALATION_WINDOW_SEC,
  MIN_WATCH_SEC,
} = require('./store');
const reminderOverlay = require('./reminder-overlay');
const { executeAppConsequence } = require('./app-consequence-action');
const { executeWebsiteConsequence } = require('./website-consequence-action');
const { executeIdleConsequence } = require('./idle-consequence-action');

const DEFAULT_CANCEL_WINDOW_MS = 2000;
const ARMED_EVENT = 'armed-state';
const LOCK_COMMAND = 'open -a ScreenSaverEngine';

let target = null;
let timer = null;
let phase = 'idle';
let currentTriggerKind = 'manual';
let currentContext = null;
let escalated = false;
let cancelSuppressed = false;
let runToken = 0;
const fallTimestamps = {};

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

function getCancelWindowMs() {
  const seconds = Number(getCancelWindowSeconds());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_CANCEL_WINDOW_MS;
  }
  return seconds * 1000;
}

function checkEscalation(triggerKind) {
  const last = fallTimestamps[triggerKind];
  if (!last) {
    return false;
  }
  return Date.now() - last < ESCALATION_WINDOW_SEC * 1000;
}

function recordFall(triggerKind) {
  fallTimestamps[triggerKind] = Date.now();
}

function buildReminderPayload() {
  const reminder = getReminder();
  return {
    mediaType: reminder.mediaType,
    mediaPath: reminder.mediaPath,
    caption: reminder.caption || '',
    minWatchSec: reminder.minWatchSec || MIN_WATCH_SEC,
    mediaDir: getReminderMediaDir(),
  };
}

async function runConsequence(triggerKind, context) {
  if (triggerKind === 'app') {
    await executeAppConsequence(context?.app);
    return;
  }
  if (triggerKind === 'website') {
    await executeWebsiteConsequence(context?.hostname);
    return;
  }
  if (triggerKind === 'idle') {
    await executeIdleConsequence();
    return;
  }
  if (triggerKind === 'manual') {
    lockScreen();
  }
}

function finishFlow() {
  clearTimer();
  phase = 'idle';
  currentContext = null;
  currentTriggerKind = 'manual';
  escalated = false;
  cancelSuppressed = false;
  emitArmed(false);
}

async function startAutomaticPipeline(token) {
  if (token !== runToken || phase !== 'cancel-window') {
    return;
  }

  phase = 'reminder';
  try {
    await reminderOverlay.show(buildReminderPayload());
  } catch (err) {
    console.error('siren-guard: reminder overlay failed', err.message);
  }

  if (token !== runToken || phase !== 'reminder') {
    return;
  }

  phase = 'action';
  try {
    await runConsequence(currentTriggerKind, currentContext);
  } catch (err) {
    console.error('siren-guard: consequence action failed', err.message);
  }

  if (token !== runToken) {
    return;
  }

  finishFlow();
}

function arm(options = {}) {
  const triggerKind = options.triggerKind || 'manual';
  const suppressCancel = Boolean(options.suppressCancel);
  const context = options.context || null;
  const token = ++runToken;

  clearTimer();
  phase = 'cancel-window';
  currentTriggerKind = triggerKind;
  currentContext = context;
  cancelSuppressed = suppressCancel;
  escalated = triggerKind !== 'manual' ? checkEscalation(triggerKind) : false;

  if (triggerKind !== 'manual') {
    recordFall(triggerKind);
  }

  emitArmed(true);

  if (triggerKind === 'manual') {
    timer = setTimeout(() => {
      if (token !== runToken) {
        return;
      }
      timer = null;
      emitArmed(false);
      phase = 'idle';
      lockScreen();
    }, getCancelWindowMs());
    return;
  }

  const skipCancelWindow = suppressCancel || escalated;
  if (skipCancelWindow) {
    cancelSuppressed = true;
    startAutomaticPipeline(token);
    return;
  }

  timer = setTimeout(() => {
    if (token !== runToken) {
      return;
    }
    timer = null;
    startAutomaticPipeline(token);
  }, getCancelWindowMs());
}

function cancel() {
  if (
    cancelSuppressed ||
    escalated ||
    phase === 'reminder' ||
    phase === 'action'
  ) {
    return;
  }
  if (phase !== 'cancel-window') {
    return;
  }
  runToken += 1;
  finishFlow();
}

function isArmed() {
  return phase !== 'idle';
}

function attach(webContents) {
  target = webContents;
}

function resetEscalationForTests() {
  Object.keys(fallTimestamps).forEach((key) => {
    delete fallTimestamps[key];
  });
}

module.exports = {
  attach,
  arm,
  cancel,
  isArmed,
  lockScreen,
  resetEscalationForTests,
};
