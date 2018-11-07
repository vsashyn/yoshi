module.exports = class WebpackEnvirnmentMarkPlugin {
  apply() {
    process.env.IN_WEBPACK = 'true';
  }
};
