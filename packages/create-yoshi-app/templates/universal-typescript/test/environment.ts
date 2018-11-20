// https://github.com/wix-platform/wix-node-platform/tree/master/bootstrap/wix-bootstrap-testkit
import * as testkit from '@wix/wix-bootstrap-testkit';
// https://github.com/wix-platform/wix-node-platform/tree/master/config/wix-config-emitter
import * as configEmitter from '@wix/wix-config-emitter';

export const app = bootstrapServer();

export const beforeAndAfter = () => {
  before(() => emitConfigs());
  app.beforeAndAfter();
};

// take erb configurations from source folder, replace values/functions,
// remove the ".erb" extension and emit files inside the target folder
function emitConfigs() {
  return configEmitter({
    sourceFolders: ['./templates'],
    targetFolder: './target/configs',
  })
    .fn('scripts_domain', 'static.parastorage.com')
    .fn('static_url', 'com.wixpress.{%projectName%}', 'http://localhost:3200/')
    .emit();
}

// start the server as an embedded app
function bootstrapServer() {
  return testkit.app('./index', {
    env: {
      PORT: 3100,
      MANAGEMENT_PORT: 3104,
      NEW_RELIC_LOG_LEVEL: 'warn',
      DEBUG: '',
    },
  });
}
