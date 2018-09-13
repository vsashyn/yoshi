const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const spawn = require('cross-spawn');
const detect = require('detect-port');
const debounce = require('lodash/debounce');
const { PORT } = require('../../constants');
const waitPort = require('wait-port');

let server;
let port;

const defaultPort = Number(process.env.PORT) || PORT;
const serverDebugHost = '127.0.0.1';

function ensureServerIsNotRunning(newPort) {
  let startServerPromise = Promise.resolve(newPort);
  if (server) {
    server.kill('SIGTERM');
    startServerPromise = new Promise(resolve => {
      // Wait for the server to really be killed (Otherwise, sometimes, debugging port is not released)
      const intervalKey = setInterval(() => {
        if (server.killed) {
          clearInterval(intervalKey);
          resolve(newPort);
        }
      }, 500);
    });
  }

  return startServerPromise;
}

function initializeServerStartDelegate({
  serverScript,
  debugPort,
  debugBrkPort,
  log,
}) {
  return async port => {
    const defaultEnv = {
      NODE_ENV: 'development',
      DEBUG: 'wix:*,wnp:*',
    };

    const env = Object.assign(defaultEnv, process.env, {
      PORT: port,
    });

    if (port !== defaultPort) {
      console.log(
        chalk.green(
          `There's something running on port ${defaultPort}, using ${port} instead.`,
        ),
      );
    }

    mkdirp.sync(path.resolve('target'));
    const runScripts = [serverScript];
    if (debugBrkPort !== undefined) {
      runScripts.unshift(`--inspect-brk=${serverDebugHost}:${debugBrkPort}`);
    } else if (debugPort !== undefined) {
      runScripts.unshift(`--inspect=${serverDebugHost}:${debugPort}`);
    }

    server = spawn('node', runScripts, { env });
    [server.stdout, server.stderr].forEach(stream => stream.on('data', log));

    const displayErrors = debounce(() => {
      console.log(
        chalk.red('There are errors! Please check'),
        chalk.magenta('./target/server.log'),
      );
    }, 500);

    server.stderr.on('data', buffer => {
      if (buffer.toString().includes('wix:error')) {
        displayErrors();
      }
    });

    const waitingLogTimeout = setTimeout(() => {
      console.log('');
      console.log(
        `Still waiting for app-server to start (make sure it is listening on ${chalk.magenta(
          'process.env.PORT',
        )}...`,
      );
    }, 3000);

    await waitPort({
      host: 'localhost',
      port: env.PORT,
      output: 'silent',
    });

    clearTimeout(waitingLogTimeout);

    console.log(
      'Application is now available at ',
      chalk.magenta(`http://localhost:${env.PORT}${env.MOUNT_POINT || '/'}`),
    );
    if (debugBrkPort !== undefined) {
      console.log(
        'Debugger is available at ',
        chalk.magenta(`${serverDebugHost}:${debugBrkPort}`),
      );
    } else if (debugPort !== undefined) {
      console.log(
        'Debugger is available at ',
        chalk.magenta(`${serverDebugHost}:${debugPort}`),
      );
    }
    console.log(
      'Server log is written to ',
      chalk.magenta('./target/server.log'),
    );
  };
}

module.exports = ({
  base = process.cwd(),
  entryPoint = 'index.js',
  manualRestart = false,
  debugPort = undefined,
  debugBrkPort = undefined,
} = {}) => {
  function writeToServerLog(data) {
    fs.appendFile(path.join(base, 'target', 'server.log'), data, () => {});
  }

  if (server && manualRestart) {
    server.kill('SIGHUP');
    return Promise.resolve();
  }

  const serverScript = path.resolve(base, entryPoint);

  if (!fs.existsSync(serverScript)) {
    mkdirp.sync(path.resolve(base, 'target'));
    writeToServerLog('no server');
    return Promise.resolve();
  }

  port = port || detect(defaultPort);

  const startServer = initializeServerStartDelegate({
    serverScript,
    debugPort,
    debugBrkPort,
    log: writeToServerLog,
  });

  return port.then(ensureServerIsNotRunning).then(startServer);
};
