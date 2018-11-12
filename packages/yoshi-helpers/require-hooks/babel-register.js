const { unprocessedModules } = require('yoshi-config');

require('@babel/register')({
  only: [unprocessedModules],
  babelrc: false,
  presets: [[require.resolve('babel-preset-yoshi')]],
});
