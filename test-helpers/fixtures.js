const _ = require('lodash');

const fx = {
  packageJson: (yoshiConfig = {}, dependencies = {}, otherFields = {}) =>
    JSON.stringify(
      {
        name: 'a',
        version: '1.0.4',
        yoshi: yoshiConfig,
        scripts: {
          build: 'echo npm-run-build',
          test: 'echo Testing with Mocha',
        },
        dependencies,
        ...otherFields,
      },
      null,
      2,
    ),
  pkgJsonWithBuild: () =>
    JSON.stringify(
      {
        name: 'b',
        version: '1.1.0',
        scripts: {
          build: 'yoshi build',
        },
      },
      null,
      2,
    ),
  css: () => '.a {\ncolor: red;\n}\n',
  scss: () => '.a {\n.b {\ncolor: red;\n}\n}\n',
  less: () => '.a .b {\n  color: red;\n}',
  scssInvalid: () => '.a {\n.b\ncolor: red;\n}\n}\n',
  tsconfig: (options = {}) =>
    '// tsconfig.json\n' +
    JSON.stringify(
      _.merge(
        {
          compilerOptions: {
            module: 'commonjs',
            target: 'es5',
            lib: ['es5', 'es6'],
            moduleResolution: 'node',
            sourceMap: true,
            outDir: 'dist',
            declaration: true,
            noImplicitAny: false,
          },
          exclude: ['node_modules', 'dist'],
        },
        options,
      ),
      null,
      2,
    ),
  tslint: rules => JSON.stringify({ rules }, null, 2),
  eslintrc: () =>
    JSON.stringify(
      {
        rules: {
          radix: 'error',
        },
      },
      null,
      2,
    ),
  protractorConfWithStatics: ({ framework, cdnPort } = {}) => `
    const path = require('path');
    const http = require("http");
    const express = require('${require.resolve('express')}');
    const app = express();

    exports.config = {
      specs: ["test/**/*.e2e.js"],
      framework: "${framework || 'jasmine'}",
      onPrepare: () => {
        const server = http.createServer((req, res) => {
          const response = "<html><body><script src=http://localhost:${cdnPort ||
            6452}/app.bundle.js></script></body></html>";
          res.end(response);
        });
        app.use(express.static(path.join(__dirname, '/dist/statics')));
        app.listen(6453);
        return server.listen(1337);
      }
    };
  `,
  protractorConfWithBeforeLaunch: ({ framework, cdnPort } = {}) => `
    const http = require("http");
    exports.config = {
      specs: ["dist/test/**/*.e2e.js"],
      framework: "${framework || 'jasmine'}",
      beforeLaunch: () => {
        const server = http.createServer((req, res) => {
          const response = "<html><body><script src=http://localhost:${cdnPort ||
            6452}/app.bundle.js></script></body></html>";
          res.end(response);
        });
        return server.listen(1337);
      }
    };
  `,
  protractorConfWithAfterLaunch: ({ framework } = {}) => `
    exports.config = {
      specs: ["dist/test/**/*.e2e.js"],
      framework: "${framework || 'jasmine'}",
      afterLaunch: () => {
        return new Promise(resolve => setTimeout(() => {
          console.log('afterLaunch hook');
          resolve();
        }))
      },
    };
  `,
  protractorConf: ({ framework, cdnPort } = {}) => `
    const http = require("http");
    exports.config = {
      specs: ["dist/test/**/*.e2e.js"],
      framework: "${framework || 'jasmine'}",
      onPrepare: () => {
        const server = http.createServer((req, res) => {
          const response = "<html><body><script src=http://localhost:${cdnPort ||
            6452}/app.bundle.js></script></body></html>";
          res.end(response);
        });
        return server.listen(1337);
      }
    };
  `,
  e2eTestJasmine: () => `
    it("should write some text to body", () => {
      browser.ignoreSynchronization = true;
      browser.get("http://localhost:1337");
      expect(element(by.css("body")).getText()).toEqual("Hello Kitty");
    });
  `,
  e2eTestJasmineFailing: () => `
    it("should fail", () => {
      browser.ignoreSynchronization = true;
      browser.get("http://localhost:1337");
      expect(1).toBe(0);
    });
  `,
  e2eTestJasmineES6Imports: () => `
    import path from 'path';

    it("should write some text to body", () => {
      browser.ignoreSynchronization = true;
      browser.get("http://localhost:1337");
      expect(element(by.css("body")).getText()).toEqual("Hello Kitty");
    });
  `,
  e2eTestMocha: () => `
    function equals(a, b) {
      if (a !== b) {
        throw new Error(a + " is not equal to " + b);
      }
    }

    it("should write some text to body", () => {
      browser.ignoreSynchronization = true;
      browser.get("http://localhost:1337");
      element(by.css("body")).getText().then(function (text) {
        equals(text, "Hello Kitty");
      });
    });
  `,
  e2eTestWithCssModules: () => `
    const {className} = require('../src/some.css');
    it("should write some text to body", () => {
      browser.ignoreSynchronization = true;
      browser.get("http://localhost:1337");
      expect(element(by.css("body")).getText()).toEqual(className);
    });
  `,
  e2eTestWithCssModulesAndSass: () => `
    const {className} = require('../src/some.scss');
    it("should write some text to body", () => {
      browser.ignoreSynchronization = true;
      browser.get("http://localhost:1337");
      expect(element(by.css("body")).getText()).toEqual(className);
    });
  `,
  e2eClient: () => `document.body.innerHTML = "Hello Kitty";`,
  pom: () => `
  <?xml version="1.0" encoding="UTF-8"?>
  <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
      <modelVersion>4.0.0</modelVersion>
      <groupId>com.wixpress</groupId>
      <artifactId>app-id</artifactId>
      <packaging>pom</packaging>
      <name>app-name</name>
      <description>app-description</description>
      <version>1.0.0-SNAPSHOT</version>

      <organization>
          <name>app-organization</name>
      </organization>

      <parent>
          <groupId>com.wixpress.common</groupId>
          <artifactId>wix-master-parent</artifactId>
          <version>100.0.0-SNAPSHOT</version>
      </parent>

      <developers>
          <developer>
              <name>me</name>
              <email>myEmail@wix.com</email>
              <roles>
                  <role>owner</role>
              </roles>
          </developer>
      </developers>

      <build>
          <plugins>
              <plugin>
                  <groupId>org.apache.maven.plugins</groupId>
                  <artifactId>maven-assembly-plugin</artifactId>
                  <version>2.2.1</version>
                  <configuration>
                      <descriptors>
                          <descriptor>maven/assembly/tar.gz.xml</descriptor>
                      </descriptors>
                      <appendAssemblyId>false</appendAssemblyId>
                      <finalName>\${project.artifactId}-\${project.version}</finalName>
                  </configuration>
                  <executions>
                      <execution>
                          <phase>prepare-package</phase>
                          <goals>
                              <goal>single</goal>
                          </goals>
                      </execution>
                  </executions>
              </plugin>
          </plugins>
      </build>
  </project>
  `,
  defaultServerPort: () => 3002,
  httpServer: (message, port) => `
    'use strict';

    const http = require('http');

    const hostname = 'localhost';
    const port = ${port} || process.env.PORT || ${fx.defaultServerPort()};
    const server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('${message}');
    });

    server.listen(port, hostname, () => {
      console.log('Running a server...');
    });
  `,
  karmaWithJasmine: () => `
    'use strict';

    module.exports = {
      browsers: ["PhantomJS"],
      frameworks: ["jasmine"],
      plugins: [
        require("karma-jasmine"),
        require("karma-phantomjs-launcher")
      ]
    }
  `,
  petriSpec: () => `
  {
    "specs.infra.Dummy": {
      "scopes": ["infra"],
      "owner": "tomasm@wix.com",
      "onlyForLoggedInUsers": true,
      "controlGroup": "false",
      "variants": ["true"]
    }
  }
  `,
  angularJs: () => `
/* @ngInject */
function something($http) { }
  `,
};

module.exports = fx;
