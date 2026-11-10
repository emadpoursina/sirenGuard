const { normalizeWebsiteTarget } = require('./siren-guard-extension/hostname-match');

async function executeWebsiteConsequence(hostname, target) {
  const blockTarget =
    normalizeWebsiteTarget(target) ||
    normalizeWebsiteTarget(hostname) ||
    hostname;

  if (hostname || blockTarget) {
    require('./website-server').requestCloseTab(hostname, blockTarget);
  }
  require('./website-detection-trigger').registerSiteBlock(blockTarget);
}

module.exports = {
  executeWebsiteConsequence,
};
