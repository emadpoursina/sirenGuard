const { exec: defaultExec } = require('child_process');
const { RE_ENTRY_BLOCK_SEC } = require('./store');
const {
  createReEntryBlockRegistry,
  appIdentityKey,
} = require('./re-entry-block');

const QUIT_GRACE_MS = 1500;
const blockRegistry = createReEntryBlockRegistry(RE_ENTRY_BLOCK_SEC);

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runExec(execFn, command) {
  return new Promise((resolve) => {
    execFn(command, (err) => {
      resolve(!err);
    });
  });
}

function isProcessRunning(bundleId, execFn = defaultExec) {
  if (!bundleId) {
    return Promise.resolve(false);
  }
  const script = `tell application "System Events" to exists (processes where bundle identifier is "${escapeAppleScriptString(bundleId)}")`;
  return new Promise((resolve) => {
    execFn(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(String(stdout).trim().toLowerCase() === 'true');
    });
  });
}

async function quitApp(app, execFn = defaultExec) {
  if (!app?.name && !app?.bundleId) {
    return;
  }

  if (app.name) {
    const script = `tell application "${escapeAppleScriptString(app.name)}" to quit`;
    const ok = await runExec(execFn, `osascript -e '${script}'`);
    if (!ok) {
      console.error('siren-guard: app quit failed', app.name);
    }
  }

  await sleep(QUIT_GRACE_MS);

  if (app.bundleId) {
    const stillRunning = await isProcessRunning(app.bundleId, execFn);
    if (stillRunning) {
      const pidScript = `tell application "System Events" to unix id of first process whose bundle identifier is "${escapeAppleScriptString(app.bundleId)}"`;
      await new Promise((resolve) => {
        execFn(`osascript -e '${pidScript}'`, (err, stdout) => {
          const pid = Number.parseInt(String(stdout).trim(), 10);
          if (!err && Number.isFinite(pid) && pid > 0) {
            execFn(`kill -9 ${pid}`, (killErr) => {
              if (killErr) {
                console.error('siren-guard: app kill failed', app.bundleId);
              }
              resolve();
            });
            return;
          }
          console.error('siren-guard: app kill failed', app.bundleId);
          resolve();
        });
      });
    }
  }
}

function registerAppBlock(app) {
  const key = appIdentityKey(app);
  if (key) {
    blockRegistry.add(key);
  }
}

function isAppBlocked(app, now = Date.now()) {
  const key = appIdentityKey(app);
  return key ? blockRegistry.isBlocked(key, now) : false;
}

function clearAppBlocks() {
  blockRegistry.clear();
}

async function executeAppConsequence(app, execFn = defaultExec) {
  await quitApp(app, execFn);
  registerAppBlock(app);
}

module.exports = {
  executeAppConsequence,
  registerAppBlock,
  isAppBlocked,
  clearAppBlocks,
  quitApp,
};
