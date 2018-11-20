const os = require('os');
const execa = require('execa');
const stripAnsi = require('strip-ansi');
const waitPort = require('wait-port');
const terminate = require('terminate');

async function waitForPort(port, { timeout = 20000 } = {}) {
  const portFound = await waitPort({ port, timeout, output: 'silent' });

  if (!portFound) {
    throw new Error(`Timed out waiting for "${port}".`);
  }
}

function execaSafe(...args) {
  return execa(...args)
    .then(({ stdout, stderr, ...rest }) => ({
      fulfilled: true,
      rejected: false,
      stdout: stripAnsi(stdout),
      stderr: stripAnsi(stderr),
      ...rest,
    }))
    .catch(err => ({
      fulfilled: false,
      rejected: true,
      reason: err,
      stdout: '',
      stderr: stripAnsi(
        err.message
          .split(os.EOL)
          .slice(2)
          .join(os.EOL),
      ),
    }));
}

module.exports = class Scripts {
  constructor(testDirectory) {
    this.testDirectory = testDirectory;
  }

  async start(env) {
    const port = 3000;

    const startProcess = execa('npx', ['yoshi', 'start'], {
      cwd: this.testDirectory,
      // stdio: 'inherit',
      env: {
        CI: 'false',
        FORCE_COLOR: '0',
        BROWSER: 'none',
        PORT: port,
        ...env,
      },
    });

    // `startProcess` will never resolve but if it fails this
    // promise will reject immediately
    await Promise.race([waitForPort(port), startProcess]);

    return {
      port,
      done() {
        return terminate(startProcess.pid);
      },
    };
  }

  async build(env = {}) {
    return execaSafe('npx', ['yoshi', 'build'], {
      cwd: this.testDirectory,
      env: { CI: 'false', FORCE_COLOR: '0', ...env },
      // stdio: 'inherit',
    });
  }

  async serve() {
    const staticsServerPort = 3200;
    const appServerProcessPort = 3000;

    const staticsServerProcess = execa(
      'npx',
      ['serve', '-p', staticsServerPort, '-s', 'dist/statics/'],
      {
        cwd: this.testDirectory,
        // stdio: 'inherit',
      },
    );

    const appServerProcess = execa('node', ['index.js'], {
      cwd: this.testDirectory,
      // stdio: 'inherit',
      env: {
        PORT: appServerProcessPort,
      },
    });

    await waitForPort(staticsServerPort);
    await waitForPort(appServerProcessPort);

    return {
      staticsServerPort,
      appServerProcessPort,
      done() {
        return Promise.all([
          terminate(staticsServerProcess.pid),
          terminate(appServerProcess.pid),
        ]);
      },
    };
  }
};
