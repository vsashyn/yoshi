process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const parseArgs = require('minimist');

const cliArgs = parseArgs(process.argv.slice(2), {
  default: {
    server: 'index.js',
    https: false,
  },
});

if (cliArgs.production) {
  process.env.BABEL_ENV = 'production';
  process.env.NODE_ENV = 'production';
}

const path = require('path');
const fs = require('fs-extra');
const stream = require('stream');
const child_process = require('child_process');
const chalk = require('chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const openBrowser = require('react-dev-utils/openBrowser');
const chokidar = require('chokidar');
const project = require('yoshi-config');
const {
  BUILD_DIR,
  PUBLIC_DIR,
  ASSETS_DIR,
  TARGET_DIR,
} = require('yoshi-config/paths');
const { PORT } = require('../constants');
const {
  createClientWebpackConfig,
  createServerWebpackConfig,
} = require('../../config/webpack.config');
const {
  createCompiler,
  createDevServerConfig,
  waitForServerToStart,
  waitForCompilation,
  addEntry,
} = require('../webpack-utils');

const updateNodeVersion = require('../tasks/update-node-version');

function serverLogPrefixer() {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(`${chalk.greenBright('[SERVER]')}: ${chunk.toString()}`);
      callback();
    },
  });
}

const https = cliArgs.https || project.servers.cdn.ssl;

module.exports = async () => {
  // Clean tmp folders
  await Promise.all([fs.emptyDir(BUILD_DIR), fs.emptyDir(TARGET_DIR)]);

  await updateNodeVersion();

  const clientConfig = createClientWebpackConfig({
    isDebug: true,
    isAnalyze: false,
  });

  const serverConfig = createServerWebpackConfig({
    isDebug: true,
  });

  // Configure client hot module replacement
  addEntry(clientConfig, [
    require.resolve('webpack/hot/dev-server'),
    require.resolve('webpack-dev-server/client'),
  ]);

  clientConfig.plugins.push(new webpack.HotModuleReplacementPlugin());

  // Configure server hot module replacement
  addEntry(serverConfig, [require.resolve('../../config/hot')]);

  serverConfig.plugins.push(new webpack.HotModuleReplacementPlugin());

  // Configure compilation
  const multiCompiler = createCompiler([clientConfig, serverConfig], { https });
  const compilationPromise = waitForCompilation(multiCompiler);

  const [clientCompiler, serverCompiler] = multiCompiler.compilers;

  // Setup dev server (CDN)
  const devServerConfig = createDevServerConfig({
    publicPath: clientConfig.output.publicPath,
    https,
  });

  const devServer = new WebpackDevServer(clientCompiler, devServerConfig);

  // Start up server compilation
  let serverProcess;

  serverCompiler.watch({ 'info-verbosity': 'none' }, (error, stats) => {
    if (serverProcess && !error && !stats.hasErrors()) {
      // If all is good, send our hot client entry a message to trigger HMR
      serverProcess.send({});
    }
  });

  console.log(chalk.cyan('Starting development environment...\n'));

  // Start up webpack dev server
  await new Promise((resolve, reject) => {
    devServer.listen(project.servers.cdn.port, '0.0.0.0', err =>
      err ? reject(err) : resolve(),
    );
  });

  // Wait for both compilations to finish
  try {
    await compilationPromise;
  } catch (error) {
    // We already log compilation errors in a compiler hook
    // If there's an error, just exit(1)
    process.exit(1);
  }

  // Start up the user's server
  const inspectArg = process.argv.find(arg => arg.includes('--debug'));

  const startServerProcess = () => {
    serverProcess = child_process.fork(cliArgs.server, {
      stdio: 'pipe',
      execArgv: [inspectArg]
        .filter(Boolean)
        .map(arg => arg.replace('debug', 'inspect')),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT,
      },
    });

    serverProcess.stdout.pipe(serverLogPrefixer()).pipe(process.stdout);
    serverProcess.stderr.pipe(serverLogPrefixer()).pipe(process.stderr);

    serverProcess.on('message', () => {
      serverProcess.kill();
      startServerProcess();
    });
  };

  startServerProcess();

  ['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      serverProcess.kill();
      devServer.close();
      process.exit();
    });
  });

  await waitForServerToStart({ server: cliArgs.server });

  // Once it started, open up the browser
  openBrowser(`http://localhost:${PORT}`);

  return {
    persistent: true,
  };
};
