import { test, expect, mock, beforeEach, afterEach } from 'bun:test';
import http from 'http';

const siteMatchCalls = [];
const siteLeaveCalls = [];

mock.module('../website-detection-trigger.js', () => ({
  onSiteMatch: (hostname, url) => {
    siteMatchCalls.push({ hostname, url });
  },
  onSiteLeave: () => {
    siteLeaveCalls.push(true);
  },
}));

let websiteTrigger = { targets: ['instagram.com', '*.youtube.com'] };

mock.module('../store.js', () => ({
  getWebsiteDetectionTrigger: () => websiteTrigger,
}));

const websiteServer = await import('../website-server.js');

let port = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: websiteServer.LOOPBACK,
        port,
        path,
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

beforeEach(async () => {
  siteMatchCalls.length = 0;
  siteLeaveCalls.length = 0;
  websiteTrigger = { targets: ['instagram.com', '*.youtube.com'] };
  websiteServer.stop();
  port = 45200 + Math.floor(Math.random() * 1000);
  await websiteServer.start({ port });
});

afterEach(() => {
  websiteServer.stop();
  mock.restore();
});

test('GET /sites returns configured targets and listening port', async () => {
  const res = await request('GET', '/sites');
  expect(res.status).toBe(200);
  expect(res.body.targets).toEqual(['instagram.com', '*.youtube.com']);
  expect(res.body.port).toBe(port);
  expect(res.headers['access-control-allow-origin']).toBe('*');
});

test('POST /site-match forwards to website-detection trigger', async () => {
  const res = await request('POST', '/site-match', {
    hostname: 'instagram.com',
    url: 'https://instagram.com',
    timestamp: Date.now(),
  });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(siteMatchCalls.length).toBe(1);
  expect(siteMatchCalls[0].hostname).toBe('instagram.com');
});

test('POST /site-match rejects missing hostname', async () => {
  const res = await request('POST', '/site-match', { url: 'https://x.com' });
  expect(res.status).toBe(400);
});

test('POST /site-leave forwards leave signal', async () => {
  const res = await request('POST', '/site-leave', { timestamp: Date.now() });
  expect(res.status).toBe(200);
  expect(siteLeaveCalls.length).toBe(1);
});

test('OPTIONS returns CORS preflight response', async () => {
  const res = await request('OPTIONS', '/sites');
  expect(res.status).toBe(204);
  expect(res.headers['access-control-allow-methods']).toContain('POST');
});
