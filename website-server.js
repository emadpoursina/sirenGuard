const http = require('http');
const { websiteServerPort } = require('./config');
const { getWebsiteDetectionTrigger } = require('./store');
const websiteDetectionTrigger = require('./website-detection-trigger');

const LOOPBACK = '127.0.0.1';

let server = null;
let pendingCloseHostname = null;
const closeTabWaiters = [];
const CLOSE_TAB_LONG_POLL_MS = 60_000;

function parseCloseTabWaitMs(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return CLOSE_TAB_LONG_POLL_MS;
  }
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms < 0) {
    return CLOSE_TAB_LONG_POLL_MS;
  }
  return ms;
}

function removeCloseTabWaiter(waiter) {
  const idx = closeTabWaiters.indexOf(waiter);
  if (idx >= 0) {
    closeTabWaiters.splice(idx, 1);
  }
}

function replyCloseTab(res, close, hostname) {
  if (res.writableEnded) {
    return;
  }
  sendJson(res, 200, {
    close: Boolean(close),
    hostname: hostname || null,
  });
}

function deliverCloseTab(hostname) {
  const trimmed =
    typeof hostname === 'string' && hostname.trim() ? hostname.trim() : null;
  if (!trimmed) {
    return;
  }

  if (closeTabWaiters.length > 0) {
    const waiters = closeTabWaiters.splice(0);
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      replyCloseTab(waiter.res, true, trimmed);
    }
    return;
  }

  pendingCloseHostname = trimmed;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    ...corsHeaders(),
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${LOOPBACK}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/sites') {
      const trigger = getWebsiteDetectionTrigger();
      const targets = Array.isArray(trigger?.targets) ? trigger.targets : [];
      const address = server?.address();
      const port =
        address && typeof address === 'object' && address.port
          ? address.port
          : resolvePort();
      sendJson(res, 200, { targets, port });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/site-match') {
      const body = await readJsonBody(req);
      const hostname = typeof body.hostname === 'string' ? body.hostname.trim() : '';
      if (!hostname) {
        sendJson(res, 400, { ok: false, error: 'hostname required' });
        return;
      }
      const matchUrl = typeof body.url === 'string' ? body.url : '';
      websiteDetectionTrigger.onSiteMatch(hostname, matchUrl);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/site-leave') {
      websiteDetectionTrigger.onSiteLeave();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/close-tab') {
      if (pendingCloseHostname) {
        const hostname = pendingCloseHostname;
        pendingCloseHostname = null;
        replyCloseTab(res, true, hostname);
        return;
      }

      const waitMs = parseCloseTabWaitMs(url.searchParams.get('wait'));
      if (waitMs === 0) {
        replyCloseTab(res, false, null);
        return;
      }

      const waiter = {
        res,
        timeout: setTimeout(() => {
          removeCloseTabWaiter(waiter);
          replyCloseTab(res, false, null);
        }, waitMs),
      };

      req.on('close', () => {
        clearTimeout(waiter.timeout);
        removeCloseTabWaiter(waiter);
      });

      closeTabWaiters.push(waiter);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/close-tab') {
      const body = await readJsonBody(req);
      const hostname =
        typeof body.hostname === 'string' ? body.hostname.trim() : '';
      if (!hostname) {
        sendJson(res, 400, { ok: false, error: 'hostname required' });
        return;
      }
      deliverCloseTab(hostname);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    console.error('siren-guard: website-server request error', err.message);
    sendJson(res, 400, { ok: false, error: 'bad request' });
  }
}

function resolvePort(options = {}) {
  const port = Number(options.port ?? websiteServerPort);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  return port;
}

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const nextServer = http.createServer(handleRequest);

    nextServer.on('error', (err) => {
      reject(err);
    });

    nextServer.listen(port, LOOPBACK, () => {
      const address = nextServer.address();
      if (!address || address.address !== LOOPBACK) {
        nextServer.close();
        reject(new Error('server not bound to loopback'));
        return;
      }
      server = nextServer;
      resolve(port);
    });
  });
}

async function start(options = {}) {
  if (server) {
    return;
  }

  const port = resolvePort(options);
  if (!port) {
    console.error(
      'siren-guard: website-server failed to start — set a valid websiteServerPort in config.js'
    );
    return;
  }

  try {
    await listenOnPort(port);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `siren-guard: website-server port ${port} is already in use — free the port or change config.js`
      );
      return;
    }
    console.error('siren-guard: website-server failed to start', err.message);
  }
}

function stop() {
  if (!server) {
    return;
  }
  for (const waiter of closeTabWaiters.splice(0)) {
    clearTimeout(waiter.timeout);
  }
  pendingCloseHostname = null;
  server.close();
  server = null;
}

function requestCloseTab(hostname) {
  if (hostname && typeof hostname === 'string') {
    deliverCloseTab(hostname);
  }
}

module.exports = {
  start,
  stop,
  requestCloseTab,
  LOOPBACK,
  resolvePort,
};
