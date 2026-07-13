const lockOrchestration = require('./lock-orchestration');
const { getWebsiteDetectionTrigger, isTriggersSuspended, RE_ENTRY_BLOCK_SEC } = require('./store');
const {
  createReEntryBlockRegistry,
  hostnameKey,
} = require('./re-entry-block');

const blockRegistry = createReEntryBlockRegistry(RE_ENTRY_BLOCK_SEC);

function registerSiteBlock(hostname) {
  const key = hostnameKey(hostname);
  if (key) {
    blockRegistry.add(key);
  }
}

function isSiteBlocked(hostname, now = Date.now()) {
  const key = hostnameKey(hostname);
  return key ? blockRegistry.isBlocked(key, now) : false;
}

let weArmed = false;
let matchedSinceMs = null;
let matchedHostname = null;
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
  matchedHostname = null;
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
      lockOrchestration.arm({
        triggerKind: 'website',
        context: { hostname: matchedHostname },
      });
      weArmed = true;
    }
  }, delaySec * 1000);
}

function onSiteMatch(hostname, _url) {
  const config = getWebsiteDetectionTrigger();
  if (!config || !config.enabled || isTriggersSuspended()) {
    resetMatchState();
    cancelArmedState();
    return;
  }

  if (isSiteBlocked(hostname)) {
    resetMatchState();
    if (!weArmed && !lockOrchestration.isArmed()) {
      lockOrchestration.arm({
        suppressCancel: true,
        triggerKind: 'website',
        context: { hostname },
      });
      weArmed = true;
    }
    return;
  }

  const delaySec = Number(config.delaySec);
  if (!Number.isFinite(delaySec) || delaySec <= 0) {
    return;
  }

  if (matchedSinceMs === null) {
    matchedHostname = hostname;
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
  registerSiteBlock,
  isSiteBlocked,
};
