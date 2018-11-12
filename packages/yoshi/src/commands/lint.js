const path = require('path');
const execa = require('execa');
const { createRunner } = require('haste-core');
const parseArgs = require('minimist');
const tslint = require('../tasks/tslint');
const eslint = require('../tasks/eslint');
const stylelint = require('../tasks/stylelint');
const LoggerPlugin = require('../plugins/haste-plugin-yoshi-logger');
const globs = require('yoshi-config/globs');

const {
  isTypescriptProject,
  shouldRunStylelint,
  watchMode,
} = require('yoshi-helpers');
const { printAndExitOnErrors } = require('../error-handler');

const { hooks } = require('yoshi-config');

const runner = createRunner({
  logger: new LoggerPlugin(),
});

const shouldWatch = watchMode();
const cliArgs = parseArgs(process.argv.slice(2));

module.exports = runner.command(async () => {
  if (shouldWatch) {
    return;
  }

  // Variadic arguments are placed inside the "_" property array
  // https://github.com/substack/minimist#var-argv--parseargsargs-opts
  // The first argument is the command itself (lint), we retrieve all the rest
  const { styleFiles, jsFiles, tsFiles } =
    cliArgs._.length > 1
      ? groupFilesByType(cliArgs._.slice(1))
      : { jsFiles: [], tsFiles: [], styleFiles: [] };
  const shouldRunOnSpecificFiles = !!(
    jsFiles.length ||
    tsFiles.length ||
    styleFiles.length
  );

  const { prelint } = hooks;

  if (shouldRunOnSpecificFiles) {
    if ((await shouldRunStylelint()) && styleFiles.length) {
      await runStyleLint(styleFiles);
    }

    if (isTypescriptProject() && tsFiles.length) {
      await runTsLint(tsFiles);
    } else if (jsFiles.length) {
      await runEsLint(jsFiles);
    }

    return null;
  }

  if (await shouldRunStylelint()) {
    await runStyleLint([`${globs.base}/**/*.scss`, `${globs.base}/**/*.less`]);
  }

  if (isTypescriptProject()) {
    await runTsLint();
  } else {
    await runEsLint(['*.js', `${globs.base}/**/*.js`]);
  }

  function runStyleLint(pattern) {
    return printAndExitOnErrors(async () => {
      await stylelint({ pattern, fix: cliArgs.fix });
    });
  }

  async function runTsLint(pattern) {
    const tsconfigFilePath = path.resolve('tsconfig.json');
    const tslintFilePath = path.resolve('tslint.json');

    return printAndExitOnErrors(async () => {
      if (prelint) {
        await execa.shell(prelint, { stdio: 'inherit' });
      }

      return tslint({
        tsconfigFilePath,
        tslintFilePath,
        pattern,
        options: { fix: cliArgs.fix, formatter: cliArgs.format || 'stylish' },
      });
    });
  }

  async function runEsLint(pattern) {
    return printAndExitOnErrors(async () => {
      if (prelint) {
        await execa.shell(prelint, { stdio: 'inherit' });
      }

      console.log(`running es lint on ${pattern}`);

      return eslint({
        pattern,
        options: {
          cache: true,
          cacheLocation: 'target/.eslintcache',
          fix: cliArgs.fix,
          formatter: cliArgs.format,
        },
      });
    });
  }
});

function groupFilesByType(fileList) {
  return fileList.reduce(
    (files, filename) => {
      if (isStyleFile(filename)) {
        files.styleFiles.push(filename);
      } else if (isTypescriptFile(filename)) {
        files.tsFiles.push(filename);
      } else if (isJavascriptFile(filename)) {
        files.jsFiles.push(filename);
      }
      return files;
    },
    { jsFiles: [], tsFiles: [], styleFiles: [] },
  );
}

function isJavascriptFile(filename) {
  return filename.endsWith('.js');
}

function isTypescriptFile(filename) {
  return filename.endsWith('.ts') || filename.endsWith('.tsx');
}

function isStyleFile(filename) {
  return (
    filename.endsWith('.css') ||
    filename.endsWith('.scss') ||
    filename.endsWith('.less')
  );
}
