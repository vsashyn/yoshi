// https://github.com/wix-platform/wix-node-platform/tree/master/bootstrap/wix-bootstrap-testkit
const testkit = require('@wix/wix-bootstrap-testkit');
// https://github.com/wix-platform/wix-node-platform/tree/master/config/wix-config-emitter
const configEmitter = require('@wix/wix-config-emitter');

// take erb configurations from source folder, replace values/functions,
// remove the ".erb" extension and emit files inside the target folder
module.exports.emitConfigs = ({ targetFolder }) => {
  const emitter = configEmitter({
    sourceFolders: ['./templates'],
    targetFolder,
  });

  return emitter.val('scripts_domain', 'static.parastorage.com').emit();
};

// start the server as an embedded app
module.exports.bootstrapServer = ({ port, managementPort, appConfDir }) => {
  return testkit.app('./index', {
    env: {
      PORT: port,
      MANAGEMENT_PORT: managementPort,
      NEW_RELIC_LOG_LEVEL: 'warn',
      APP_CONF_DIR: appConfDir,
      DEBUG: '',
    },
  });
};
