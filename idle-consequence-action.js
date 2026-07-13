const { exec: defaultExec } = require('child_process');
const lockOrchestration = require('./lock-orchestration');
const { getSafeApp } = require('./store');

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildActivateScript(safeApp) {
  if (safeApp.name) {
    return `tell application "${escapeAppleScriptString(safeApp.name)}" to activate`;
  }
  if (safeApp.bundleId) {
    return `tell application id "${escapeAppleScriptString(safeApp.bundleId)}" to activate`;
  }
  return null;
}

function activateSafeApp(safeApp, execFn = defaultExec) {
  return new Promise((resolve) => {
    const script = buildActivateScript(safeApp);
    if (!script) {
      resolve(false);
      return;
    }

    execFn(`osascript -e '${script}'`, (err) => {
      if (err) {
        console.error('siren-guard: safe app activation failed', err.message);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function executeIdleConsequence(execFn = defaultExec) {
  const safeApp = getSafeApp();
  if (safeApp?.name || safeApp?.bundleId) {
    await activateSafeApp(safeApp, execFn);
  }
  lockOrchestration.lockScreen();
}

module.exports = {
  executeIdleConsequence,
  activateSafeApp,
};
