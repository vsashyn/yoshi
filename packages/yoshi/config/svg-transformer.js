const path = require('path');

module.exports = {
  process(src, filename) {
    const svgFilename = JSON.stringify(path.basename(filename));

    return `module.exports = {
        __esModule: true,
        default: ${svgFilename},
        ReactComponent: () => ${svgFilename},
      };`;
  },
};
