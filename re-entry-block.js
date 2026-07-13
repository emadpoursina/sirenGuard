function createReEntryBlockRegistry(durationSec) {
  const blocks = new Map();
  const durationMs = durationSec * 1000;

  function add(key, now = Date.now()) {
    if (!key) {
      return;
    }
    blocks.set(key, now + durationMs);
  }

  function isBlocked(key, now = Date.now()) {
    const expiresAt = blocks.get(key);
    if (!expiresAt) {
      return false;
    }
    if (now >= expiresAt) {
      blocks.delete(key);
      return false;
    }
    return true;
  }

  function clear() {
    blocks.clear();
  }

  return { add, isBlocked, clear };
}

function appIdentityKey(app) {
  if (!app || typeof app !== 'object') {
    return null;
  }
  if (app.bundleId) {
    return `bundle:${app.bundleId}`;
  }
  if (app.name) {
    return `name:${app.name.toLowerCase()}`;
  }
  return null;
}

function hostnameKey(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return null;
  }
  return hostname.trim().toLowerCase();
}

module.exports = {
  createReEntryBlockRegistry,
  appIdentityKey,
  hostnameKey,
};
