const { exec } = require('child_process');
const lockOrchestration = require('./lock-orchestration');
const { getAppDetectionTrigger } = require('./store');

const POLL_INTERVAL_MS = 5000;
const NAME_QUERY =
  'tell application "System Events" to get name of first process whose frontmost is true';
const BUNDLE_ID_QUERY =
  'tell application "System Events" to get bundle identifier of first process whose frontmost is true';

let interval = null;
let weArmed = false;
let flaggedSinceMs = null;

function runAppleScript(script) {
  return new Promise((resolve) => {
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(stdout.trim() || null);
    });
  });
}

async function getFrontmost() {
  const [name, bundleId] = await Promise.all([
    runAppleScript(NAME_QUERY),
    runAppleScript(BUNDLE_ID_QUERY),
  ]);
  return { name, bundleId };
}

function isFlagged(frontmost, flaggedApps) {
  if (!Array.isArray(flaggedApps) || flaggedApps.length === 0) {
    return false;
  }

  const frontName = frontmost.name ? frontmost.name.toLowerCase() : null;
  const frontBundleId = frontmost.bundleId || null;

  return flaggedApps.some((app) => {
    if (app && app.name && frontName === app.name.toLowerCase()) {
      return true;
    }
    if (app && app.bundleId && frontBundleId === app.bundleId) {
      return true;
    }
    return false;
  });
}

async function tick() {
  const config = getAppDetectionTrigger();
  if (!config || !config.enabled) {
    if (weArmed) {
      lockOrchestration.cancel();
      weArmed = false;
    }
    flaggedSinceMs = null;
    return;
  }

  const delaySec = Number(config.delaySec);
  if (!Number.isFinite(delaySec) || delaySec <= 0) {
    return;
  }

  const frontmost = await getFrontmost();
  if (!frontmost.name && !frontmost.bundleId) {
    return;
  }

  if (isFlagged(frontmost, config.flaggedApps)) {
    if (flaggedSinceMs === null) {
      flaggedSinceMs = Date.now();
    }

    if (
      Date.now() - flaggedSinceMs >= delaySec * 1000 &&
      !weArmed &&
      !lockOrchestration.isArmed()
    ) {
      lockOrchestration.arm();
      weArmed = true;
    }
  } else {
    flaggedSinceMs = null;
    if (weArmed) {
      lockOrchestration.cancel();
      weArmed = false;
    }
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
  flaggedSinceMs = null;
}

module.exports = {
  start,
  stop,
};
