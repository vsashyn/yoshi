const path = require('path');

const ROOT_DIR = process.cwd();

const resolvePath = (...args) => path.resolve(ROOT_DIR, ...args);

const SRC_DIR = resolvePath('src');
const BUILD_DIR = resolvePath('dist');
const TARGET_DIR = resolvePath('target');
const PUBLIC_DIR = path.join(SRC_DIR, 'assets');
const STATICS_DIR = path.join(BUILD_DIR, 'statics');
const ASSETS_DIR = path.join(STATICS_DIR, 'assets');

const POM_FILE = resolvePath('pom.xml');
const STATS_FILE = resolvePath(TARGET_DIR, 'webpack-stats.json');
const TSCONFIG_FILE = resolvePath('tsconfig.json');
const DOCKERFILE = resolvePath('Dockerfile');

module.exports = {
  ROOT_DIR,
  SRC_DIR,
  BUILD_DIR,
  TARGET_DIR,
  PUBLIC_DIR,
  STATICS_DIR,
  ASSETS_DIR,
  POM_FILE,
  STATS_FILE,
  TSCONFIG_FILE,
  DOCKERFILE,
};
