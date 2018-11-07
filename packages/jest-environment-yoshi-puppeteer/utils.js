const globby = require('globby');

const { MATCH_ENV } = process.env;

module.exports.shouldRunE2Es = async () => {
  const filesPaths = await globby('test/e2e/**/*.spec.(ts|js){,x}');

  return (
    filesPaths.length > 0 &&
    (!MATCH_ENV || MATCH_ENV.split(',').includes('e2e'))
  );
};
