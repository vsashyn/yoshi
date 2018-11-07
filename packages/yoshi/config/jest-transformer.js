const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
