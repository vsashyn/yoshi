const tp = require('../../../test-helpers/test-phases');
const fx = require('../../../test-helpers/fixtures');
const expect = require('chai').expect;
const _ = require('lodash');
const getMockedCI = require('../../../test-helpers/get-mocked-ci');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function createAboveTheLimitFile() {
  return _.repeat('a', 10001);
}

function fileAboveTheLimit(name) {
  return `__webpack_require__.p + "assets/${name}`;
}

function installHaml(cwd) {
  fs.writeFileSync(
    cwd + '/Gemfile',
    "source 'https://rubygems.org'\ngem 'haml'",
  );
  spawnSync('bundle', ['config', 'path', cwd + '/.bundle'], { cwd });
  spawnSync('bundle', ['install'], { cwd });
}

describe('Loaders', () => {
  describe('[babel,svg,sass,less]-loaders with dependencies.angular and assets', () => {
    let test;
    let resp;
    const svgContent = '<svg><g><path fill="#EEEEEE"></path></g></svg>';
    const svgModule =
      'module.exports = "<svg><g><path fill=\\"#EEEEEE\\"></path></g></svg>"';

    before(() => {
      test = tp.create();
      resp = test
        .setup({
          'src/client.js': `
            let aServerFunction = 1;
            angular.module('fakeModule', []).config(function($javascript){});
            require('wix-style-react/src');
            require('./svgIcon.inline.svg');
            require('./some-css.scss');
            require('./some-less.less');
            require('./foo.css');
            require('./foo.css');
            require('./tiny-image.png');
            require('./largeImage.png');
            require('./img.png');
            require('./img.jpg');
            require('./img.jpeg');
            require('./img.gif');
            require('./font.ttf');
            require('./font.otf');
            require('./font.woff');
            require('./font.woff2');
            require('./font.eot');
            require('./beep.wav');
            require('./beep.mp3');`,
          'src/server.js': `
            require('./some-css.scss');
            require('./foo.css');`,
          'src/some-less.less': `// comment
            @import "./imported-less";
            @import "bar/baz.less";
            .less-rule { .child { color: gray; } }
            .tpa-rule {
              font: unquote("; {{body-l}}");
            }
            `,
          'src/imported-less.less': '.foo{appearance: none;}',
          'src/some-css.scss': `
            // comment
            @import "./foo/imported";
            @import "./tpa";
            @import "bar/bar";
            .other-rule { .child { color: red; } }
            @import "compass";
            .bar{color:brown}
            .some-rule { composes: foo from './composes.scss';}`,
          'src/foo/imported.scss': `
            .foo {appearance: smth; color: unquote("{{color-1}}")}`,
          'src/tpa.css':
            '.foo{color: unquote("{{color-3}}");font: unquote("; {{body-m}}");font-size: 16px;}',
          'src/foo.css': '.foo-rule { color: blue }',
          'src/composes.scss': `.foo{background: white;} // comments are only possible in sass`,
          'src/config.js': '',
          'src/svgIcon.inline.svg': svgContent,
          'node_modules/wix-style-react/src/index.js': 'let tpl = 1',
          'node_modules/bar/baz.less': '.bar{color:pink}',
          'node_modules/bar/bar.scss': '.bar{color:yellow}',
          'node_modules/compass-mixins/lib/_compass.scss': '',
          'src/tiny-image.png': 'some-content',
          'src/largeImage.png': createAboveTheLimitFile(),
          'src/img.png': createAboveTheLimitFile(),
          'src/img.jpg': createAboveTheLimitFile(),
          'src/img.jpeg': createAboveTheLimitFile(),
          'src/img.gif': createAboveTheLimitFile(),
          'src/font.ttf': createAboveTheLimitFile(),
          'src/font.otf': createAboveTheLimitFile(),
          'src/font.woff': createAboveTheLimitFile(),
          'src/font.woff2': createAboveTheLimitFile(),
          'src/font.eot': createAboveTheLimitFile(),
          'src/beep.wav': createAboveTheLimitFile(),
          'src/beep.mp3': createAboveTheLimitFile(),
          'babel.config.js': `
            module.exports = {
              "plugins": ["@babel/plugin-transform-block-scoping"]
            };
          `,
          'package.json': `{\n
            "name": "a",
            "dependencies": {\n
              "angular": "^1.5.0",\n
              "wix-style-react": "file:node_modules/wix-style-react"
            },
            "yoshi": {
              "tpaStyle": true
            }
          }`,
          'pom.xml': fx.pom(),
        })
        .execute('build', [], getMockedCI({ ci: false }));
    });
    after(() => test.teardown());

    it('should build w/o errors', () => {
      expect(resp.code).to.equal(0);
    });

    describe('babel-loader', () => {
      it('should apply ng-annotate loader on angular project', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          `.config(["$javascript", function ($javascript)`,
        );
      });
    });

    describe('SVG-inline-loader', () => {
      it('should run svg inline loader', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          svgModule,
        );
      });
    });

    describe('Sass', () => {
      describe('client', () => {
        it('should run sass and css loaders over imported .scss files', () => {
          expect(test.content('dist/statics/app.bundle.js')).to.match(
            /"other-rule":"some-css__other-rule__\w{5}",([\s\S]*?)"child":"some-css__child__\w{5}"/,
          );
        });

        it('should also expose css classes as camelcase', () => {
          expect(test.content('dist/statics/app.bundle.js')).to.match(
            /"otherRule":"some-css__other-rule__\w{5}"/,
          );
        });

        describe('postcss', () => {
          it('should apply auto-prefixer', () => {
            expect(test.content('dist/statics/app.css')).to.contain(
              '-webkit-appearance',
            );
          });
        });

        it('should allow import sass from node_modules', () => {
          expect(test.content('dist/statics/app.css')).to.contain(
            'color: yellow',
          );
        });

        it('should support compass', () => {
          expect(test.content('dist/statics/app.css')).to.contain(
            'color: brown',
          );
        });

        it('should support TPA style params', () => {
          expect(test.content('dist/statics/app.css')).to.contain(
            'font-size: 16px',
          );
          expect(test.content('dist/statics/app.css')).not.to.contain(
            'color-3',
          );
          expect(test.content('dist/statics/app.css')).not.to.contain('body-m');
        });

        it('should support TPA style params for less files', () => {
          expect(test.content('dist/statics/app.css')).not.to.contain('body-l');
        });

        describe('composes keyword', () => {
          it('should support nested sass imports when using "compose"', () => {
            expect(test.content('dist/statics/app.css')).to.contain(
              'background: white',
            );
            expect(test.content('dist/statics/app.bundle.js')).to.match(
              /"some-rule":"some-css__some-rule\w+ composes__foo\w+"/,
            );
          });
        });
      });

      describe('detach css', () => {
        it('should create an external app.css file with a source map', () => {
          expect(test.content('dist/statics/app.css')).to.match(/.\w+/);
          expect(test.content('dist/statics/app.css')).to.contain('color: red');
          expect(test.content('dist/statics/app.css')).to.contain(
            'color: blue',
          );
        });
      });
    });

    describe('Less', () => {
      describe('client', () => {
        it('should run less and css loaders over imported .less files', () => {
          expect(test.content('dist/statics/app.bundle.js')).to.match(
            /"less-rule":"some-less__less-rule__\w{5}",([\s\S]*?)"child":"some-less__child__\w{5}"/,
          );
        });

        it('should allow import less from node_modules', () => {
          expect(test.content('dist/statics/app.css')).to.contain(
            'color: pink',
          );
        });

        describe('postcss', () => {
          it('should apply auto-prefixer', () => {
            expect(test.content('dist/statics/app.css')).to.contain(
              '-webkit-appearance: none',
            );
          });

          it('should support source maps', () => {
            expect(test.content('dist/statics/app.css.map')).not.to.contain(
              '-webkit-appearance: "none"',
            );
          });
        });
      });
    });

    describe('Assets', () => {
      it('should embed image below 10kb as base64', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'data:image/png;base64,c29tZS1jb250ZW50Cg==',
        );
      });

      it('should write a separate image above 10kb', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          fileAboveTheLimit('largeImage.png'),
        );
      });

      it('should load images', () => {
        const content = test.content('dist/statics/app.bundle.js');
        expect(content).to.contain(fileAboveTheLimit('img.png'));
        expect(content).to.contain(fileAboveTheLimit('img.jpg'));
        expect(content).to.contain(fileAboveTheLimit('img.jpeg'));
        expect(content).to.contain(fileAboveTheLimit('img.gif'));
      });

      it('should load fonts', () => {
        const content = test.content('dist/statics/app.bundle.js');
        expect(content).to.contain(fileAboveTheLimit('font.ttf'));
        expect(content).to.contain(fileAboveTheLimit('font.woff'));
        expect(content).to.contain(fileAboveTheLimit('font.woff2'));
        expect(content).to.contain(fileAboveTheLimit('font.eot'));
        expect(content).to.contain(fileAboveTheLimit('font.otf'));
      });

      it('should load wav and mp3 files', () => {
        const content = test.content('dist/statics/app.bundle.js');
        expect(content).to.contain(fileAboveTheLimit('beep.wav'));
        expect(content).to.contain(fileAboveTheLimit('beep.mp3'));
      });
    });
  });

  describe('[ts,json,html,haml]-loaders with `yoshi.separateCss: false`', () => {
    let test;
    let resp;

    before(() => {
      test = tp.create();
      resp = test
        .setup(
          {
            'src/app.ts': `
            import './some.css';
            import './some.json';
            import './some.html';
            import './some.haml';
            import './some.md';
            import './getData1.graphql';
            import 'my-unprocessed-module/getDataExternal1.graphql';
            import './getData2.gql';
            let aServerFunction = 1;
            declare var angular: any; angular.module('fakeModule', []).config(function($typescript){});`,
            'src/some.json': '{"json-content": 42}',
            'src/some.html': '<div>This is a HTML file</div>',
            'src/some.haml': '.foo This is a HAML file',
            'src/some.md': '### title',
            'src/some.css': '.a {color: green;}',
            'src/getData1.graphql': 'query GetData1 { id, name }',
            'node_modules/my-unprocessed-module/getDataExternal1.graphql':
              'query GetDataExternal1 { id, name }',
            'src/getData2.gql': 'query GetData2 { id, name }',
            'src/foo.css': '.foo-rule { color: blue }',
            'package.json': `{
            "name": "b",
            "yoshi": {
              "entry": "./app.ts",
              "separateCss": false,
              "externalUnprocessedModules": ["my-unprocessed-module"]
            },
            "peerDependencies": {
              "angular": "^1.5.0"
            }
          }`,
            'pom.xml': fx.pom(),
            'tsconfig.json': fx.tsconfig(),
          },
          [installHaml],
        )
        .execute('build', [], {
          ...getMockedCI({ ci: false }),
          PATH:
            spawnSync('bundle', ['show', 'haml'], { cwd: test.tmp })
              .stdout.toString()
              .trim() +
            '/bin' +
            path.delimiter +
            process.env.PATH,
          GEM_PATH:
            process.env.GEM_PATH + path.delimiter + test.tmp + '/.bundle',
        });
    });
    after(() => test.teardown());

    it('should build w/o errors', () => {
      expect(resp.code).to.equal(0);
    });

    describe('Typescript', () => {
      it('should transpile', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'var aServerFunction = 1;',
        );
      });

      it('should apply ng-annotate loader on angular project with peerDependency', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          `.config(["$typescript", function ($typescript)`,
        );
      });
    });
    describe('`separateCss: false`', () => {
      it('should merge all style tags into one', () => {
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          '{"singleton":true}',
        );
      });

      it('should not create separate style files', () => {
        expect(test.list('dist/statics')).to.not.contain('app.css');
      });

      it('should not create separate style.map files', () => {
        expect(test.list('dist/statics')).to.not.contain('app.css.map');
      });
    });

    describe('Json', () => {
      it('should embed json file into bundle', () =>
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          '"json-content":42',
        ));
    });

    describe('HTML', () => {
      it('should embed html file into bundle', () =>
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          '<div>This is a HTML file</div>',
        ));
    });

    describe('HAML', () => {
      it('should embed haml file into bundle', () =>
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          "<div class='foo'>This is a HAML file</div>",
        ));
    });

    describe('raw', () => {
      it('should embed raw file into bundle', () =>
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          '### title',
        ));
    });

    describe('GraphQL', () => {
      it('should embed parsed graphql query into bundle', () => {
        const content = test.content('dist/statics/app.bundle.js');

        expect(content).to.contain('{"kind":"Name","value":"GetData1"}');
        expect(content).to.contain('{"kind":"Name","value":"GetData2"}');
        expect(content).to.contain(
          '{"kind":"Name","value":"GetDataExternal1"}',
        );
      });
    });
  });

  describe('loaders exceptions', () => {
    let test;
    beforeEach(() => (test = tp.create()));
    afterEach(() => test.teardown());

    it('should fail with error code 1 if typescript code contains errors', () => {
      const resp = test
        .setup({
          'src/app.ts': 'function ()',
          'tsconfig.json': fx.tsconfig(),
          'package.json': fx.packageJson({
            entry: './app.ts',
          }),
        })
        .execute('build');

      expect(resp.code).to.equal(1);
      expect(resp.stderr).to.contain('error TS1003: Identifier expected');
    });

    it('should resolve url() correctly using resolve url loader', () => {
      const res = test
        .setup({
          'src/client.js': `require('./some-css.scss');`,
          'src/some-css.scss': '@import "./foo/imported"',
          'src/foo/imported.scss': `.foo{background: url('./bar.svg');}`,
          'src/foo/bar.svg': '',
          'package.json': fx.packageJson(),
        })
        .execute('build');
      expect(res.code).to.equal(0);
    });

    describe('Wix TPA style', () => {
      it('should increase importLoaders in order to support native @import', () => {
        test
          .setup({
            'src/client.js': `require('./some.css');`,
            'src/some.css': '@import "./other.css"',
            'src/other.css':
              '.foo {appearance: smth; color: unquote("{{color-1}}")}',
            'package.json': fx.packageJson({ tpaStyle: true }),
          })
          .execute('build', []);

        expect(test.content('dist/statics/app.css')).to.contain(
          '-webkit-appearance',
        );
        expect(test.content('dist/statics/app.css')).to.not.contain(
          'unquote("{{color-1}}")',
        );
      });
    });

    describe.skip('Stylable', () => {
      afterEach(() => test.teardown());

      describe('client', () => {
        beforeEach(() => setupAndBuild());

        it('should run stylable loader over imported .st.css files', () => {
          expect(test.content('dist/statics/app.bundle.js')).to.match(
            /.Test.*some-rule {\s*?color: red;\s*?}/,
          );
        });
      });

      function setupAndBuild(config) {
        test
          .setup(
            {
              'src/client.js': `require('./some-css.st.css');`,
              'src/server.js': `require('./some-css.st.css');`,
              'src/some-css.st.css': `/* comment */
                                    @namespace "Test";
                                    .some-rule { color: red; }`,
              'package.json': fx.packageJson(config || {}),
            },
            [],
          )
          .execute('build');
      }
    });
  });

  describe('svg', () => {
    let test;
    beforeEach(() => (test = tp.create()));
    afterEach(() => test.teardown());
    describe('javascript', () => {
      it('load svg as a react component', () => {
        const res = test
          .setup({
            'src/client.js': `import React from 'react'; \nimport imageUrl, { ReactComponent as Image } from './image.svg';`,
            'src/image.svg': '<svg><g><path fill="#EEEEEE"></path></g></svg>',
            'package.json': fx.packageJson(),
          })
          .execute('build');

        expect(res.code).to.equal(0);
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'createElement("svg"',
        );
      });
    });

    describe('typescript', () => {
      it('load svg as a react component', () => {
        const res = test
          .setup({
            'src/client.ts': `import * as React from 'react'; \nimport { ReactComponent as Image } from './image.svg';\n console.log(Image);`,
            'tsconfig.json': fx.tsconfig({
              include: ['external-types.d.ts'],
            }),
            'external-types.d.ts': `
            declare module '*.svg';
            `,
            'src/image.svg': '<svg><g><path fill="#EEEEEE"></path></g></svg>',
            'package.json': fx.packageJson(),
          })
          .execute('build');

        expect(res.code).to.equal(0);
        expect(test.content('dist/statics/app.bundle.js')).to.contain(
          'createElement("svg"',
        );
      });
    });
  });
});
