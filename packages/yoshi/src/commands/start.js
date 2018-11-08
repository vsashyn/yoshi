// Assign env vars before requiring anything so that it is available to all files
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const parseArgs = require('minimist');

const cliArgs = parseArgs(process.argv.slice(2), {
  boolean: ['with-tests'],
});

if (cliArgs.production) {
  // run start with production configuration
  process.env.BABEL_ENV = 'production';
  process.env.NODE_ENV = 'production';
}

const { createRunner } = require('haste-core');
const path = require('path');
const crossSpawn = require('cross-spawn');
const LoggerPlugin = require('../plugins/haste-plugin-yoshi-logger');
const {
  clientFilesPath,
  servers,
  entry,
  defaultEntry,
  hmr,
  liveReload,
  petriSpecsConfig,
  clientProjectName,
} = require('yoshi-config');
const globs = require('yoshi-config/globs');
const {
  isTypescriptProject,
  isBabelProject,
  shouldRunLess,
  shouldRunSass,
  shouldTransformHMRRuntime,
  suffix,
  watch,
  isProduction,
} = require('yoshi-helpers');
const { debounce } = require('lodash');
const wixAppServer = require('../tasks/app-server');
const openBrowser = require('react-dev-utils/openBrowser');

const runner = createRunner({
  logger: new LoggerPlugin(),
});

const addJsSuffix = suffix('.js');
const shouldRunTests = cliArgs['with-tests'] === true;
const debugPort = cliArgs.debug;
const debugBrkPort = cliArgs['debug-brk'];
const entryPoint = addJsSuffix(cliArgs['entry-point'] || 'index.js');

module.exports = runner.command(
  async tasks => {
    const { sass, less, copy, clean, typescript } = tasks;

    const wixCdn = tasks[require.resolve('../tasks/cdn')];
    const babel = tasks[require.resolve('../tasks/babel')];
    const migrateScopePackages =
      tasks[require.resolve('../tasks/migrate-to-scoped-packages')];
    const wixUpdateNodeVersion =
      tasks[require.resolve('../tasks/update-node-version')];
    const wixPetriSpecs = tasks[require.resolve('../tasks/petri-specs')];
    const wixMavenStatics = tasks[require.resolve('../tasks/maven-statics')];

    const appServer = async () => {
      if (cliArgs.server === false) {
        return;
      }

      return wixAppServer(
        {
          entryPoint,
          debugPort,
          debugBrkPort,
          manualRestart: cliArgs['manual-restart'],
        },
        { title: 'app-server' },
      );
    };

    await Promise.all([
      clean({ pattern: `{dist,target}/*` }),
      wixUpdateNodeVersion({}, { title: 'update-node-version', log: false }),
      migrateScopePackages(
        {},
        { title: 'scope-packages-migration', log: false },
      ),
    ]);

    const ssl = cliArgs.ssl || servers.cdn.ssl;

    const [localUrlForBrowser] = await Promise.all([
      transpileJavascriptAndRunServer(),
      ...transpileCss(),
      copy(
        {
          pattern: [
            `${globs.base}/assets/**/*`,
            `${globs.base}/**/*.{ejs,html,vm}`,
            `${globs.base}/**/*.{css,json,d.ts}`,
          ],
          target: 'dist',
        },
        { title: 'copy-server-assets', log: false },
      ),
      copy(
        {
          pattern: [
            `${globs.assetsLegacyBase}/assets/**/*`,
            `${globs.assetsLegacyBase}/**/*.{ejs,html,vm}`,
          ],
          target: 'dist/statics',
        },
        { title: 'copy-static-assets-legacy', log: false },
      ),
      copy(
        {
          pattern: [`assets/**/*`, `**/*.{ejs,html,vm}`],
          source: globs.assetsBase,
          target: 'dist/statics',
        },
        { title: 'copy-static-assets', log: false },
      ),
      wixCdn(
        {
          port: servers.cdn.port,
          host: '0.0.0.0',
          ssl,
          publicPath: servers.cdn.url,
          statics: clientFilesPath,
          webpackConfigPath: require.resolve(
            '../../config/webpack.config.client',
          ),
          configuredEntry: entry,
          defaultEntry: defaultEntry,
          hmr,
          liveReload,
          transformHMRRuntime: shouldTransformHMRRuntime(),
        },
        { title: 'cdn' },
      ),
      wixPetriSpecs(
        { config: petriSpecsConfig },
        { title: 'petri-specs', log: false },
      ),
      wixMavenStatics(
        {
          clientProjectName,
          staticsDir: clientFilesPath,
        },
        { title: 'maven-statics', log: false },
      ),
    ]);

    openBrowser(localUrlForBrowser);

    if (shouldRunTests && !isProduction()) {
      crossSpawn('npm', ['test', '--silent'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          WIX_NODE_BUILD_WATCH_MODE: 'true',
        },
      });
    }

    watch(
      {
        pattern: [
          `${globs.base}/assets/**/*`,
          `${globs.base}/**/*.{ejs,html,vm}`,
          `${globs.base}/**/*.{css,json,d.ts}`,
        ],
      },
      changed => copy({ pattern: changed, target: 'dist' }),
    );

    watch(
      {
        pattern: [
          `${globs.assetsLegacyBase}/assets/**/*`,
          `${globs.assetsLegacyBase}/**/*.{ejs,html,vm}`,
        ],
      },
      changed => copy({ pattern: changed, target: 'dist/statics' }),
    );

    watch(
      {
        pattern: [`assets/**/*`, `**/*.{ejs,html,vm}`],
        cwd: path.resolve(globs.assetsBase),
      },
      changed =>
        copy({
          pattern: changed,
          target: 'dist/statics',
          source: globs.assetsBase,
        }),
    );

    function transpileCss() {
      if (shouldRunSass()) {
        watch({ pattern: globs.scss }, changed =>
          sass({
            pattern: changed,
            target: 'dist',
            options: {
              includePaths: ['node_modules', 'node_modules/compass-mixins/lib'],
            },
          }),
        );
      }

      if (shouldRunLess()) {
        watch({ pattern: globs.less }, changed =>
          less({
            pattern: changed,
            target: 'dist',
            paths: ['.', 'node_modules'],
          }),
        );
      }

      return [
        !shouldRunSass()
          ? null
          : sass({
              pattern: globs.scss,
              target: 'dist',
              options: {
                includePaths: [
                  'node_modules',
                  'node_modules/compass-mixins/lib',
                ],
              },
            }),
        !shouldRunLess()
          ? null
          : less({
              pattern: globs.less,
              target: 'dist',
              paths: ['.', 'node_modules'],
            }),
      ].filter(a => a);
    }

    async function transpileJavascriptAndRunServer() {
      if (isTypescriptProject()) {
        await typescript({
          watch: true,
          project: 'tsconfig.json',
          rootDir: '.',
          outDir: './dist/',
        });

        await watch(
          { pattern: [path.join('dist', '**', '*.js'), 'index.js'] },
          debounce(appServer, 500, { maxWait: 1000 }),
        );

        return appServer();
      }

      if (isBabelProject()) {
        watch(
          { pattern: [path.join(globs.base, '**', '*.js{,x}'), 'index.js'] },
          async changed => {
            await babel({ pattern: changed, target: 'dist', sourceMaps: true });
            await appServer();
          },
        );

        await babel({
          pattern: [path.join(globs.base, '**', '*.js{,x}'), 'index.js'],
          target: 'dist',
          sourceMaps: true,
        });
        return appServer();
      }

      watch({ pattern: globs.babel }, appServer);

      return appServer();
    }
  },
  { persistent: true },
);
