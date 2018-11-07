process.on('exit', () => {
  if (global.SERVER) {
    global.SERVER.kill();
  }
});

const fs = require('fs-extra');
const stream = require('stream');
const chalk = require('chalk');
const puppeteer = require('puppeteer');
const child_process = require('child_process');
const waitPort = require('wait-port');
const { servers } = require('yoshi-config');
const { WS_ENDPOINT_PATH } = require('./constants');
const { shouldRunE2Es } = require('./utils');
const { getProcessOnPort, setupRequireHooks } = require('yoshi-helpers');

// the user's config is loaded outside of a jest runtime and should be transpiled
// with babel/typescript, this may be run separately for every worker
setupRequireHooks();

const jestYoshiConfig = require('yoshi-config/jest');

const serverLogPrefixer = () => {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(`${chalk.magentaBright('[SERVER]')}: ${chunk.toString()}`);
      callback();
    },
  });
};

module.exports = async () => {
  // a bit hacky, run puppeteer setup only if it's required
  if (await shouldRunE2Es()) {
    // start with a few new lines
    console.log('\n\n');

    global.BROWSER = await puppeteer.launch({
      // defaults
      args: ['--no-sandbox'],

      // user defined options
      ...jestYoshiConfig.puppeteer,
    });

    await fs.outputFile(WS_ENDPOINT_PATH, global.BROWSER.wsEndpoint());

    const { cwd: webpackDevServerProcessCwd } = getProcessOnPort(
      servers.cdn.port,
    );

    if (!webpackDevServerProcessCwd) {
      throw new Error(
        `Running E2E tests requires a server to serve static files. Could not find any dev server on port ${chalk.cyan(
          servers.cdn.port,
        )}. Please run 'npm start' from a different terminal window.`,
      );
    }

    if (webpackDevServerProcessCwd !== process.cwd()) {
      throw new Error(
        `A different process (${chalk.cyan(
          webpackDevServerProcessCwd,
        )}) is already running on port '${chalk.cyan(
          servers.cdn.port,
        )}', aborting.`,
      );
    }

    if (jestYoshiConfig.server) {
      const { cwd: serverProcessCwd } = getProcessOnPort(
        jestYoshiConfig.server.port,
      );

      if (serverProcessCwd) {
        throw new Error(
          `A different process (${chalk.cyan(
            serverProcessCwd,
          )}) is already running on port ${chalk.cyan(
            jestYoshiConfig.server.port,
          )}, aborting.`,
        );
      }

      global.SERVER = child_process.spawn(jestYoshiConfig.server.command, {
        shell: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          PORT: jestYoshiConfig.server.port,
        },
      });

      global.SERVER.stdout.pipe(serverLogPrefixer()).pipe(process.stdout);
      global.SERVER.stderr.pipe(serverLogPrefixer()).pipe(process.stderr);

      if (jestYoshiConfig.server.port) {
        const timeout = 5000;

        const portFound = await waitPort({
          port: jestYoshiConfig.server.port,
          output: 'silent',
          timeout,
        });

        if (!portFound) {
          throw new Error(
            `Tried running '${chalk.cyan(
              jestYoshiConfig.server.filename,
            )}' but couldn't find a server on port '${chalk.cyan(
              jestYoshiConfig.server.port,
            )}' after ${chalk.cyan(timeout)} miliseconds.`,
          );
        }
      }

      console.log('\n');
    }
  }
};
