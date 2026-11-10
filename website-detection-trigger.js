const lockOrchestration = require('./lock-orchestration');
const { getWebsiteDetectionTrigger, isTriggersSuspended, RE_ENTRY_BLOCK_SEC } = require('./store');
const {
  createReEntryBlockRegistry,
  hostnameKey,
} = require('./re-entry-block');
const {
  hostnameMatches,
  normalizeWebsiteTarget,
  urlMatchesTarget,
} = require('./siren-guard-extension/hostname-match');

const blockRegistry = createReEntryBlockRegistry(RE_ENTRY_BLOCK_SEC);

function registerSiteBlock(site) {
  const key = normalizeWebsiteTarget(site) || hostnameKey(site);
  if (key) {
    blockRegistry.add(key);
  }
}

function findBlockedTarget(url, hostname, now = Date.now()) {
  return blockRegistry.find((key) => {
    if (url) {
      return urlMatchesTarget(url, key);
    }
    return hostnameMatches(hostname, key);
  }, now);
}

function isSiteBlocked(url, hostname, now = Date.now()) {
  if (typeof hostname === 'number') {
    now = hostname;
    hostname = undefined;
  }
  return findBlockedTarget(url, hostname, now) !== null;
}

let weArmed = false;
let matchedSinceMs = null;
let matchedHostname = null;
let matchedTarget = null;
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
  matchedTarget = null;
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
        context: {
          hostname: matchedHostname,
          target: matchedTarget,
        },
      });
      weArmed = true;
    }
  }, delaySec * 1000);
}

function onSiteMatch(hostname, url, target) {
  const config = getWebsiteDetectionTrigger();
  if (!config || !config.enabled || isTriggersSuspended()) {
    resetMatchState();
    cancelArmedState();
    return;
  }

  const blockedTarget = findBlockedTarget(url, hostname);
  if (blockedTarget) {
    resetMatchState();
    if (!weArmed && !lockOrchestration.isArmed()) {
      lockOrchestration.arm({
        suppressCancel: true,
        triggerKind: 'website',
        context: { hostname, target: blockedTarget },
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
    matchedTarget = target;
    matchedSinceMs = Date.now();
    scheduleArm(delaySec);
    return;
  }

  matchedHostname = hostname;
  matchedTarget = target;
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
