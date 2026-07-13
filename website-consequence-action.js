const { RE_ENTRY_BLOCK_SEC } = require('./store');

async function executeWebsiteConsequence(hostname) {
  if (hostname) {
    require('./website-server').requestCloseTab(hostname);
  }
  require('./website-detection-trigger').registerSiteBlock(hostname);
}

module.exports = {
  executeWebsiteConsequence,
};
