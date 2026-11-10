function normalizeHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return null;
  }
  return hostname.toLowerCase().replace(/^www\./, '');
}

function splitTarget(pattern) {
  if (!pattern || typeof pattern !== 'string') {
    return null;
  }

  let raw = pattern.trim().toLowerCase();
  if (!raw) {
    return null;
  }

  raw = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^\/\//, '');
  const queryIndex = raw.search(/[?#]/);
  if (queryIndex !== -1) {
    raw = raw.slice(0, queryIndex);
  }
  raw = raw.replace(/\/+$/, '');
  if (!raw) {
    return null;
  }

  const slashIndex = raw.indexOf('/');
  const host = (slashIndex === -1 ? raw : raw.slice(0, slashIndex)).replace(
    /^www\./,
    ''
  );
  const path = slashIndex === -1 ? '' : raw.slice(slashIndex);

  if (!host) {
    return null;
  }

  return { host, path };
}

function isValidHost(host) {
  const bareHost = host.replace(/^\*\.?/, '');
  if (!bareHost) {
    return false;
  }
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(
    bareHost
  );
}

function normalizeWebsiteTarget(value) {
  const target = splitTarget(value);
  if (!target || !isValidHost(target.host)) {
    return null;
  }
  if (target.path && /[\s\\]/.test(target.path)) {
    return null;
  }
  return target.host + target.path;
}

function hostnameMatches(hostname, pattern) {
  const host = normalizeHostname(hostname);
  const target = splitTarget(pattern);
  if (!host || !target) {
    return false;
  }

  const wildcard = target.host.startsWith('*');
  const base = target.host.replace(/^\*\.?/, '');
  if (!base) {
    return false;
  }

  if (wildcard) {
    return host === base || host.endsWith('.' + base);
  }

  return host === base;
}

function normalizePath(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return '/';
  }
  let path = pathname.toLowerCase();
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  path = path.replace(/\/+$/, '');
  return path || '/';
}

function pathMatches(pathname, patternPath) {
  const path = normalizePath(pathname);
  const target = normalizePath(patternPath);

  if (target === '/') {
    return true;
  }

  if (target.includes('*')) {
    const source = target
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${source}$`).test(path);
  }

  return path === target || path.startsWith(`${target}/`);
}

function urlMatchesTarget(url, pattern) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const target = splitTarget(pattern);
  if (!target) {
    return false;
  }

  const absoluteUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
    ? url
    : `http://${url}`;

  let parsedUrl;
  try {
    parsedUrl = new URL(absoluteUrl);
  } catch {
    return false;
  }

  if (!hostnameMatches(parsedUrl.hostname, pattern)) {
    return false;
  }

  return pathMatches(parsedUrl.pathname, target.path);
}

function findMatchingTarget(url, targets) {
  if (!url || !Array.isArray(targets)) {
    return null;
  }
  for (const target of targets) {
    if (urlMatchesTarget(url, target)) {
      return target;
    }
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeHostname,
    normalizeWebsiteTarget,
    hostnameMatches,
    urlMatchesTarget,
    findMatchingTarget,
  };
}
