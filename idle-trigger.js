const { exec } = require('child_process');
const lockOrchestration = require('./lock-orchestration');
const { getIdleTrigger, isTriggersSuspended } = require('./store');

const POLL_INTERVAL_MS = 5000;
const IDLE_QUERY = 'ioreg -c IOHIDSystem -r -d 4';

let interval = null;
let weArmed = false;

function getIdleSeconds() {
  return new Promise((resolve) => {
    exec(IDLE_QUERY, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }

      const match = stdout.match(/"HIDIdleTime"\s*=\s*(\d+)/i);
      if (!match) {
        resolve(null);
        return;
      }

      const nanoseconds = Number(match[1]);
      resolve(nanoseconds / 1e9);
    });
  });
}

async function tick() {
  const config = getIdleTrigger();
  if (!config || !config.enabled || isTriggersSuspended()) {
    if (weArmed) {
      lockOrchestration.cancel();
      weArmed = false;
    }
    return;
  }

  const thresholdSec = Number(config.thresholdSec);
  if (!Number.isFinite(thresholdSec) || thresholdSec <= 0) {
    return;
  }

  const idleSec = await getIdleSeconds();
  if (idleSec === null) {
    return;
  }

  if (idleSec >= thresholdSec) {
    if (!weArmed && !lockOrchestration.isArmed()) {
      lockOrchestration.arm({ triggerKind: 'idle' });
      weArmed = true;
    }
  } else if (weArmed) {
    lockOrchestration.cancel();
    weArmed = false;
  }
}

function start() {
  if (interval) {
    return;
  }
  interval = setInterval(tick, POLL_INTERVAL_MS);
}

function stop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  weArmed = false;
}

module.exports = {
  start,
  stop,
};
