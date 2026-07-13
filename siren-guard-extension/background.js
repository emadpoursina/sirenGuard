importScripts('hostname-match.js');

const DEFAULT_BASE_URL = 'http://127.0.0.1:45117';
const SYNC_INTERVAL_MS = 60_000;

let baseUrl = DEFAULT_BASE_URL;
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
  try {
    const res = await fetch(`${baseUrl}/sites`);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (Array.isArray(data.targets)) {
      targets = data.targets.map((t) => String(t));
    }
  } catch {
    // Desktop app may be offline; keep cached targets.
  }
}

async function postJson(path, body) {
  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Ignore transient desktop connectivity errors.
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
