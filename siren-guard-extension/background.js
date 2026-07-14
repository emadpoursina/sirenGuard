importScripts('hostname-match.js', 'config.js');

const SYNC_INTERVAL_MS = 60_000;
const CLOSE_TAB_ERROR_RETRY_MS = 5000;

let closeTabWatchStarted = false;

let baseUrl = '';
try {
  if (!DESKTOP_APP_URL || typeof DESKTOP_APP_URL !== 'string') {
    throw new Error('missing DESKTOP_APP_URL');
  }
  const parsed = new URL(DESKTOP_APP_URL);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('invalid protocol');
  }
  baseUrl = parsed.origin;
} catch {
  console.error(
    'siren-guard: set DESKTOP_APP_URL in siren-guard-extension/config.js (e.g. http://sirenguard.localhost)'
  );
}

let targets = [];
let matchedHostname = null;
let syncTimer = null;

function isMatched(hostname) {
  if (!hostname || targets.length === 0) {
    return false;
  }
  return targets.some((target) => hostnameMatches(hostname, target));
}

async function fetchTargets() {
  if (!baseUrl) {
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/sites`);
    if (!res.ok) {
      console.error(
        `siren-guard: desktop app returned ${res.status} at ${baseUrl}`
      );
      return;
    }
    const data = await res.json();
    if (Array.isArray(data.targets)) {
      targets = data.targets.map((t) => String(t));
    }
  } catch {
    console.error(
      `siren-guard: cannot reach desktop app at ${baseUrl} — is Siren Guard running?`
    );
  }
}

async function postJson(path, body) {
  if (!baseUrl) {
    return;
  }

  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    console.error(
      `siren-guard: cannot reach desktop app at ${baseUrl} — is Siren Guard running?`
    );
  }
}

async function sendMatch(hostname, url) {
  await postJson('/site-match', {
    hostname,
    url,
    timestamp: Date.now(),
  });
}

async function sendLeave(hostname, url) {
  await postJson('/site-leave', {
    hostname: hostname || undefined,
    url: url || undefined,
    timestamp: Date.now(),
  });
}

async function pollCloseTabOnce() {
  if (!baseUrl) {
    return;
  }

  const res = await fetch(`${baseUrl}/close-tab`);
  if (!res.ok) {
    throw new Error(`close-tab status ${res.status}`);
  }
  const data = await res.json();
  if (!data.close || !data.hostname) {
    return;
  }
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url || tab.url.startsWith('chrome://')) {
    return;
  }
  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }
  if (hostname === data.hostname || isMatched(hostname)) {
    await chrome.tabs.remove(tab.id);
    if (matchedHostname === hostname) {
      matchedHostname = null;
    }
  }
}

async function runCloseTabWatch() {
  while (baseUrl) {
    try {
      await pollCloseTabOnce();
    } catch {
      await new Promise((resolve) => {
        setTimeout(resolve, CLOSE_TAB_ERROR_RETRY_MS);
      });
    }
  }
}

async function evaluateActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
    if (matchedHostname) {
      await sendLeave(matchedHostname, '');
      matchedHostname = null;
    }
    return;
  }

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const nowMatched = isMatched(hostname);
  if (nowMatched && matchedHostname !== hostname) {
    if (matchedHostname) {
      await sendLeave(matchedHostname, tab.url);
    }
    matchedHostname = hostname;
    await sendMatch(hostname, tab.url);
    return;
  }

  if (!nowMatched && matchedHostname) {
    await sendLeave(matchedHostname, tab.url);
    matchedHostname = null;
  }
}

function startSyncTimer() {
  if (syncTimer) {
    return;
  }
  syncTimer = setInterval(() => {
    fetchTargets();
  }, SYNC_INTERVAL_MS);
}

function stopSyncTimer() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await fetchTargets();
  startSyncTimer();
  await evaluateActiveTab();
});

chrome.runtime.onStartup.addListener(async () => {
  await fetchTargets();
  startSyncTimer();
  await evaluateActiveTab();
});

chrome.tabs.onActivated.addListener(() => {
  evaluateActiveTab();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    evaluateActiveTab();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    evaluateActiveTab();
  }
});

fetchTargets();
startSyncTimer();
if (!closeTabWatchStarted) {
  closeTabWatchStarted = true;
  runCloseTabWatch();
}
