const fs = require('fs');
const globby = require('globby');
const { envs } = require('./constants');
const globs = require('../yoshi-config/globs');

module.exports = {
  globalSetup: require.resolve('jest-environment-yoshi-puppeteer/globalSetup'),
  globalTeardown: require.resolve(
    'jest-environment-yoshi-puppeteer/globalTeardown',
  ),
  projects: [
    ...[
      {
        displayName: 'spec',
        testEnvironment: 'jsdom',
        testURL: 'http://localhost',
        testMatch: [`<rootDir>/${globs.unitTests}`],
      },
      {
        displayName: 'e2e',
        testEnvironment: require.resolve('jest-environment-yoshi-puppeteer'),
        testMatch: [`<rootDir>/${globs.e2eTests}`],
        setupFiles: [
          require.resolve(
            'jest-environment-yoshi-bootstrap/environment-setup.js',
          ),
        ],
      },
    ]
      .filter(({ displayName }) => {
        if (envs) {
          return envs.includes(displayName);
        }

        return true;
      })
      .map(project => {
        const [setupTestsPath] = globby.sync(
          `test/setup.${project.displayName}.(ts|js){,x}`,
        );

        const setupTestsFile =
          setupTestsPath && fs.existsSync(setupTestsPath)
            ? `<rootDir>/${setupTestsPath}`
            : undefined;

        return {
          ...project,

          transformIgnorePatterns: ['/node_modules/(?!(.*?\\.st\\.css$))'],

          transform: {
            '^.+\\.jsx?$': require.resolve('babel-jest'),
            '^.+\\.tsx?$': require.resolve('ts-jest'),
            '\\.st.css?$': require.resolve('@stylable/jest'),
          },

          moduleNameMapper: {
            '^.+\\.(sass|scss)$': require.resolve('identity-obj-proxy'),
            '\\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|otf|eot|wav|mp3)$': require.resolve(
              './transforms/file',
            ),
          },

          setupTestFrameworkScriptFile: setupTestsFile,

          moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
        };
      }),
    // workaround for https://github.com/facebook/jest/issues/5866
    {
      displayName: 'dummy',
      testMatch: ['dummy'],
    },
  ],
};
