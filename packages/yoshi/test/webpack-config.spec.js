const { expect } = require('chai');
const retryPromise = require('retry-promise').default;
const fetch = require('node-fetch');
const {
  killSpawnProcessAndHisChildren,
} = require('../../../test-helpers/process');
const tp = require('../../../test-helpers/test-phases');
const fx = require('../../../test-helpers/fixtures');
const {
  insideTeamCity,
  teamCityArtifactVersion,
  noArtifactVersion,
} = require('../../../test-helpers/env-variables');
const { createCommonWebpackConfig } = require('../config/webpack.config');

const config = createCommonWebpackConfig({ isDebug: true });

describe('Webpack basic configs', () => {
  let res, test;

  beforeEach(() => {
    test = tp.create().setup({
      'src/config.js': '',
      'src/client.js': `const aClientFunction = require('./dep');`,
      'src/dep.js': 'module.exports = function(a){ return 1; }',
      'package.json': fx.packageJson(),
      'pom.xml': fx.pom(),
    });
  });

  afterEach(() => test.teardown());

  describe('Common configurations', () => {
    describe('Basic flow', () => {
      beforeEach(() => {
        res = test.execute('build', [], insideTeamCity);
      });

      it('should exit with exit code 0 on success', () =>
        expect(res.code).to.equal(0));

      it('should have a context ./src and output to ./dist', () =>
        // client.js
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'const aClientFunction',
        ));

      it('should resolve modules relatively to current context', () =>
        // in webpack config: resolve.modules to be the same as context
        // in project itself: require('dep')

        // dep.js
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'function (a) {\n  return 1;\n}',
        ));

      // it('should display webpack stats with colors', () => {
      //   expect(require('chalk').stripColor(res.stdout)).not.equal(res.stdout);
      // });

      it('should generate source maps', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          '//# sourceMappingURL=app.bundle.js.map',
        );
        expect(test.list('dist/statics/')).to.contain('app.bundle.js.map');
      });

      it('should generate filenames comments for each module', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          '!*** ./dep.js ***!',
        );
        expect(test.content('dist/statics/app.bundle.min.js')).not.to.contain(
          '!*** ./dep.js ***!',
        );
      });
    });

    it(`should look for loaders in project's node_modules directory`, () =>
      expect(config.resolveLoader.modules).to.contain('node_modules'));

    describe('Custom configurations per project', () => {
      it('should ignore externals from being bundled when externals config emerges', () => {
        res = test
          .setup({
            'src/client.js': `const aClientFunction = require('react');`,
            'package.json': fx.packageJson({
              externals: {
                react: 'React',
              },
            }),
          })
          .execute('build');

        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'module.exports = React;',
        );
      });
    });
  });

  describe('Client configurations', () => {
    it('should have a default entry point ./client.js and output client.js', () => {
      test
        .setup({
          'src/client.js': 'const some = 1',
        })
        .execute('build');

      expect(test.content('dist/statics/app.bundle.js')).to.contain(
        'const some',
      );
    });

    it('should set chunk filename', () => {
      test
        .setup({
          'src/client.js': `require.ensure('./tmp', function(){}, 'tmp');`,
          'src/tmp.js': `var x = '(^_^)';`,
        })
        .execute('build');

      expect(test.list('dist/statics/')).to.contain('tmp.chunk.js');
    });

    describe('public path', () => {
      const ARTIFACT_VERSION = '1.2.3-SNAPSHOT';

      it('should construct the public path according to pom.xml "artifactId" and ARTIFACT_VERSION environment variable', () => {
        test
          .setup({
            'src/client.js': `console.log('test');`,
            'pom.xml': fx.pom(),
          })
          .execute('build', [], {
            ...insideTeamCity,
            ARTIFACT_VERSION,
          });

        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          `__webpack_require__.p = "https://static.parastorage.com/services/app-id/1.2.3/"`,
        );
      });

      it('should use "/" for default public path', () => {
        test
          .setup({
            'src/client.js': `console.log('test');`,
          })
          .execute('build', [], {
            ARTIFACT_VERSION: '',
          });

        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          `__webpack_require__.p = "/"`,
        );
      });

      it('should use local dev-server url for public path on local dev environment', () => {
        test.spawn('start');

        return fetchClientBundle({ port: 3200, file: 'app.bundle.js' }).then(
          bundle =>
            expect(bundle).to.contain(
              '__webpack_require__.p = "http://localhost:3200/"',
            ),
        );
      });

      // we'll need to uncomment the strategy from `webpack.config.client.js` before we can unskip this test
      // eslint-disable-next-line
      it.skip('should construct the public path according to the package name and version when "unpkg" set to true on package.json', () => {
        test
          .setup({
            'src/client.js': `console.log('test');`,
            'package.json': JSON.stringify({
              name: 'my-package',
              version: '2.3.4',
              unpkg: true,
            }),
          })
          .execute('build', [], {
            ...insideTeamCity,
            ARTIFACT_VERSION,
          });

        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          `__webpack_require__.p = "https://static.parastorage.com/unpkg/my-package@2.3.4/dist/statics"`,
        );
      });

      it('should prepend dynamic public path (AKA __webpack_public_path__)', () => {
        test
          .setup({
            'src/image.jpg': '(^_^)'.repeat(2500),
            'src/client.js': `const img = require('./image.jpg');`,
          })
          .execute('build');

        const content = test.content('dist/statics/app.bundle.js');
        const value = `typeof window !== 'undefined' && window.__STATICS_BASE_URL__ || __webpack_require__.p;`;

        // Make sure it was the last override of __webpack_require__.p
        expect(
          content
            .split('__webpack_require__.p = ')
            .pop()
            .indexOf(value),
        ).to.equal(0);
        expect(content).to.contain(
          'module.exports = __webpack_require__.p + "assets/image.jpg?',
        );
      });
    });
  });

  describe('TPA style plugin', () => {
    it('Should apply tpa style plugin', () => {
      test
        .setup({
          'src/client.js': `require('./style.css')`,
          'src/style.css': `.foo{color: "color(color-1)"; background: red;}`,
          'package.json': fx.packageJson({
            enhancedTpaStyle: true,
          }),
        })
        .execute('build');

      const css = test.content('dist/statics/app.css');
      expect(css).not.to.contain('"color(color-1)"');
    });
  });

  describe('Case sensitive plugin', () => {
    it('Should fail on wrong file referance casing not matching', () => {
      const res = test
        .setup({
          'src/client.js': `require('./casesensivitetest')`,
          'src/caseSensiviteTest.js': `return true;`,
        })
        .execute('build');

      expect(res.code).to.equal(1);
    });
  });

  describe('DefinePlugin configuration', () => {
    it('Should replace window.__CI_APP_VERSION__ with the current CI Artifact version', () => {
      const res = test
        .setup({
          'src/client.js': `const foo = window.__CI_APP_VERSION__;`,
        })
        .execute('build', [], teamCityArtifactVersion);

      expect(res.code).to.equal(0);
      expect(test.content('dist/statics/app.bundle.js')).to.contain('"1.0.0"');
    });

    it('Should default to 0.0.0 when not in CI', () => {
      const res = test
        .setup({
          'src/client.js': `const foo = window.__CI_APP_VERSION__;`,
        })
        .execute('build', [], noArtifactVersion);

      expect(res.code).to.equal(0);
      expect(test.content('dist/statics/app.bundle.js')).to.contain('"0.0.0"');
    });
  });

  describe('Module concatenation plugin', () => {
    let child;

    afterEach(() => killSpawnProcessAndHisChildren(child));

    beforeEach(() => {
      test.setup({
        'src/client.js': `import dep from './dep.js'`,
        'src/dep.js': 'export default function dep() { return 1 }',
        'package.json': fx.packageJson(),
      });
    });

    it('should enable scope hoisting by default', () => {
      test.execute('build', [], {});

      expect(test.content('./dist/statics/app.bundle.js')).to.contain(
        'CONCATENATED MODULE',
      );
    });

    it('should disable scope hoisting when DISABLE_MODULE_CONCATENATION is set', () => {
      test.execute('build', [], {
        DISABLE_MODULE_CONCATENATION: 'true',
      });

      expect(test.content('./dist/statics/app.bundle.js')).to.not.contain(
        'CONCATENATED MODULE',
      );
    });

    it('should disable scope hoisting when running start (development bundle)', () => {
      child = test.spawn('start');

      return fetchClientBundle({ port: 3200, file: 'app.bundle.js' }).then(
        bundle => expect(bundle).to.not.contain('CONCATENATED MODULE'),
      );
    });
  });

  describe('Performance budget', () => {
    it('should fail the build when exceeding the given max bundle size', () => {
      const maxSize = 10;
      const expectedOutput = `The following entrypoint(s) combined asset size exceeds the recommended limit (${maxSize} bytes)`;
      res = test
        .setup({
          'package.json': fx.packageJson({
            performance: {
              maxEntrypointSize: maxSize,
              hints: 'error',
            },
          }),
        })
        .execute('build');

      expect(res.code, 'Build error code should be 1').to.equal(1);
      expect(
        res.stdout,
        'build output should show the webpack perf budget error',
      ).to.contain(expectedOutput);
    });
  });

  describe('Uglify', () => {
    it('should not mangle class names with the keepFunctionNames option', () => {
      const test = tp.create().setup({
        'src/client.js': `export default class LongClassName {};`,
        'pom.xml': fx.pom(),
        'package.json': fx.packageJson({
          keepFunctionNames: true,
        }),
      });
      test.execute('build', [], insideTeamCity);

      expect(test.content('dist/statics/app.bundle.min.js')).to.contain(
        'class LongClassName',
      );
      test.teardown();
    });

    it('should mangle class names by default', () => {
      const test = tp.create().setup({
        'src/client.js': `export default class LongClassName {};`,
        'pom.xml': fx.pom(),
        'package.json': fx.packageJson(),
      });
      test.execute('build', [], insideTeamCity);

      expect(test.content('dist/statics/app.bundle.min.js')).not.to.contain(
        'class LongClassName',
      );
      test.teardown();
    });

    it('should not mangle function names with the keepFunctionNames option', () => {
      const test = tp.create().setup({
        'src/client.js': `export default function LongFunctionName() {};`,
        'pom.xml': fx.pom(),
        'package.json': fx.packageJson({
          keepFunctionNames: true,
        }),
      });
      test.execute('build', [], insideTeamCity);

      expect(test.content('dist/statics/app.bundle.min.js')).to.contain(
        'function LongFunctionName',
      );
      test.teardown();
    });

    it('should mangle function names by default', () => {
      const test = tp.create().setup({
        'src/client.js': `export default function LongFunctionName() {};`,
        'pom.xml': fx.pom(),
        'package.json': fx.packageJson(),
      });
      test.execute('build', [], insideTeamCity);

      expect(test.content('dist/statics/app.bundle.min.js')).not.to.contain(
        'function LongFunctionName',
      );
      test.teardown();
    });
  });
});

function fetchClientBundle({
  backoff = 100,
  max = 10,
  port = fx.defaultServerPort(),
  file = '',
} = {}) {
  return retryPromise({ backoff, max }, () =>
    fetch(`http://localhost:${port}/${file}`).then(res => res.text()),
  );
}
