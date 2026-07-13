function normalizeHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return null;
  }
  return hostname.toLowerCase().replace(/^www\./, '');
}

function hostnameMatches(hostname, pattern) {
  const host = normalizeHostname(hostname);
  const target = pattern.toLowerCase().trim();
  if (!host || !target) {
    return false;
  }

  if (target.startsWith('*.')) {
    const base = target.slice(2);
    return host === base || host.endsWith('.' + base);
  }

  const normalizedTarget = target.replace(/^www\./, '');
  return host === normalizedTarget;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeHostname, hostnameMatches };
}
