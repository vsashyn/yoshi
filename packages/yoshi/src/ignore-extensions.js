const fs = require('fs');
const path = require('path');
const graphqlLoader = require('graphql-tag/loader');
const { noop } = require('lodash');
const { stylableModuleFactory } = require('@stylable/node');

const stylableToModule = stylableModuleFactory({
  fileSystem: fs,
  requireModule: require,
});

require.extensions['.css'] = mockCss;
require.extensions['.scss'] = mockCssModules;
require.extensions['.less'] = mockCssModules;

require.extensions['.graphql'] = loadGraphQLModules;
require.extensions['.gql'] = loadGraphQLModules;

require.extensions['.png'] = mockMediaModules;
require.extensions['.svg'] = mockSvg;
require.extensions['.jpg'] = mockMediaModules;
require.extensions['.jpeg'] = mockMediaModules;
require.extensions['.gif'] = mockMediaModules;

require.extensions['.wav'] = mockMediaModules;
require.extensions['.mp3'] = mockMediaModules;

function mockCss(module, filename) {
  return module.filename.endsWith('.st.css')
    ? mockStylable(module, filename)
    : mockCssModules(module);
}

function mockStylable(module, filename) {
  const source = fs.readFileSync(filename).toString();
  const code = stylableToModule(source, filename);
  return module._compile(code, filename);
}

function mockCssModules(module) {
  module.exports = conditionedProxy(name => name === 'default');
}

function conditionedProxy(predicate = () => {}) {
  return new Proxy(
    {},
    {
      get: (target, name) => (predicate(name) ? conditionedProxy() : name),
    },
  );
}

function loadGraphQLModules(module) {
  const query = fs.readFileSync(module.filename, 'utf-8');
  const scopedLoader = graphqlLoader.bind({ cacheable: noop });
  const output = scopedLoader(query);
  module.exports = eval(output); // eslint-disable-line no-eval
}

function mockMediaModules(module) {
  module.exports = path.basename(module.filename);
}

function mockSvg(module) {
  const svgFilename = JSON.stringify(path.basename(module.filename));

  module.exports = {
    __esModule: true,
    default: svgFilename,
    ReactComponent: () => svgFilename,
  };
}
