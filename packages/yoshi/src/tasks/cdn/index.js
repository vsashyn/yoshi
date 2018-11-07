const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const hotClient = require('webpack-hot-client');
const { decorate } = require('./server-api');
const { shouldRunWebpack, logStats, normalizeEntries } = require('./utils');
const { getListOfEntries, getProcessOnPort } = require('yoshi-helpers');

module.exports = async ({
  port = '3000',
  ssl,
  hmr = true,
  liveReload = true,
  transformHMRRuntime,
  host = 'localhost',
  publicPath,
  statics,
  webpackConfigPath,
  configuredEntry,
  defaultEntry,
} = {}) => {
  const processOnPort = await getProcessOnPort(parseInt(port));

  if (processOnPort) {
    const currentCwd = process.cwd();

    if (currentCwd !== processOnPort.cwd) {
      throw new Error(
        `Unable to run cdn! port ${port} is already in use by another process in another project (pid=${
          processOnPort.pid
        }, path=${processOnPort.cwd})`,
      );
    } else {
      console.log(`\tcdn is already running on ${port}, skipping...`);

      return;
    }
  }

  console.log(`\tRunning cdn on port ${port}...`);

  let middlewares = [];

  if (webpackConfigPath) {
    const getConfig = require(webpackConfigPath);
    const webpackConfig = getConfig({
      isDebug: true,
    });

    if (shouldRunWebpack(webpackConfig, defaultEntry, configuredEntry)) {
      webpackConfig.output.publicPath = publicPath;

      if (transformHMRRuntime) {
        const entryFiles = getListOfEntries(configuredEntry || defaultEntry);
        webpackConfig.module.rules.forEach(rule => {
          if (Array.isArray(rule.use)) {
            rule.use = rule.use.map(useItem => {
              if (useItem === 'babel-loader') {
                useItem = { loader: 'babel-loader' };
              }
              if (useItem.loader === 'babel-loader') {
                if (!useItem.options) {
                  useItem.options = {};
                }
                if (!useItem.options.plugins) {
                  useItem.options.plugins = [];
                }
                useItem.options.plugins.push(
                  require.resolve('react-hot-loader/babel'),
                  [
                    require.resolve('babel-plugin-transform-hmr-runtime'),
                    { entryFiles },
                  ],
                );
              }
              return useItem;
            });
          }
        });
      }

      webpackConfig.entry = normalizeEntries(webpackConfig.entry);
      const compiler = webpack(webpackConfig);

      // If both hmr and reload are false it makes this module fairly useless
      // https://github.com/webpack-contrib/webpack-hot-client#reload
      if (liveReload || hmr) {
        hotClient(compiler, {
          reload: liveReload,
          hmr: Boolean(hmr),
          logLevel: 'warn',
          autoConfigure: true,
          allEntries: true,
          port: parseInt(port) + 1,
        });
      }

      logStats(compiler);

      middlewares = [webpackDevMiddleware(compiler, { logLevel: 'silent' })];
    }
  }

  const app = express();

  decorate({ app, middlewares, host, port, statics });

  const serverFactory = ssl ? httpsServer(app) : app;

  return new Promise((resolve, reject) => {
    serverFactory.listen(port, host, err => (err ? reject(err) : resolve()));
  });
};

function sslCredentials(keyPath, certificatePath, passphrase) {
  const privateKey = fs.readFileSync(path.join(__dirname, keyPath), 'utf8');
  const certificate = fs.readFileSync(
    path.resolve(__dirname, certificatePath),
    'utf8',
  );

  return {
    key: privateKey,
    cert: certificate,
    passphrase,
  };
}

function httpsServer(app) {
  const credentials = sslCredentials(
    './assets/key.pem',
    './assets/cert.pem',
    '1234',
  );
  return https.createServer(credentials, app);
}
