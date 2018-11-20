const cors = require('cors');
const chalk = require('chalk');
const webpack = require('webpack');
const waitPort = require('wait-port');
const clearConsole = require('react-dev-utils/clearConsole');
const { prepareUrls } = require('react-dev-utils/WebpackDevServerUtils');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const project = require('yoshi-config');
const { STATICS_DIR, PUBLIC_DIR } = require('yoshi-config/paths');
const { PORT } = require('./constants');
const { redirectMiddleware } = require('../src/tasks/cdn/server-api');
const express = require('express');
const serveIndex = require('serve-index');

const isInteractive = process.stdout.isTTY;

function createCompiler(config, { https }) {
  let compiler;

  try {
    compiler = webpack(config);
  } catch (err) {
    console.log(chalk.red('Failed to compile.'));
    console.log();
    console.log(err.message || err);
    console.log();
    process.exit(1);
  }

  compiler.hooks.invalid.tap('recompile-log', () => {
    if (isInteractive) {
      clearConsole();
    }
    console.log('Compiling...');
  });

  compiler.hooks.done.tap('finished-log', stats => {
    if (isInteractive) {
      clearConsole();
    }

    const messages = formatWebpackMessages(stats.toJson({}, true));
    const isSuccessful = !messages.errors.length && !messages.warnings.length;

    if (isSuccessful) {
      console.log(chalk.green('Compiled successfully!'));

      if (isInteractive) {
        const serverUrls = prepareUrls('http', '0.0.0.0', PORT);
        const devServerUrls = prepareUrls(
          https ? 'https' : 'http',
          '0.0.0.0',
          project.servers.cdn.port,
        );

        console.log();
        console.log(
          `Your server is starting and should be accessible from your browser.`,
        );
        console.log();

        console.log(
          `  ${chalk.bold('Local:')}            ${
            serverUrls.localUrlForTerminal
          }`,
        );
        console.log(
          `  ${chalk.bold('On Your Network:')}  ${
            serverUrls.lanUrlForTerminal
          }`,
        );

        console.log();
        console.log(
          `Your bundles and other static assets are served from your ${chalk.bold(
            'dev-server',
          )}.`,
        );
        console.log();

        console.log(
          `  ${chalk.bold('Local:')}            ${
            devServerUrls.localUrlForTerminal
          }`,
        );
        console.log(
          `  ${chalk.bold('On Your Network:')}  ${
            devServerUrls.lanUrlForTerminal
          }`,
        );

        console.log();
        console.log('Note that the development build is not optimized.');
        console.log(
          `To create a production build, use ` +
            `${chalk.cyan('npm run build')}.`,
        );
        console.log();
      }
    }

    // If errors exist, only show errors.
    if (messages.errors.length) {
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }

      console.log(chalk.red('Failed to compile.\n'));
      console.log(messages.errors.join('\n\n'));

      return;
    }

    // Show warnings if no errors were found.
    if (messages.warnings.length) {
      console.log(chalk.yellow('Compiled with warnings.\n'));
      console.log(messages.warnings.join('\n\n'));
    }
  });

  return compiler;
}

function createDevServerConfig({ publicPath, https }) {
  console.log('>>> PATHS', [STATICS_DIR, PUBLIC_DIR]);
  return {
    // Enable gzip compression for everything served
    compress: true,
    clientLogLevel: 'error',
    // Directories we provide here, WDS will watch if `watchContentBase` and
    // send content-change event on it's HMR infra.
    // note that PUBLIC_DIR will be served from / (not what we want, but we handle it later)
    contentBase: [STATICS_DIR, PUBLIC_DIR],
    watchContentBase: true,
    hot: true,
    publicPath,
    // We write our own errors/warnings to the console
    quiet: true,
    https,
    // The server should be accessible externally
    host: '0.0.0.0',
    overlay: true,
    before(app) {
      // Send cross origin headers
      app.use(cors());

      // Redirect `.min.(js|css)` to `.(js|css)`
      app.use(redirectMiddleware('0.0.0.0', project.servers.cdn.port));

      // We have a "virtual" path /assets that should be served from
      // PUBLIC_DIR = SRC_DIR + "/assets", however, WDS don't have an option
      // to create such a virtual route, so we need to do it ourselves:
      app.use('/assets', express.static(PUBLIC_DIR));
      app.use('/assets', serveIndex(PUBLIC_DIR));

      app.get('*', (req, res, next) => {
        const originalEnd = res.end;

        // we patch only root dir index to add /assets
        if (req.originalUrl !== '/') {
          return next();
        }

        res.end = function(data, encoding) {
          const dirName = 'assets';
          const marker = '<ul id="files" class="view-tiles">';
          data = data.replace(
            marker,
            `${marker}<li><a href="/${dirName}" class="" title="${dirName}"><span class="name">${dirName}</span><span class="size"></span><span class="date">${new Date().toLocaleDateString()}</span></a></li>`,
          );
          return originalEnd.apply(this, [data, encoding]);
        };
        next();
      });
    }
  };
}

function addEntry(config, hotEntries) {
  let newEntry = {};

  if (!Array.isArray(config.entry) && typeof config.entry === 'object') {
    const keys = Object.keys(config.entry);

    for (const entryName of keys) {
      newEntry[entryName] = hotEntries.concat(config.entry[entryName]);
    }
  } else {
    newEntry = hotEntries.concat(config.entry);
  }

  config.entry = newEntry;
}

async function waitForServerToStart({ server }) {
  const portFound = await waitPort({
    port: PORT,
    output: 'silent',
    timeout: 20000,
  });

  if (!portFound) {
    console.log(
      chalk.red(
        `\nCouldn't find a server running on port ${chalk.bold(PORT)}.`,
      ),
    );
    console.log(
      chalk.red(
        `Please make sure "${chalk.bold(
          server,
        )}" sets up a server on this port.\n`,
      ),
    );
    console.log(chalk.red('Aborting'));
    process.exit(1);
  }
}

function waitForCompilation(compiler) {
  return new Promise((resolve, reject) => {
    compiler.hooks.done.tap(
      'promise',
      stats => (stats.hasErrors() ? reject(stats) : resolve(stats)),
    );
  });
}

module.exports = {
  createCompiler,
  createDevServerConfig,
  waitForServerToStart,
  waitForCompilation,
  addEntry,
};
