const { runIndividualTranspiler, transpileTests } = require('yoshi-config');
const { isTypescriptProject } = require('../queries');

module.exports.setupRequireHooks = () => {
  if (runIndividualTranspiler) {
    if (isTypescriptProject()) {
      require('./ts-node-register');
    } else if (transpileTests) {
      require('./babel-register');
    }
  }
};
