const expect = require('chai').expect;
const tp = require('../../../test-helpers/test-phases');
const fx = require('../../../test-helpers/fixtures');
const {
  outsideTeamCity,
  insideTeamCity,
  teamCityArtifactVersion,
} = require('../../../test-helpers/env-variables');
const {
  takePort,
  takePortFromAnotherProcess,
} = require('../../../test-helpers/http-helpers');
const { staticsDomain } = require('yoshi-helpers');

describe('Aggregator: Test', () => {
  describe('CDN Port', () => {
    let test;
    let server;
    let child;

    beforeEach(() => (test = tp.create()));
    afterEach(() => test.teardown());

    afterEach(done => {
      if (server) {
        server.close(() => {
          server = null;
          done();
        });
      } else {
        done();
      }
    });

    afterEach(done => {
      if (child) {
        child.on('exit', () => {
          done();
          child = null;
        });
        child.kill('SIGINT');
      } else {
        done();
      }
    });

    const executionOptions = port => ({
      'test/component.spec.js': 'it.only("pass", () => 1);',
      'test/some.e2e.js': `
        it("should write to body", () => {
          browser.ignoreSynchronization = true;
          browser.get("http://localhost:1337");
          expect(element(by.css("body")).getText()).toEqual("");
        });
      `,
      'package.json': fx.packageJson({
        servers: {
          cdn: {
            port,
          },
        },
      }),
    });

    it('should throw an error when CDN port is in use by another directory', async function() {
      const TEST_PORT = 3335;
      server = await takePort(TEST_PORT);
      const res = test
        .verbose()
        .setup(executionOptions(TEST_PORT))
        .execute('test', undefined, outsideTeamCity);

      expect(res.code).to.equal(1);
      expect(res.stderr).to.include(
        `port ${TEST_PORT} is already in use by another process`,
      );
    });

    it('should skip cdn startup when yoshi is already running in the same path', async function() {
      const TEST_PORT = 3336;
      test.setup(executionOptions(TEST_PORT));
      const testPath = test.tmp;
      child = await takePortFromAnotherProcess(testPath, TEST_PORT);
      const res = test.execute('test', undefined, outsideTeamCity);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.include(
        `cdn is already running on ${TEST_PORT}, skipping`,
      );
    });
  });

  describe('defaults', () => {
    let test;
    beforeEach(() => (test = tp.create()));
    afterEach(() => test.teardown());

    it('should pass with exit code 0 with mocha as default', function() {
      this.timeout(40000);
      const res = test
        .setup({
          'test/component.spec.js': 'it.only("pass", () => 1);',
          'protractor.conf.js': `
            const http = require("http");

            exports.config = {
              framework: "jasmine",
              specs: ["dist/test/**/*.e2e.js"],
              onPrepare: () => {
                const server = http.createServer((req, res) => {
                  const response = "<html><body><script src=http://localhost:3200/app.bundle.js></script></body></html>";
                  res.end(response);
                });

                return server.listen(1337);
              }
            };
          `,
          'dist/test/some.e2e.js': `
            it("should write to body", () => {
              browser.ignoreSynchronization = true;
              browser.get("http://localhost:1337");
              expect(element(by.css("body")).getText()).toEqual("");
            });
          `,
          'package.json': fx.packageJson(),
        })
        .execute('test', undefined, outsideTeamCity);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('1 passing');
      expect(res.stdout).to.contains('protractor');
      expect(res.stdout).to.contain('1 spec, 0 failures');
    });
  });

  describe('--protractor', () => {
    let test;
    beforeEach(() => (test = tp.create()));
    afterEach(() => test.teardown());
    it(`should run protractor with express that serves static files from client dep
        if protractor.conf is present, according to dist/test/**/*.e2e.js glob`, () => {
      const res = test
        .setup({
          'protractor.conf.js': fx.protractorConf({ cdnPort: 3200 }),
          'dist/test/some.e2e.js': `
            it("should write to body", () => {
              browser.ignoreSynchronization = true;
              browser.get("http://localhost:1337");
              expect(element(by.css("body")).getText()).toEqual("roy");
            });
          `,
          'node_modules/client/dist/app.bundle.js': `document.body.innerHTML = "roy";`,
          'package.json': fx.packageJson({ clientProjectName: 'client' }),
        })
        .execute('test', ['--protractor']);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contains('protractor');
      // note: we've setup a real integration, keep it in order
      // to see the full integration between server and client.
      expect(res.stdout).to.contain('1 spec, 0 failures');
    });

    it(`should use protractor-browser-logs and fail if there are any console errors on the browser`, () => {
      const res = test
        .setup({
          'protractor.conf.js': fx.protractorConf({ cdnPort: 3200 }),
          'dist/test/some.e2e.js': `
            it("should fail", () => {
              browser.ignoreSynchronization = true;
              browser.get("http://localhost:1337");
            });
          `,
          'node_modules/client/dist/app.bundle.js': `console.error('some-error')`,
          'package.json': fx.packageJson({ clientProjectName: 'client' }),
        })
        .execute('test', ['--protractor'], { PROTRACTOR_BROWSER_LOGS: 'true' });

      expect(res.code).to.equal(1);
      expect(res.stdout).to.contains('UNEXPECTED MESSAGE');
      expect(res.stdout).to.contain('1 spec, 1 failure');
    });

    it(`should not use protractor-browser-logs when FT is off`, () => {
      const res = test
        .setup({
          'protractor.conf.js': fx.protractorConf({ cdnPort: 3200 }),
          'dist/test/some.e2e.js': `
            it("should fail", () => {
              browser.ignoreSynchronization = true;
              browser.get("http://localhost:1337");
            });
          `,
          'node_modules/client/dist/app.bundle.js': `console.error('some-error')`,
          'package.json': fx.packageJson({ clientProjectName: 'client' }),
        })
        .execute('test', ['--protractor'], {
          PROTRACTOR_BROWSER_LOGS: 'false',
        });

      // Test should not fail although the `console.error`

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contains('protractor');
      expect(res.stdout).to.contain('1 spec, 0 failures');
    });

    it('should not run protractor if protractor.conf is not present', () => {
      const res = test
        .setup({
          'package.json': fx.packageJson(),
        })
        .execute('test', ['--protractor']);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.not.contains('protractor');
    });

    it('should support dynamic imports when running e2e tests in a CI build', () => {
      const project = test.setup({
        'package.json': fx.packageJson(
          {},
          {},
          {
            babel: {
              presets: [require.resolve('babel-preset-yoshi')],
            },
          },
        ),
        'pom.xml': fx.pom(),
        'protractor.conf.js': fx.protractorConf({ cdnPort: 3200 }),
        'src/client.js': `
            document.body.innerHTML = "Before";
            (async function () {
              await import("./dynamic");
            })();
          `,
        'src/dynamic.js': `
            document.body.innerHTML = "<h1>Dynamic</h1>";
          `,
        'test/e2e/some.e2e.js': `
            it('should succeed', async () => {
              browser.ignoreSynchronization = true;
              browser.get("http://localhost:1337");
              const until = protractor.ExpectedConditions;
              browser.wait(until.presenceOf(\$('h1')), 8000, 'Element taking too long to appear in the DOM');
              expect(element(by.css("body")).getText()).toEqual("Dynamic");
            });
          `,
      });

      const buildResponse = project.execute('build', [], {
        ...insideTeamCity,
        ...teamCityArtifactVersion,
      });

      expect(buildResponse.code).to.equal(0);
      expect(test.content('./dist/statics/app.bundle.min.js')).to.contain(
        staticsDomain,
      );

      const testResponse = project.execute('test', ['--protractor'], {
        ...insideTeamCity,
        ...teamCityArtifactVersion,
      });

      expect(testResponse.code).to.equal(0);
    }).timeout(30000);
  });

  describe('--jest', () => {
    describe('when passes', () => {
      const testSetup = {
        '__tests__/foo.js': `
              describe('Foo', () => {
                it('should return value', () => {
                  jest.mock('../foo');
                  const foo = require('../foo');
                  // foo is a mock function
                  foo.mockImplementation(() => 42);
                  expect(foo()).toBe(42);
                });

                it('should work with css', () => {
                  jest.mock('../bar');
                  const foo = require('../bar');
                  // foo is a mock function
                  foo.mockImplementation(() => 42);
                  expect(foo()).toBe(42);
                });

                it('should work with es modules', () => {
                  const baz = require('../baz').default;
                  expect(baz).toBe(1);
                });
              });
            `,
        '__tests__/styles.js': `
              it('pass stylable', () => {
                const style = require('./main.st.css').default;

                expect(style.someclass.indexOf('someclass') > -1).toBe(true);
                expect(style('root').className.indexOf('root') > -1).toBe(true);
              });
            `,
        '__tests__/separate-styles.js': `
                it('pass styles from node_modules', () => {
                  const style = require('pkg/main.st.css').default;
                  expect(style.someclass.indexOf('someclass') > -1).toBe(true);
                  expect(style('root').className.indexOf('root') > -1).toBe(true);
                });`,
        '__tests__/main.st.css': `
              .someclass {
                color: yellow;
            }`,
        '__tests__/svg.test.js': `
            import React from 'react';
            import imageUrl, { ReactComponent as Image } from '../assets/image.svg';

            it('should be able to import svg as a react component (reactComponent)', () => {
              expect(typeof Image).toBe('function');
            });

            it('should be able to import svg as a url (default)', () => {
              expect(typeof imageUrl).toBe('string');
            });
            `,
        'assets/image.svg':
          '<svg height="210" width="400"><path d="M150 0 L75 200 L225 200 Z" /></svg>',
        'foo.js': `
              const s = require('./foo.scss');
              module.exports = function() {
                const a = s.a;
              };`,
        'bar.js': `
              const s = require('./foo.scss');
              module.exports = function() {
                const a = s.a;
              };`,
        'baz.js': `export default 1;`,
        'foo.scss': `.a {.b {color: red;}}`,
        'node_modules/pkg/main.st.css': `
              .someclass {
                color: yellow;
              }`,
        'package.json': `{
              "name": "a",\n
              "jest": {
                "testURL": "http://localhost",
                "moduleNameMapper": {
                  ".scss$": "${require.resolve('identity-obj-proxy')}"
                }
              }
            }`,
      };

      let test, res;
      before(() => {
        test = tp.create();
        res = test.setup(testSetup).execute('test', ['--jest'], insideTeamCity);
      });

      after(() => test.teardown());

      it('should pass with exit code 0', () => {
        expect(res.code).to.equal(0);
      });

      it('should pass all tests', () => {
        expect(res.stderr).to.contain('7 passed, 7 total');
      });

      it('should not try to start cdn', () => {
        expect(res.stderr).to.not.contain('you are running e2e tests');
        expect(res.stderr).to.not.contain('cdn');
      });

      it('should work load jest configuration and work with css', () => {
        expect(res.stderr).to.not.contain('should work with css');
      });

      it('should use the right reporter when running inside TeamCity', () => {
        expect(res.stdout).to.contain('##teamcity[');
      });

      it('should transpile ES modules out of the box', () => {
        expect(res.stderr).to.not.contain('should work with es modules');
      });

      describe('stylable integration', () => {
        it('should support stylable', () => {
          expect(res.stderr).to.not.contain('pass stylable');
        });

        it('should load stylable files also from node_modules', () => {
          expect(res.stderr).to.not.contain('pass styles from node_modules');
        });
      });
    });

    it('should fail with exit code 1', () => {
      const test = tp.create();
      const res = test
        .setup({
          '__tests__/foo.js': `
            describe('Foo', () => {
              jest.mock('../foo');
              const foo = require('../foo');
              it('should return value', () => {
                // foo is a mock function
                foo.mockImplementation(() => 42);
                expect(foo()).toBe(41);
              });
            });
          `,
          'foo.js': `module.exports = function() {
              // some implementation;
            };`,
          'package.json': fx.packageJson(),
        })
        .execute('test', ['--jest']);

      expect(res.code).to.equal(1);
      expect(res.stderr).to.contain('1 failed');
      test.teardown();
    });

    it('should forward command-line arguments after/before "--jest" to jest bin', () => {
      const test = tp.create();
      const res = test
        .setup({
          '__tests__/foo.js': `test('foo', () => {})`,
          '__tests__/bar.js': `test('bar', () => {})`,
          'package.json': fx.packageJson(),
        })
        .execute('test', [
          '--listTests',
          '--jest',
          '__tests__/foo.js',
          '__tests__/bar.js',
        ]);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('/__tests__/foo.js');
      expect(res.stdout).to.contain('/__tests__/bar.js');
      test.teardown();
    });

    it('should output test coverage when --coverage is passed', () => {
      const test = tp.create();
      const res = test
        .setup({
          '__tests__/foo.js': `
            describe('Foo', () => {
              it('should return value', () => {});
            });
          `,
          'package.json': `{
            "name": "a",\n
            "jest": {
              "testEnvironment": "node"
            }
          }`,
        })
        .execute('test', ['--jest', '--coverage']);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain(
        'File      |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |',
      );
      test.teardown();
    });

    describe('puppeteer environment', () => {
      it('should pass with passing e2e tests', () => {
        const cdnPort = 3200;
        const serverPort = 3100;
        const e2eTestSampleText = 'Hello World!';

        const test = tp.create();
        const res = test
          .setup({
            'package.json': fx.packageJson(
              {
                servers: {
                  cdn: {
                    port: cdnPort,
                  },
                },
              },
              {},
              {
                jest: {
                  preset: 'jest-yoshi-preset',
                },
              },
            ),
            'index.js': `
              const http = require('http');
                const server = http.createServer((req, res) => {
                const response = "<html><body>${e2eTestSampleText}</body></html>";
                res.end(response);
              });
              server.listen(process.env.PORT);
            `,
            'jest-yoshi.config.js': `
              module.exports = {
                server: {
                  command: 'node index.js',
                  port: ${serverPort},
                },
              };
            `,
            'test/e2e/some.e2e.spec.js': `
              it('should succeed', async () => {
                await page.goto('http://localhost:${serverPort}');
                expect(await page.$eval('body', e => e.innerText)).toEqual('${e2eTestSampleText}');
              });
            `,
          })
          .execute('test', ['--jest']);

        expect(res.code).to.equal(0);
      });

      it('should support dynamic imports when running e2e tests in a CI build', () => {
        const cdnPort = 3200;
        const serverPort = 3100;

        const test = tp.create();
        const project = test.setup({
          'package.json': fx.packageJson(
            {
              servers: {
                cdn: {
                  port: cdnPort,
                },
              },
            },
            {},
            {
              babel: {
                presets: [require.resolve('babel-preset-yoshi')],
              },
              jest: {
                preset: 'jest-yoshi-preset',
              },
            },
          ),
          'pom.xml': fx.pom(),
          'src/client.js': `
            document.body.innerHTML = "Before";
            (async function () {
              await import("./dynamic");
            })();
          `,
          'src/dynamic.js': `
            document.body.innerHTML = "<h1>Dynamic</h1>";
          `,
          'index.js': `
            const http = require('http');

            const server = http.createServer((req, res) => {
              const response = "<html><body><script src=http://localhost:${cdnPort}/app.bundle.js></script></body></html>";
              res.end(response);
            });
            server.listen(process.env.PORT);
          `,
          'jest-yoshi.config.js': `
            module.exports = {
              server: {
                command: 'node index.js',
                port: ${serverPort},
              },
            };
          `,
          'test/e2e/some.e2e.spec.js': `
              it('should succeed', async () => {
                await page.goto('http://localhost:${serverPort}');
                await page.waitForSelector('h1');
                expect(await page.$eval('h1', e => e.innerText)).toEqual('Dynamic');
              });
            `,
        });

        const buildResponse = project.execute('build', [], {
          ...insideTeamCity,
          ...teamCityArtifactVersion,
        });

        expect(buildResponse.code).to.equal(0);
        expect(test.content('./dist/statics/app.bundle.min.js')).to.contain(
          staticsDomain,
        );

        const testResponse = project.execute('test', ['--jest'], {
          ...insideTeamCity,
          ...teamCityArtifactVersion,
        });

        expect(testResponse.code).to.equal(0);
      }).timeout(40000);
    });
  });

  describe('--mocha', () => {
    let test;
    let res;
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
    const audioExtensions = ['wav', 'mp3'];
    before(() => {
      test = tp.create();
      res = test
        .setup({
          ...setupMediaFilesExtensions(imageExtensions, 'image'),
          ...setupMediaFilesExtensions(audioExtensions, 'audio'),
          '.babelrc': `{"plugins": ["${require.resolve(
            '@babel/plugin-transform-modules-commonjs',
          )}"]}`,
          'test/mocha-setup.js': 'global.foo = 123',
          'src/getData1.graphql': 'query GetData1 { id, name }',
          'src/getData2.gql': 'query GetData2 { id, name }',
          'some/other.glob.js': `it("pass glob", () => { console.log('glob'); require('assert').equal(1, 1)});`,
          'test/some.spec.js': `
            const assert = require('assert');
            const css = require('../src/some.scss');
            const cssWithDefault = require('../src/some.scss').default;

            describe('Foo', () => {
              it("simply pass", () => 1);
            });

            describe('Bar', () => {
              it("pass with css", () => {
                assert.equal(css.hello, 'hello');
                console.log('passed with css');
              });
              it("pass with default css", () => {
                assert.equal(cssWithDefault.hello, 'hello');
                console.log('passed with default css');
              });
            });

            describe('graphql', () => {
              it("pass with graphql", () => {
                assert.equal(require('../src/getData1.graphql').kind, 'Document');
                console.log('passed with graphql');
              });
              it("pass with gql", () => {
                assert.equal(require('../src/getData2.gql').kind, 'Document');
                console.log('passed with gql');
              });
            });

            it("accept configuration file", () => {
              assert.equal(global.foo, 123);
              console.log('accepted configuration file');
            });
          `,
          'dist/statics/index.html': `hello world`,
          'dist/components/some.css': `.my-class {color: red}`,
          'dist/components/some.js': `require('./some.css');`,
          'dist/components/some.spec.js': `it("pass css", () => {require('./some'); console.log('passed css')});`,
          'node_modules/wix-style-react/src/index.js': 'export default 1',
          'test/some.js': `import x from 'wix-style-react/src'; export default x => x`,
          'test/some-babel.spec.js': `import identity from './some'; it("pass babel", () => console.log('passed babel'));`,
          'test/bla.e2e.js': `
            const assert = require('assert');
            const fetch = require('node-fetch');
            it("pass e2e", async () => {
              assert.equal((await (await fetch('http://localhost:3200/index.html')).text()).trim(), 'hello world')
              console.log('passed e2e');
            });`,
          'test/svg.spec.js': `
            import React from 'react';
            import imageUrl, { ReactComponent as Image } from '../assets/image.svg';
            import assert from 'assert';

            it.skip('should be able to import svg as a react component (reactComponent)', () => {
              assert.equal(typeof Image, 'function');
            });

            it.skip('should be able to import svg as a url (default)', () => {
              assert.equal(typeof imageUrl, 'string');
            });`,
          'assets/image.svg':
            '<svg height="210" width="400"><path d="M150 0 L75 200 L225 200 Z" /></svg>',
          'src/some.scss': '',
          'package.json': `{
            "name": "a",
            "yoshi": {
              "specs": {
                "node": "**/*.{glob,spec,e2e}.js"
              }
            }
          }`,
        })
        .execute('test', ['--mocha']);
    });
    after(() => test.teardown());

    it('should pass with exit code 0', () => {
      // the way we detect that Mocha runs is by using it.only,
      // jasmine does not expose such a property.
      expect(res.code).to.equal(0);
    });

    it('should mock scss/css files to always return a string as the prop name', function() {
      expect(res.stdout).to.contain('passed with css');
      expect(res.stdout).to.contain('passed with default css');
    });

    it('should mock image files to always return the file name', function() {
      imageExtensions.forEach(ext => {
        expect(res.stdout).to.contain(`passed ${ext} with mocha`);
      });
    });

    it('should mock audio files to always return the file name', function() {
      audioExtensions.forEach(ext => {
        expect(res.stdout).to.contain(`passed ${ext} with mocha`);
      });
    });

    it('should load graphql files', function() {
      expect(res.stdout).to.contain(`passed with graphql`);
      expect(res.stdout).to.contain(`passed with gql`);
    });

    it('should consider custom globs if configured', () => {
      expect(res.stdout).to.contain('glob');
    });

    it('should pass while requiring css', () => {
      expect(res.stdout).to.contain('passed css');
    });

    describe('with @babel/register', () => {
      it('should transpile both sources and specified 3rd party modules in runtime', () => {
        expect(res.stdout).to.contain('passed babel');
      });
    });

    it('should require "test/mocha-setup.js" configuration file', () => {
      expect(res.stdout).to.contain('accepted configuration file');
    });

    it('should run e2e tests using mocha', () => {
      expect(res.stdout).to.contain('passed e2e');
    });

    describe('with custom build', () => {
      let customTest;
      beforeEach(() => (customTest = tp.create()));
      afterEach(() => customTest.teardown());

      it('should fail with exit code 1', function() {
        this.timeout(60000);

        const res = customTest
          .setup({
            'test/some.spec.js': `it("fail", () => { throw new Error() });`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], outsideTeamCity);

        expect(res.code).to.be.above(0);
        expect(res.stdout).to.contain('1 failing');
      });

      it('should run specs from test/app/src by default', () => {
        const res = customTest
          .setup({
            'test/bla/comp.spec.js': `it("pass", () => 1);`,
            'app/bla/comp.spec.js': `it("pass", () => 1);`,
            'src/bla/comp.spec.js': `it("pass", () => 1);`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], outsideTeamCity);

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain('3 passing');
      });

      it('should use the right reporter when running inside TeamCity', () => {
        const res = customTest
          .setup({
            'test/some.spec.js': `it.only("pass", () => 1);`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], insideTeamCity);
        expect(res.stdout).to.contain('##teamcity[');
      });

      it('should use the right reporter when running outside TeamCity', () => {
        const res = customTest
          .setup({
            'test/some.spec.js': `it.only("pass", () => 1);`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], outsideTeamCity);

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain('▬▬▬▬▬▬▬▬▬▬▬▬▬');
      });

      it('should use a custom reporter when requested', () => {
        const res = customTest
          .setup({
            'test/some.spec.js': `it.only("pass", () => 1);`,
            'package.json': fx.packageJson(),
          })
          .execute(
            'test',
            ['--mocha'],
            Object.assign(
              {
                mocha_reporter: 'landing', //eslint-disable-line camelcase
              },
              outsideTeamCity,
            ),
          );

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain('✈');
      });

      it('should not transpile tests if `transpileTests` is `false`', () => {
        const res = customTest
          .setup({
            'test/bar.js': 'export default 5;',
            'test/some.spec.js': `import foo from './bar';`,
            'package.json': fx.packageJson({ transpileTests: false }),
            '.babelrc': JSON.stringify({ presets: ['yoshi'] }),
          })
          .execute('test', ['--mocha']);

        expect(res.code).to.equal(1);
        expect(res.stderr).to.match(/Unexpected (identifier|token)/);
      });

      it('should output test coverage when --coverage is passed', () => {
        const res = customTest
          .setup({
            'test/some.spec.js': `it.only("pass", () => 1);`,
            'package.json': fx.packageJson(),
          })
          .verbose()
          .execute('test', ['--mocha', '--coverage']);

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain(
          'All files |        0 |        0 |        0 |        0 |                   |',
        );
      });

      it('should not run webpack-dev-server (cdn) when there are no e2e tests', () => {
        const res = customTest
          .setup({
            'test/bla/comp.spec.js': `it("pass", () => 1);`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], outsideTeamCity);

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain('1 passing');
        expect(res.stdout).to.not.contain('cdn');
      });

      describe('with @babel/register', () => {
        it('should transpile explicitly configured externalUnprocessedModules', function() {
          const res = customTest
            .setup({
              '.babelrc': `{"plugins": ["${require.resolve(
                '@babel/plugin-transform-modules-commonjs',
              )}"]}`,
              'node_modules/my-unprocessed-module/index.js': 'export default 1',
              'test/some.js': `import x from 'my-unprocessed-module'; export default x => x`,
              'test/some.spec.js': `import identity from './some'; it.only("pass", () => 1);`,
              'package.json': `{
                "name": "a",
                "yoshi": {
                  "externalUnprocessedModules": ["my-unprocessed-module"]
                }
              }`,
            })
            .execute('test', ['--mocha'], outsideTeamCity);

          expect(res.code).to.equal(0);
          expect(res.stdout).to.contain('1 passing');
        });

        it('should transpile es modules w/o any configurations', () => {
          const res = customTest
            .setup({
              '.babelrc': '{}',
              'test/some.spec.js': `
              import assert from 'assert';
              it.only("pass", () => {
                assert.equal(1, 1);
              });
            `,
              'package.json': fx.packageJson(),
            })
            .execute('test', ['--mocha'], outsideTeamCity);

          expect(res.code).to.equal(0);
          expect(res.stdout).to.contain('1 passing');
        });
      });

      it('should run typescript tests with runtime compilation and force commonjs module system', () => {
        const res = customTest
          .setup({
            'tsconfig.json': fx.tsconfig(),
            'test/some.spec.ts': `import * as usageOfFS from 'fs'; it.only("pass", () => !!usageOfFS);`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], outsideTeamCity);

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain('1 passing');
      });

      it('should support dynamic imports syntax for node js', () => {
        const res = customTest
          .setup({
            'tsconfig.json': fx.tsconfig(),
            'test/foo.ts': `console.log('hello');`,
            'test/some.spec.ts': `it.only("pass", async () => { await import('./foo'); });`,
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--mocha'], outsideTeamCity);

        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain('1 passing');
        expect(res.stdout).to.contain('hello');
      });

      it('should not transpile tests if no tsconfig/.babelrc/babel configuration', () => {
        const res = customTest
          .setup({
            'test/some.js': 'export default x => x',
            'test/some.spec.js': `import identity from './some'; it.only("pass", () => 1);`,
            'package.json': `{
                "name": "a",\n
                "version": "1.0.4"
              }`,
          })
          .execute('test', ['--mocha']);

        expect(res.code).to.equal(1);
        expect(res.stderr).to.match(/Unexpected (identifier|token)/);
      });

      describe('stylable integration', () => {
        it('should transform stylable stylesheets', () => {
          const res = customTest
            .setup({
              'src/main.st.css': `
                .someclass {
                  color: yellow;
                }`,
              'src/style.spec.js': `
                const assert = require('assert');
                const style = require('./main.st.css').default;

                it('pass', () => {
                  assert.equal(style.someclass.indexOf('someclass') > -1, true);
                  assert.equal(style('root').className.indexOf('root') > -1, true);
                })`,
              'package.json': fx.packageJson(),
            })
            .execute('test', ['--mocha'], outsideTeamCity);

          expect(res.code).to.equal(0);
          expect(res.stdout).to.contain('1 passing');
        });
      });
    });
  });

  describe('--karma', function() {
    this.timeout(60000);
    let test;
    let res;

    before(() => {
      test = tp.create();

      // 'src/client.spec.js': `require('./foo.css'); it('pass', function () {expect(1).toBe(1);});`,
      //   'src/foo.css': '@import "bar/bar";',
      //   'node_modules/bar/bar.scss': '.bar{color:red}',
      //   'karma.conf.js': fx.karmaWithJasmine(),
      //   'package.json': fx.packageJson()
      res = test
        .setup({
          'karma.conf.js':
            'module.exports = { browsers: ["PhantomJS"], frameworks: ["jasmine"], plugins: [require("karma-jasmine"), require("karma-phantomjs-launcher")], files: ["a.js", "test.spec.js"], exclude: ["excluded.spec.js"]}',
          'test/karma-setup.js': 'console.log("setup karma")',
          'a.js': '"use strict";var a = 2; var b = 3;',
          // The file contains a require of 'fs' to make sure webpack takes care of it propertly
          'src/test.spec.js': `
            require('fs');
            it("pass result", function () { expect(1).toBe(1); });
          `,
          'src/test2.spec.js':
            'it("pass", function () { expect(1).toBe(1); });',
          'src/test1.spec.js':
            'it("pass", function () { expect(2).toBe(2); });',
          'some/other/app.glob.js':
            'it("pass", function () { expect(4).toBe(4); });',
          'some/other/app2.glob.js':
            'it("pass", function () { expect(5).toBe(5); });',
          'src/style.scss': `.a {.b {color: red;}}`,
          'src/client.js': `require('./style.scss'); module.exports = function (a) {return a + 1;};`,
          'src/client.spec.js': `
            const fakeExternalModule = require('fake-external-module');  const add1 = require('./client'); it('pass client', function () {expect(add1(1)).toBe(2);});
              it('pass style from node_modules', function () {require('./foo.css');});
          `,
          'src/foo.css': '@import "bar/bar";',
          'node_modules/bar/bar.scss': '.bar{color:red}',
          'excluded.spec.js': `
            it("pass excluded", function () { expect(1).toBe(1); console.log('passed excluded') });
          `,
          'package.json': fx.packageJson({
            separateCss: false,
            externals: {
              'fake-external-module': 'Array.prototype.map',
            },
          }),
          'pom.xml': fx.pom(),
        })
        .execute('test', ['--karma'], outsideTeamCity);
    });
    after(() => test.teardown());

    describe('with jasmine configuration', () => {
      it('should exit with code 0', () => {
        expect(res.code).to.equal(0);
        expect(res.stdout).to.contain(`Finished 'karma'`);
        expect(res.stdout).to.match(/Executed \d of \d SUCCESS/);
      });

      it('should load local karma config', () => {
        expect(res.stdout).to.not.contain('passed excluded');
      });

      describe('Specs Bundle', () => {
        it('should generate a bundle', () => {
          expect(test.content('dist/specs.bundle.js')).to.contain(
            'expect(1).toBe(1)',
          );
          expect(test.content('dist/specs.bundle.js')).to.contain(
            'expect(2).toBe(2)',
          );
        });

        it('should not include css into a specs bundle', () => {
          expect(test.content('dist/specs.bundle.js')).not.to.contain('.a .b');
        });

        it('should contain css modules inside specs bundle', () => {
          expect(res.stdout).to.not.contain('pass style from node_modules');
        });

        it('should bundle the "test/karma-setup.js" file as the first entry point if exists', () => {
          expect(test.content('dist/specs.bundle.js')).to.contain(
            'setup karma',
          );
        });

        it('should not bundle externals', () => {
          expect(test.content('dist/specs.bundle.js')).to.contain(
            'module.exports = Array.prototype.map;',
          );
        });
      });
    });

    describe('with custom build', () => {
      let customTest;
      beforeEach(() => (customTest = tp.create()));
      afterEach(() => customTest.teardown());

      it('should consider custom specs.browser globs if configured', () => {
        const res = test
          .setup({
            'some/other/app.glob.js':
              'it("pass", function () { expect(1).toBe(1); });',
            'some/other/app2.glob.js':
              'it("pass", function () { expect(2).toBe(2); });',
            'karma.conf.js': fx.karmaWithJasmine(),
            'pom.xml': fx.pom(),
            'package.json': fx.packageJson({
              specs: {
                browser: 'some/other/*.glob.js',
              },
            }),
          })
          .execute('test', ['--karma']);

        expect(res.code).to.equal(0);
        expect(res.cat().match(/Starting browser PhantomJS/g)).to.have.length(
          1,
        );
        expect(test.content('dist/specs.bundle.js')).to.contain(
          'expect(1).toBe(1)',
        );
        expect(test.content('dist/specs.bundle.js')).to.contain(
          'expect(2).toBe(2)',
        );
      });

      it('should allow import sass from node_modules', () => {
        const res = customTest
          .setup({
            'src/client.spec.js': `require('./foo.css'); it('pass', function () {expect(1).toBe(1);});`,
            'src/foo.css': '@import "bar/bar";',
            'node_modules/bar/bar.scss': '.bar{color:red}',
            'karma.conf.js': fx.karmaWithJasmine(),
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--karma']);

        expect(res.code).to.equal(0);
      });

      it('should support TPA style params', () => {
        const res = customTest
          .setup({
            'src/client.spec.js': `require('./foo.css'); it('pass', function () {expect(1).toBe(1);});`,
            'src/foo.css':
              '.foo{color: unquote("{{color-1}}");font: unquote("; {{body-m}}");font-size: 16px;}',
            'karma.conf.js': fx.karmaWithJasmine(),
            'package.json': fx.packageJson({
              tpaStyle: true,
            }),
          })
          .execute('test', ['--karma']);
        expect(res.code).to.equal(0);
      });

      it('should exit with code 1 in case webpack fails', () => {
        const res = customTest
          .setup({
            'src/client.spec.js': `require('./ballsack');`,
            'karma.conf.js': fx.karmaWithJasmine(),
            'package.json': fx.packageJson(),
          })
          .execute('test', ['--karma']);

        expect(res.code).to.equal(1);
        expect(res.stderr).to.contain(
          `Module not found: Error: Can't resolve './ballsack'`,
        );
        expect(res.stdout).not.to.contain(`Finished 'karma'`);
      });

      it('should fail with exit code 1', () => {
        const res = customTest
          .setup({
            'src/test.spec.js':
              'it("fail", function () { expect(1).toBe(2); });',
            'karma.conf.js': fx.karmaWithJasmine(),
            'package.json': fx.packageJson(),
            'pom.xml': fx.pom(),
          })
          .execute('test', ['--karma'], outsideTeamCity);

        expect(res.code).to.equal(1);
        expect(res.stdout).to.contain(`Failed 'karma'`);
        expect(res.stdout).to.contain('FAILED');
      });

      describe('with browser (chrome) configurations and stylable', () => {
        it('should pass with exit code 0, not run phantom and understand "st.css" files', () => {
          const res = customTest
            .setup({
              'src/test.spec.js':
                'require("./style.st.css"), it("pass", function () {});',
              'src/style.st.css': `
                .someclass {
                  color: yellow;
              }`,
              'karma.conf.js':
                'module.exports = {browsers: ["ChromeHeadless"], frameworks: ["mocha"], plugins: [require("karma-mocha"),	require("karma-chrome-launcher")]}',
              'package.json': fx.packageJson(),
            })
            .execute('test', ['--karma'], outsideTeamCity);

          expect(res.code).to.equal(0);
          expect(res.stdout).to.contain(`browser Chrome`);
          expect(res.stdout).to.not.contain(`browser PhantomJS`);
          expect(res.stdout).to.contain('Executed 1 of 1 SUCCESS');
          expect(customTest.content('dist/specs.bundle.js')).to.contain(
            'someclass',
          );
        });
      });

      describe('with mocha and chrome configuration', () => {
        it('should pass with exit code 0', () => {
          const res = customTest
            .setup(passingMochaTest())
            .execute('test', ['--karma'], outsideTeamCity);

          expect(res.code).to.equal(0);
          expect(res.stdout)
            .to.contain(`Finished 'karma'`)
            .and.contain('Executed 1 of 1 SUCCESS');
        });

        // very flaky test
        it.skip('should use appropriate reporter for TeamCity', () => {
          const res = customTest
            .setup(passingMochaTest())
            .execute('test', ['--karma'], insideTeamCity);

          expect(res.code).to.equal(0);
          expect(res.stdout)
            .to.contain(`Finished 'karma'`)
            .and.contain("##teamcity[testStarted name='should just pass'");
        });
      });
    });
  });

  describe('warnings', () => {
    let test;

    beforeEach(() => (test = tp.create()));
    afterEach(() => test.teardown());

    it('should show a warning when there are e2e tests but no bundle was located in dist/statics', () => {
      const res = test
        .setup({
          'test/test.e2e.js': 'it("should pass", () => {})',
          'package.json': fx.packageJson(),
        })
        .execute('test', ['--mocha']);

      expect(res.stderr).to.contain(
        `● Warning:\n\n   you are running e2e tests and doesn't have any bundle located in the statics directory`,
      );
    });
  });
});

function passingMochaTest() {
  return {
    'src/test.spec.js': `it('should just pass', function () {});`,
    'package.json': fx.packageJson(),
    'karma.conf.js':
      'module.exports = {browsers: ["Chrome"], frameworks: ["mocha"], plugins: [require("karma-mocha"),	require("karma-chrome-launcher")]}',
  };
}

function setupMediaFilesExtensions(extensions, type) {
  const files = extensions.reduce((result, ext) => {
    result[`src/some.${ext}`] = '';
    return result;
  }, {});

  return Object.assign({}, files, {
    [`src/${type}.spec.js`]: `
      const assert = require('assert');
      ${extensions
        .map(
          ext => `it("pass ${ext} with mocha", () => {
        assert.equal(require('./some.${ext}'), 'some.${ext}');
        console.log("passed ${ext} with mocha");
      })`,
        )
        .join(';')}
    `,
  });
}
