function triggersArrayToLegacyObject(triggers) {
  const idle = triggers.find((t) => t.id === 'idle') || {};
  const appDetection = triggers.find((t) => t.id === 'app-detection') || {};
  return {
    idle: {
      enabled: idle.enabled,
      thresholdSec: idle.thresholdSec,
    },
    appDetection: {
      enabled: appDetection.enabled,
      delaySec: appDetection.delaySec,
      flaggedApps: appDetection.flaggedApps || [],
    },
  };
}

function legacyObjectToTriggersArray(config) {
  const idle = config.idle || {};
  const appDetection = config.appDetection || {};
  return [
    {
      id: 'idle',
      name: 'Idle-timer',
      enabled: !!idle.enabled,
      thresholdSec: Number(idle.thresholdSec) || 300,
    },
    {
      id: 'app-detection',
      name: 'App-detection',
      enabled: !!appDetection.enabled,
      delaySec: Number(appDetection.delaySec) || 10,
      flaggedApps: Array.isArray(appDetection.flaggedApps)
        ? appDetection.flaggedApps
        : [],
    },
  ];
}

module.exports = {
  triggersArrayToLegacyObject,
  legacyObjectToTriggersArray,
};
