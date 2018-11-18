/* eslint-disable no-throw-literal */
// Assign env vars before requiring anything so that it is available to all files
process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const minimist = require('minimist');
const { createRunner } = require('haste-core');
const LoggerPlugin = require('../plugins/haste-plugin-yoshi-logger');
const globs = require('yoshi-config/globs');
const chalk = require('chalk');
const projectConfig = require('yoshi-config');
const {
  watchMode,
  hasProtractorConfigFile,
  hasE2ETests,
  getMochaReporter,
  watch,
  hasBundleInStaticsDir,
} = require('yoshi-helpers');
const protractor = require('../../src/tasks/protractor');
const { printAndExitOnErrors } = require('../error-handler');

const runner = createRunner({
  logger: new LoggerPlugin(),
});

const rawCliArgs = process.argv.slice(2);
const cliArgs = minimist(rawCliArgs);

const noOptions =
  !cliArgs.mocha &&
  !cliArgs.jasmine &&
  !cliArgs.karma &&
  !cliArgs.jest &&
  !cliArgs.protractor;

if (noOptions) {
  cliArgs.mocha = true;
  cliArgs.protractor = true;
}

const debugPort = cliArgs.debug;
const debugBrkPort = cliArgs['debug-brk'];
const shouldWatch = cliArgs.watch || cliArgs.w || watchMode();
const shouldRunProtractor =
  cliArgs.protractor && hasProtractorConfigFile() && !shouldWatch;
const shouldRunPuppeteer =
  hasE2ETests() && !shouldWatch && !hasProtractorConfigFile();

module.exports = runner.command(
  async tasks => {
    const { karma, webpack } = tasks;

    const wixCdn = tasks[require.resolve('../tasks/cdn/index')];
    const specsPattern = [projectConfig.specs.node || globs.specs];

    function bootstrapCdn() {
      if (!hasBundleInStaticsDir()) {
        console.error();
        console.error(
          chalk.red(
            ' ● Warning:\n\n' +
              "   you are running e2e tests and doesn't have any bundle located in the statics directory\n" +
              '   you probably need to run ' +
              chalk.bold('npx yoshi build') +
              ' before running the tests',
          ),
        );
        console.error();
      }

      return printAndExitOnErrors(() =>
        wixCdn(
          {
            port: projectConfig.servers.cdn.port,
            ssl: projectConfig.servers.cdn.ssl,
            publicPath: projectConfig.servers.cdn.url,
            statics: projectConfig.clientFilesPath,
          },
          { title: 'cdn' },
        ),
      );
    }

    if (cliArgs.mocha) {
      if (shouldRunPuppeteer) {
        specsPattern.push(globs.e2eTests);
        await bootstrapCdn();
      }

      const mochaArgs = [
        require.resolve('mocha/bin/_mocha'),
        ...specsPattern,
        `--require=${require.resolve('../../config/test-setup')}`,
        '--timeout=30000',
        `--reporter=${getMochaReporter()}`,
      ];

      if (cliArgs.coverage) {
        mochaArgs.unshift(require.resolve('nyc/bin/nyc'));
      }

      if (debugBrkPort !== undefined) {
        mochaArgs.unshift(`--inspect-brk=${debugBrkPort}`);
        mochaArgs.push('--no-timeouts');
      } else if (debugPort !== undefined) {
        mochaArgs.unshift(`--inspect=${debugPort}`);
        mochaArgs.push('--no-timeouts');
      }

      const runMocha = async errorHandler => {
        try {
          await execa('node', mochaArgs, { stdio: 'inherit' });
        } catch (error) {
          return errorHandler && errorHandler(error);
        }
      };

      if (shouldWatch) {
        watch({ pattern: [globs.testFilesWatch] }, async () => {
          await runMocha(); // fail silently
        });

        await runMocha(); // fail silently
      } else {
        await runMocha(error => {
          console.error(`mocha failed with status code "${error.code}"`);
          process.exit(1);
        });
      }
    }

    if (cliArgs.jasmine) {
      const jasmineJsonPath = path.join(process.cwd(), 'test', 'jasmine.json');

      const jasmineConfig = fs.existsSync(jasmineJsonPath)
        ? jasmineJsonPath
        : require.resolve('../../config/jasmine-config');

      const jasmineArgs = [
        require.resolve('jasmine/bin/jasmine'),
        `--config=${jasmineConfig}`,
      ];

      if (cliArgs.coverage) {
        jasmineArgs.unshift(require.resolve('nyc/bin/nyc'));
      }

      try {
        await execa('node', jasmineArgs, { stdio: 'inherit' });
      } catch (error) {
        if (!shouldWatch) {
          console.error(`jasmine failed with status code "${error.code}"`);
          process.exit(1);
        }
      }

      if (shouldWatch) {
        watch(
          {
            pattern: [
              globs.specs,
              path.join(globs.base, '**', '*.{js,jsx,ts,tsx}'),
              'index.js',
            ],
          },
          async () => {
            await execa('node', jasmineArgs, { stdio: 'inherit' });
          },
        );
      }
    }

    if (cliArgs.jest) {
      if (!shouldWatch && hasE2ETests()) {
        await bootstrapCdn();
      }

      const configPath = require.resolve('../../config/jest.config.js');

      const jestCliOptions = [
        require.resolve('jest/bin/jest'),
        `--config=${configPath}`,
        `--rootDir=${process.cwd()}`,
      ];

      shouldWatch && jestCliOptions.push('--watch');

      const jestForwardedOptions = rawCliArgs
        .slice(rawCliArgs.indexOf('test') + 1)
        // filter yoshi's option
        .filter(arg => arg !== '--jest' && arg.indexOf('debug') === -1);

      jestCliOptions.push(...jestForwardedOptions);

      if (debugBrkPort !== undefined) {
        jestCliOptions.unshift(`--inspect-brk=${debugBrkPort}`);
        !jestForwardedOptions.includes('--runInBand') &&
          jestCliOptions.push('--runInBand');
      } else if (debugPort !== undefined) {
        jestCliOptions.unshift(`--inspect=${debugPort}`);
        !jestForwardedOptions.includes('--runInBand') &&
          jestCliOptions.push('--runInBand');
      }

      try {
        await execa('node', jestCliOptions, { stdio: 'inherit' });
      } catch (error) {
        console.error(`jest failed with status code "${error.code}"`);
        process.exit(1);
      }
    }

    if (cliArgs.karma) {
      await printAndExitOnErrors(async () => {
        await webpack({
          configPath: require.resolve('../../config/webpack.config.specs'),
          watch: shouldWatch,
        });

        await karma({
          configFile: path.join(__dirname, '../../config/karma.conf'),
          singleRun: !shouldWatch,
          autoWatch: shouldWatch,
        });
      });
    }

    if (shouldRunProtractor) {
      await bootstrapCdn();
      return protractor(debugPort, debugBrkPort);
    }
  },
  { persistent: shouldWatch },
);
