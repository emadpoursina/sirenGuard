const lockOrchestration = require('./lock-orchestration');
const { getWebsiteDetectionTrigger } = require('./store');

let weArmed = false;
let matchedSinceMs = null;
let armDelayTimer = null;

function clearArmDelayTimer() {
  if (armDelayTimer) {
    clearTimeout(armDelayTimer);
    armDelayTimer = null;
  }
}

function cancelArmedState() {
  if (weArmed) {
    lockOrchestration.cancel();
    weArmed = false;
  }
}

function resetMatchState() {
  matchedSinceMs = null;
  clearArmDelayTimer();
}

function scheduleArm(delaySec) {
  clearArmDelayTimer();
  armDelayTimer = setTimeout(() => {
    armDelayTimer = null;
    if (
      matchedSinceMs !== null &&
      !weArmed &&
      !lockOrchestration.isArmed()
    ) {
      lockOrchestration.arm();
      weArmed = true;
    }
  }, delaySec * 1000);
}

function onSiteMatch(_hostname, _url) {
  const config = getWebsiteDetectionTrigger();
  if (!config || !config.enabled) {
    resetMatchState();
    cancelArmedState();
    return;
  }

  const delaySec = Number(config.delaySec);
  if (!Number.isFinite(delaySec) || delaySec <= 0) {
    return;
  }

  if (matchedSinceMs === null) {
    matchedSinceMs = Date.now();
    scheduleArm(delaySec);
  }
}

function onSiteLeave() {
  resetMatchState();
  cancelArmedState();
}

function start() {
  // Event-driven; no background polling required.
}

function stop() {
  resetMatchState();
  cancelArmedState();
}

module.exports = {
  start,
  stop,
  onSiteMatch,
  onSiteLeave,
};
