import { test, expect, mock, beforeEach, afterEach } from 'bun:test';
import http from 'http';

const siteMatchCalls = [];
let pendingClose = null;

mock.module('../website-detection-trigger.js', () => ({
  onSiteMatch: (hostname, url) => {
    siteMatchCalls.push({ hostname, url });
  },
  onSiteLeave: () => {},
  registerSiteBlock: () => {},
  isSiteBlocked: () => false,
}));

mock.module('../store.js', () => ({
  getWebsiteDetectionTrigger: () => ({ targets: ['example.com'] }),
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
            body: data ? JSON.parse(data) : null,
          });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

beforeEach(async () => {
  websiteServer.stop();
  port = 45300 + Math.floor(Math.random() * 1000);
  await websiteServer.start({ port });
});

afterEach(() => {
  websiteServer.stop();
});

test('POST /close-tab then GET /close-tab returns pending hostname once', async () => {
  const post = await request('POST', '/close-tab', { hostname: 'example.com' });
  expect(post.status).toBe(200);
  const get = await request('GET', '/close-tab');
  expect(get.body.close).toBe(true);
  expect(get.body.hostname).toBe('example.com');
  const again = await request('GET', '/close-tab?wait=0');
  expect(again.body.close).toBe(false);
});

test('requestCloseTab sets hostname for extension poll', async () => {
  websiteServer.requestCloseTab('youtube.com');
  const get = await request('GET', '/close-tab');
  expect(get.body.hostname).toBe('youtube.com');
});
