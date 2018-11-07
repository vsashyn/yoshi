const path = require('path');
const expect = require('chai').expect;
const tp = require('../../../test-helpers/test-phases');
const fx = require('../../../test-helpers/fixtures');
const { exists } = require('yoshi-helpers');
const {
  outsideTeamCity,
  insideTeamCity,
} = require('../../../test-helpers/env-variables');
const getMockedCI = require('../../../test-helpers/get-mocked-ci');

describe('Aggregator: e2e', () => {
  let test;
  beforeEach(() => {
    test = tp.create();
  });

  afterEach(() => test.teardown());

  describe('should run protractor with a cdn server', function() {
    this.timeout(60000);

    it('should download chromedriver 2.29 and use it (when there is environement param IS_BUILD_AGENT and no CHROMEDRIVER_VERSION supplied)', () => {
      const res = test
        .setup({
          'protractor.conf.js': '',
          'package.json': fx.packageJson(),
        })
        .execute(
          'test',
          ['--protractor'],
          Object.assign({}, outsideTeamCity, {
            IS_BUILD_AGENT: true,
            CHROMEDRIVER_VERSION: undefined,
          }),
        );
      const chromedriverPath = path.resolve(
        'node_modules',
        'protractor',
        'node_modules',
        'webdriver-manager',
        'selenium',
        'chromedriver_2.29.zip',
      );
      expect(res.code).to.equal(1);
      expect(exists(chromedriverPath)).to.be.true;
    });

    it('should download chromedriver according to the environment param CHROMEDRIVER_VERSION in CI, if exist', () => {
      const res = test
        .setup({
          'protractor.conf.js': '',
          'package.json': fx.packageJson(),
        })
        .execute(
          'test',
          ['--protractor'],
          Object.assign({}, outsideTeamCity, {
            IS_BUILD_AGENT: true,
            CHROMEDRIVER_VERSION: 2.35,
          }),
        );
      const chromedriverPath = path.resolve(
        'node_modules',
        'protractor',
        'node_modules',
        'webdriver-manager',
        'selenium',
        'chromedriver_2.35.zip',
      );

      expect(res.code).to.equal(1);
      expect(exists(chromedriverPath)).to.be.true;
    });

    it('should support single module structure by default', () => {
      const res = test
        .setup(singleModuleWithJasmine())
        .execute('test', ['--protractor'], outsideTeamCity);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('protractor');
      // note: we've setup a real integration, keep it in order
      // to see the full integration between server and client.
      expect(res.stdout).to.contain('1 spec, 0 failures');
    });

    it('should take a screenshot at the end of a failing test', () => {
      const res = test
        .setup(singleModuleWithFailingJasmine())
        .execute('test', ['--protractor'], outsideTeamCity, { silent: true }); // run in silent so that TC won't fail with the screenshot log

      expect(res.code).to.equal(1);
      expect(res.stdout).to.contain('protractor');
      expect(res.stdout).to.contain('1 spec, 1 failure');
      expect(res.stdout).to.contain('Screenshot link:');
    });

    it(`should support multiple modules structure and consider clientProjectName configuration`, () => {
      const res = test
        .setup(multipleModuleWithJasmine())
        .execute('test', ['--protractor'], outsideTeamCity);
      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('protractor');
      expect(res.stdout).to.contain('1 spec, 0 failures');
    });

    it('should run protractor with mocha', () => {
      const res = test
        .setup(singleModuleWithMocha())
        .execute('test', ['--protractor'], outsideTeamCity);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('protractor');
      expect(res.stdout).to.contain('1 passing (');
    });

    it('should run protractor with mocha and use TeamCity reporter', () => {
      const res = test
        .setup(singleModuleWithMocha())
        .execute('test', ['--protractor'], insideTeamCity);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('protractor');
      expect(res.stdout).to.contain(
        "##teamcity[testStarted name='should write some text to body' captureStandardOutput='true']",
      );
    });

    it('should use @babel/register', function() {
      this.timeout(60000);

      const res = test
        .setup(singleModuleWithJasmineAndES6Imports(true))
        .execute('test', ['--protractor'], outsideTeamCity);

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('protractor');
      expect(res.stdout).to.contain('1 spec, 0 failures');
      // a dummy import in order to use es6 feature that is not supported by node env ootb
      expect(fx.e2eTestJasmineES6Imports()).to.contain(
        `import path from 'path'`,
      );
    });

    it('should not use @babel/register', function() {
      this.timeout(60000);

      const res = test
        .setup(singleModuleWithJasmineAndES6Imports(false))
        .execute('test', ['--protractor'], outsideTeamCity);

      expect(res.code).to.equal(1);
      expect(res.stdout).to.match(/Unexpected (identifier|token)/);
    });
  });

  it('should not run protractor if protractor.conf is not present', () => {
    const res = test
      .setup({
        'package.json': fx.packageJson(),
      })
      .execute('test', ['--protractor']);

    expect(res.code).to.equal(0);
    expect(res.stdout).to.not.contain('protractor');
  });

  it('should support css class selectors with cssModules on', function() {
    this.timeout(60000);

    test
      .setup(singleModuleWithCssModules())
      .execute('build', [], getMockedCI({ ci: false }));

    const res = test.execute(
      'test',
      ['--protractor'],
      getMockedCI({ ci: false }),
    );

    expect(res.code).to.equal(0);
  });

  it('should pre-process sass with cssModules on', function() {
    this.timeout(60000);

    test
      .setup(singleModuleWithCssModulesAndSass())
      .execute('build', [], getMockedCI({ ci: false }));

    const res = test.execute(
      'test',
      ['--protractor'],
      getMockedCI({ ci: false }),
    );

    expect(res.code).to.equal(0);
  });

  it("should extend project's beforeLaunch", function() {
    this.timeout(60000);
    const res = test
      .setup(singleModuleWithBeforeLaunch())
      .execute('test', ['--protractor'], outsideTeamCity);

    expect(res.code).to.equal(0);
    expect(res.stdout).to.contain('protractor');
    expect(res.stdout).to.contain('1 spec, 0 failures');
  });

  it("should extend project's afterLaunch", function() {
    this.timeout(60000);
    const res = test
      .setup({
        'dist/test/some.e2e.js': `it('some test', () => {})`,
        'package.json': fx.packageJson(),
        'protractor.conf.js': fx.protractorConfWithAfterLaunch(),
      })
      .execute('test', ['--protractor'], outsideTeamCity);

    expect(res.code).to.equal(0);
    expect(res.stdout).to.contain('afterLaunch hook');
  });

  function cdnConfigurations() {
    return {
      servers: {
        cdn: {
          port: 6452,
        },
      },
    };
  }

  function singleModuleWithJasmineAndES6Imports(runIndividualTranspiler) {
    return Object.assign(singleModuleWithJasmine(), {
      'dist/test/subFolder/some.e2e.js': fx.e2eTestJasmineES6Imports(),
      'package.json': `{
          "name": "a",\n
          "version": "1.0.4",\n
          "yoshi": ${JSON.stringify(
            Object.assign(cdnConfigurations(), { runIndividualTranspiler }),
          )},
          "babel": { "plugins": ["${require.resolve(
            '@babel/plugin-transform-modules-commonjs',
          )}"]}
        }`,
    });
  }

  function singleModuleWithJasmine() {
    return {
      'protractor.conf.js': fx.protractorConf(),
      'dist/test/subFolder/some.e2e.js': fx.e2eTestJasmine(),
      'dist/statics/app.bundle.js': fx.e2eClient(),
      'package.json': fx.packageJson(cdnConfigurations()),
    };
  }

  function singleModuleWithFailingJasmine() {
    return {
      'protractor.conf.js': fx.protractorConf(),
      'dist/test/subFolder/some.e2e.js': fx.e2eTestJasmineFailing(),
      'dist/statics/app.bundle.js': fx.e2eClient(),
      'package.json': fx.packageJson(cdnConfigurations()),
    };
  }

  function multipleModuleWithJasmine() {
    return {
      'protractor.conf.js': fx.protractorConf(),
      'dist/test/some.e2e.js': fx.e2eTestJasmine(),
      'node_modules/client/dist/app.bundle.js': fx.e2eClient(),
      'package.json': fx.packageJson(
        Object.assign(cdnConfigurations(), { clientProjectName: 'client' }),
        { client: 'file:node_modules/client' },
      ),
    };
  }

  function singleModuleWithMocha() {
    return {
      'protractor.conf.js': fx.protractorConf({ framework: 'mocha' }),
      'dist/test/some.e2e.js': fx.e2eTestMocha(),
      'dist/statics/app.bundle.js': fx.e2eClient(),
      'package.json': fx.packageJson(Object.assign(cdnConfigurations())),
    };
  }

  function singleModuleWithCssModules() {
    return {
      'protractor.conf.js': fx.protractorConfWithStatics(),
      'test/some.e2e.js': fx.e2eTestWithCssModules(),
      'src/client.js': `const style = require('./some.css');
        document.body.innerHTML = style.className;
      `,
      'src/some.css': `.class-name {color: green;}`,
      'package.json': fx.packageJson(cdnConfigurations()),
    };
  }

  function singleModuleWithCssModulesAndSass() {
    return {
      'protractor.conf.js': fx.protractorConfWithStatics(),
      'test/some.e2e.js': fx.e2eTestWithCssModulesAndSass(),
      'src/client.js': `const style = require('./some.scss');
        document.body.innerHTML = style.className;
      `,
      'src/some-2.scss': `$txt-color:green; .class-name { color: $txt-color }`,
      'src/some.scss': `@import "./some-2.scss"`,
      'package.json': fx.packageJson(cdnConfigurations()),
    };
  }

  function singleModuleWithBeforeLaunch() {
    return Object.assign(singleModuleWithJasmine(), {
      'protractor.conf.js': fx.protractorConfWithBeforeLaunch(),
    });
  }
});
