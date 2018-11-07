// Assign env vars before requiring anything so that it is available to all files
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const { createRunner } = require('haste-core');
const parseArgs = require('minimist');
const LoggerPlugin = require('../plugins/haste-plugin-yoshi-logger');
const globs = require('yoshi-config/globs');
const path = require('path');
const { STATS_FILE } = require('yoshi-config/paths');
const {
  runIndividualTranspiler,
  petriSpecsConfig,
  clientProjectName,
  isAngularProject,
  clientFilesPath,
} = require('yoshi-config');
const {
  watchMode,
  isTypescriptProject,
  isBabelProject,
  shouldExportModule,
  shouldRunWebpack,
  shouldRunLess,
  shouldRunSass,
} = require('yoshi-helpers');
const { printAndExitOnErrors } = require('../error-handler');

const runner = createRunner({
  logger: new LoggerPlugin(),
});

const shouldWatch = watchMode();
const cliArgs = parseArgs(process.argv.slice(2));

module.exports = runner.command(
  async tasks => {
    if (shouldWatch) {
      return;
    }

    const { less, clean, copy, sass, webpack, typescript } = tasks;

    const migrateScopePackages =
      tasks[require.resolve('../tasks/migrate-to-scoped-packages')];
    const wixUpdateNodeVersion =
      tasks[require.resolve('../tasks/update-node-version')];
    const babel = tasks[require.resolve('../tasks/babel')];
    const wixPetriSpecs = tasks[require.resolve('../tasks/petri-specs')];
    const wixMavenStatics = tasks[require.resolve('../tasks/maven-statics')];
    const wixDepCheck = tasks[require.resolve('../tasks/dep-check')];
    const ngAnnotate = tasks[require.resolve('../tasks/ng-annotate')];

    await Promise.all([
      clean({ pattern: `{dist,target}/*` }),
      wixUpdateNodeVersion({}, { title: 'update-node-version', log: false }),
      migrateScopePackages(
        {},
        { title: 'scope-packages-migration', log: false },
      ),
      printAndExitOnErrors(() =>
        wixDepCheck({}, { title: 'dep-check', log: false }),
      ),
    ]);

    const useEsTarget = shouldExportModule();

    await Promise.all([
      printAndExitOnErrors(() =>
        transpileJavascript({ esTarget: useEsTarget }).then(() =>
          transpileNgAnnotate(),
        ),
      ),
      ...transpileCss({ esTarget: useEsTarget }),
      ...copyAssets({ esTarget: useEsTarget }),
      bundle(),
      printAndExitOnErrors(() =>
        wixPetriSpecs(
          { config: petriSpecsConfig },
          { title: 'petri-specs', log: false },
        ),
      ),
      wixMavenStatics(
        {
          clientProjectName,
          staticsDir: clientFilesPath,
        },
        { title: 'maven-statics', log: false },
      ),
    ]);

    function bundle() {
      const configPath = require.resolve('../../config/webpack.config.client');
      const productionCallbackPath = require.resolve(
        '../webpack-production-callback',
      );
      const debugCallbackPath = require.resolve('../webpack-debug-callback');
      const webpackConfig = require(configPath)();

      const defaultOptions = {
        configPath,
      };

      const webpackProduction = () => {
        return printAndExitOnErrors(() =>
          webpack(
            {
              ...defaultOptions,
              callbackPath: productionCallbackPath,
              statsFilename: cliArgs.stats ? STATS_FILE : false,
              configParams: {
                isDebug: false,
                isAnalyze: cliArgs.analyze,
                withLocalSourceMaps: cliArgs['source-map'],
              },
            },
            { title: 'webpack-production' },
          ),
        );
      };

      const webpackDebug = () => {
        return printAndExitOnErrors(() =>
          webpack(
            {
              ...defaultOptions,
              callbackPath: debugCallbackPath,
              configParams: {
                isDebug: true,
                withLocalSourceMaps: cliArgs['source-map'],
              },
            },
            { title: 'webpack-debug' },
          ),
        );
      };

      if (shouldRunWebpack(webpackConfig)) {
        if (cliArgs.min === false) {
          return webpackDebug();
        }

        return Promise.all([webpackProduction(), webpackDebug()]);
      }

      return Promise.resolve();
    }

    function copyServerAssets({ esTarget } = {}) {
      return copy(
        {
          pattern: [
            `${globs.base}/assets/**/*`,
            `${globs.base}/**/*.{ejs,html,vm}`,
            `${globs.base}/**/*.{css,json,d.ts}`,
          ],
          target: globs.dist({ esTarget }),
        },
        { title: 'copy-server-assets', log: false },
      );
    }

    function copyLegacyAssets() {
      return copy(
        {
          pattern: [
            `${globs.assetsLegacyBase}/assets/**/*`,
            `${globs.assetsLegacyBase}/**/*.{ejs,html,vm}`,
          ],
          target: 'dist/statics',
        },
        { title: 'copy-static-assets-legacy', log: false },
      );
    }

    function copyStaticAssets() {
      return copy(
        {
          pattern: [`assets/**/*`, `**/*.{ejs,html,vm}`],
          source: globs.assetsBase,
          target: 'dist/statics',
        },
        { title: 'copy-static-assets', log: false },
      );
    }

    function copyAssets({ esTarget } = {}) {
      return [
        copyServerAssets(),
        esTarget && copyServerAssets({ esTarget }),
        copyLegacyAssets(),
        copyStaticAssets(),
      ].filter(Boolean);
    }

    function transpileSass({ esTarget } = {}) {
      return printAndExitOnErrors(() =>
        sass({
          pattern: globs.scss,
          target: globs.dist({ esTarget }),
          options: {
            includePaths: ['node_modules', 'node_modules/compass-mixins/lib'],
          },
        }),
      );
    }

    function transpileLess({ esTarget } = {}) {
      return printAndExitOnErrors(() =>
        less({
          pattern: globs.less,
          target: globs.dist({ esTarget }),
          options: { paths: ['.', 'node_modules'] },
        }),
      );
    }

    function transpileCss({ esTarget } = {}) {
      const result = [];
      if (shouldRunSass()) {
        result.push(
          ...[transpileSass(), esTarget && transpileSass({ esTarget })],
        );
      }
      if (shouldRunLess()) {
        result.push(
          ...[transpileLess(), esTarget && transpileLess({ esTarget })],
        );
      }
      return result.filter(Boolean);
    }

    function transpileNgAnnotate() {
      if (isAngularProject) {
        return ngAnnotate(
          {
            pattern: path.join(globs.dist(), globs.base, '**', '*.js'),
            target: './',
          },
          { title: 'ng-annotate' },
        );
      }
    }

    function transpileJavascript({ esTarget } = {}) {
      const transpilations = [];

      if (isTypescriptProject() && runIndividualTranspiler) {
        transpilations.push(
          typescript({
            project: 'tsconfig.json',
            rootDir: '.',
            outDir: globs.dist({ esTarget }),
            ...(esTarget ? { module: 'es2015' } : {}),
          }),
        );
        if (esTarget) {
          transpilations.push(
            typescript({
              project: 'tsconfig.json',
              rootDir: '.',
              outDir: globs.dist({ esTarget: false }),
              module: 'commonjs',
            }),
          );
        }
      } else if (isBabelProject() && runIndividualTranspiler) {
        transpilations.push(
          babel(
            {
              pattern: globs.babel,
              target: globs.dist({ esTarget }),
            },
            {
              title: 'babel',
            },
          ),
        );
        if (esTarget) {
          transpilations.push(
            babel({
              pattern: globs.babel,
              target: globs.dist({ esTarget: false }),
              plugins: [
                require.resolve('@babel/plugin-transform-modules-commonjs'),
              ],
            }),
          );
        }
      }

      return Promise.all(transpilations);
    }
  },
  { persistent: !!cliArgs.analyze },
);
