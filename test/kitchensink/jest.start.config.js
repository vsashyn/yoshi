module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/webpack.test.js', '**/hmr.test.js', '**/cdn.test.js'],
  testEnvironment: require.resolve('./startEnvironment'),
  transformIgnorePatterns: ['/node_modules/', '/test/'],
  globalSetup: require.resolve('./startGlobalSetup'),
  globalTeardown: require.resolve('./startGlobalTeardown'),
};
