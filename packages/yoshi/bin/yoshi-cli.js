const prog = require('commander');
const runCLI = require('../src/cli');
const { version } = require('../package');
const infoCommand = require('../src/commands/info');
const config = require('yoshi-config');
const { configureSentry, handleError } = require('../src/sentry');
const chalk = require('chalk');
const { inTeamCity } = require('yoshi-helpers');

// IDEs start debugging with '--inspect' or '--inspect-brk' option. We are setting --debug instead
require('./normalize-debugging-args')();

prog.version(version).description('A toolkit for building applications in Wix');

prog.option('--verbose', 'Yoshi will print verbose logs and error messages.');

prog
  .command('lint [files...]')
  .description('Run the linter')
  .option('--fix', 'Automatically fix lint problems')
  .option('--format', 'Use a specific formatter for eslint/tslint')
  .action(() => runCLI('lint'));

prog
  .command('test')
  .description('Run unit tests and e2e tests if exists')
  .option('--mocha', 'Run unit tests with Mocha')
  .option('--jasmine', 'Run unit tests with Jasmine')
  .option('--karma', 'Run unit tests with Karma')
  .option('--jest', 'Run tests with Jest')
  .option('--protractor', 'Run e2e tests with Protractor')
  .option('--debug', 'Allow test debugging')
  .option('--coverage', 'Collect and output code coverage')
  .option(
    '--debug-brk',
    "Allow test debugging, process won't start until debugger will be attached",
  )
  .option(
    '-w, --watch',
    'Run tests on watch mode (mocha, jasmine, jest, karma)',
  )
  .allowUnknownOption()
  .action(() => runCLI('test'));

if (config.experimentalServerBundle) {
  prog
    .command('build')
    .description('Experimental way of building an app to production')
    .option('--analyze', 'Run webpack-bundle-analyzer plugin')
    .option('--stats', 'Generate dist/webpack-stats.json file')
    .action(() => runCLI('build-app'));

  prog
    .command('start')
    .description('Experimental local development experience')
    .option('--server', 'The main file to start your server')
    .option('--production', 'Start using unminified production build')
    .option('--https', 'Serve the app bundle on https')
    .option('--debug', 'Allow app-server debugging')
    .option(
      '--debug-brk',
      "Allow app-server debugging, process won't start until debugger will be attached",
    )
    .action(() => runCLI('start-app'));
} else {
  prog
    .command('build')
    .description('Build the app for production')
    .option('--output', 'The output directory for static assets')
    .option('--analyze', 'Run webpack-bundle-analyzer plugin')
    .option('--stats', 'Generate dist/webpack-stats.json file')
    .option('--no-min', 'Do not output minified bundle')
    .option('--source-map', 'Explictly emit bundle source maps')
    .action(() => runCLI('build'));

  prog
    .command('start')
    .description('Run the app in development mode (also spawns npm test)')
    .option('-e, --entry-point', 'Entry point for the app')
    .option(
      '--manual-restart',
      'Get SIGHUP on change and manage application reboot manually',
    )
    .option('--with-tests', 'Spawn npm test after start')
    .option('--no-server', 'Do not spawn the app server')
    .option('--debug', 'Allow app-server debugging')
    .option('--production', 'start using unminified production build')
    .option(
      '--debug-brk',
      "Allow app-server debugging, process won't start until debugger will be attached",
    )
    .option('--ssl', 'Serve the app bundle on https')
    .action(() => runCLI('start'));
}

prog
  .command('release')
  .description(
    'use wnpm-ci to bump a patch version if needed, should be used by CI',
  )
  .option('--minor', 'bump a minor version instead of a patch')
  .action(() => runCLI('release'));

prog
  .command('info')
  .description('Get your local environment information')
  .action(infoCommand);

try {
  if (!process.env.DISABLE_SENTRY) {
    configureSentry();
  }
} catch (_) {} // ignore errors of configuring sentry

function handleUncaughtError(error) {
  if (prog.verbose || inTeamCity()) {
    console.error(
      chalk.red(
        `  Yoshi has encountered the following fatal error. Here is the full stacktrace:`,
      ),
    );
    console.error();
    console.error(chalk.red(error.stack || error));
  } else {
    console.error(
      chalk.red(
        `  Yoshi has encountered the following fatal error. You can add the --verbose flag to view the full stacktrace.`,
      ),
    );
    console.error();
    console.error(chalk.red(`  ${error.message ? error.message : error}`));
  }

  if (!process.env.DISABLE_SENTRY) {
    handleError(error);
  } else {
    process.exit(1);
  }
}

process.on('unhandledRejection', handleUncaughtError);
process.on('uncaughtException', handleUncaughtError);

prog.parse(process.argv);
