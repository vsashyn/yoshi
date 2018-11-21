const fs = require('fs-extra');
const { WS_ENDPOINT_PATH } = require('./constants');
const { shouldRunE2Es } = require('./utils');
const cdnProxy = require('./cdnProxy');
const {
  killSpawnProcessAndHisChildren,
} = require('../../test-helpers/process');

module.exports = async () => {
  if (await shouldRunE2Es()) {
    await fs.remove(WS_ENDPOINT_PATH);

    await global.BROWSER.close();

    if (global.SERVER) {
      killSpawnProcessAndHisChildren(global.SERVER);
    }

    await cdnProxy.stop();
  }
};
