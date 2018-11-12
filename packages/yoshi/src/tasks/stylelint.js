const stylelint = require('stylelint');
const fs = require('fs');
const { codeFrameColumns } = require('@babel/code-frame');
const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');

module.exports = async ({ pattern, fix, formatter }) => {
  console.log(`running stylelint on ${chalk.magenta(pattern)}\n`);
  const { errored, output } = await stylelint.lint({
    fix,
    files: pattern,
    formatter: formatter || buildStringFromResult,
  });

  if (errored) {
    console.error(output);
    throw Error('stylelint found linting violations');
  }

  console.log(output);
  return output;
};

function formatLintIssue(sourceFile) {
  const source = fs.readFileSync(sourceFile, 'utf-8');

  return ({ line, column, severity, rule, text }) => {
    const messageWithoutRule = text.replace(` (${rule})`, '');
    const type =
      severity === 'warning'
        ? chalk.bgYellow.black(' WARNING ')
        : chalk.bgRed.white.bold(' ERROR ');

    const color = severity === 'warning' ? chalk.yellow : chalk.red;

    const ruleHeader = `(stylelint/${rule})`;
    const header = color(
      `● ${type} ${messageWithoutRule} ${chalk.grey(ruleHeader)}`,
    );
    const codeframe = codeFrameColumns(
      source,
      { start: { line, column } },
      { highlightCode: true, message: color(messageWithoutRule) },
    );

    return `${header}\n${codeframe}`;
  };
}

function formatFileResult(result) {
  const relativeSourcePath = path.relative(process.cwd(), result.source);
  const warningsOrErrors = result.warnings;
  const formattedErrors = _(warningsOrErrors)
    .sortBy(warningOrError => (warningOrError.severity === 'error' ? 0 : 1))
    .map(formatLintIssue(result.source))
    .value();

  const {
    warning: numberOfWarnings = 0,
    error: numberOfErrors = 0,
  } = _.countBy(result.warnings, x => x.severity);

  const tldr = [
    numberOfErrors > 0 && `🛑 ${numberOfErrors}`,
    numberOfWarnings > 0 && `⚠️  ${numberOfWarnings}`,
    numberOfWarnings + numberOfErrors > 0 && '  ',
  ]
    .filter(Boolean)
    .join(' ');

  const errorsAsString = formattedErrors.join('\n\n');
  const fileErrors =
    '  ' +
    tldr +
    chalk.reset(relativeSourcePath) +
    '\n\n' +
    chalk.reset(errorsAsString);

  return {
    numberOfErrors,
    numberOfWarnings,
    text: fileErrors,
    file: result.source,
  };
}

function createStats(fileResults) {
  return fileResults.reduce(
    ({ errors, warnings, files }, { numberOfErrors, numberOfWarnings }) => ({
      errors: numberOfErrors + errors,
      warnings: numberOfWarnings + warnings,
      files: files + (numberOfErrors + numberOfWarnings > 0 ? 1 : 0),
    }),
    { errors: 0, warnings: 0, files: 0 },
  );
}

function createErrorMessage(fileResults) {
  const stats = createStats(fileResults);
  if (stats.warnings + stats.errors < 1) return '';
  const desc = _([
    stats.errors <= 0 ? null : plural(stats.errors, 'error'),
    stats.warnings <= 0 ? null : plural(stats.warnings, 'warning'),
  ])
    .compact()
    .join(' and ');
  return `Found ${desc} across ${stats.files} files`;
}

function plural(num, word) {
  return num !== 1 ? `${num} ${word}s` : `1 ${word}`;
}

function buildStringFromResult(results) {
  const fileResults = results.map(formatFileResult);
  const errorMessage = createErrorMessage(fileResults);
  const reports = fileResults.map(x => x.text);

  return [...reports, errorMessage].join('\n\n');
}
