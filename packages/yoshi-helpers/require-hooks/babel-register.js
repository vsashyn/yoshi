const { unprocessedModules } = require('yoshi-config');

require('@babel/register')({
  only: [unprocessedModules],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
