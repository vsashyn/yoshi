const path = require('path');

const dist = 'dist';
const statics = path.join(dist, 'statics');
const esModulesDist = path.join(dist, 'es');
const test = 'test';
const base = `{app,src,bin,${test},testkit,stories}`;
const assetsLegacyBase = `{app,bin,${test},testkit,stories}`;
const assetsBase = 'src';

module.exports = {
  base,
  dist: ({ esTarget } = {}) => (esTarget ? esModulesDist : dist), // TODO - remove function
  assetsBase,
  assetsLegacyBase,
  statics,
  babel: [path.join(base, '**', '*.js{,x}'), 'index.js'],
  specs: `${base}/**/*.+(spec|it).+(js|ts){,x}`,
  e2eTests: '**/*.e2e.+(js|ts){,x}',
  unitTests: '**/*.spec.+(ts|js){,x}',
  testFilesWatch: [path.join(base, '**', '*.(ts|js){,x}'), 'index.js'],
  singleModule: {
    clientDist: statics,
  },
  multipleModules: {
    clientDist: dist,
  },
  less: [`${base}/**/*.less`, `!${base}/assets/**/*`],
  scss: [`${base}/**/*.scss`, `!${base}/assets/**/*`],
};
