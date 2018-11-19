---
id: cli
title: CLI Options
sidebar_label: CLI Options
---

# Top level flags

### `--help` ( `-h` )

Output usage information

Default: `./dist/index.js`

### `--verbose`

Yoshi will print verbose logs and error messages.

Default: `true` in CI

# Commands

The following sections describe the available tasks in `yoshi`. You can always use the `--help` flag for every task to see its usage.

## start

This will run the specified (server) `entryPoint` file and mount a CDN server.

### options

#### `--entry-point` ( `-e` )

Entry point for the app.

Default: `./dist/index.js`

#### `--manual-restart`

Get SIGHUP on change and manage application reboot manually

Default: `false`

#### `--no-test`

Do not spawn `npm test` after start

Default: `false`

#### `--no-server`

Do not spawn the app server

Default: `false`

#### `--ssl`

Serve the app bundle on https

Default: `false`

#### `--debug`

Allow server debugging, debugger will be available at 127.0.0.1:[port]

Default: `0`

#### `--debug-brk`

Allow server debugging, debugger will be available at 127.0.0.1:[port], process won't start until debugger will be attached

Default: `0`

#### `--production`

Start using unminified production build (the tests would not run in this mode)

Default: `0`

The following are the default values for the CDN server's port, mount directory and whether to serve statics over https or regular http. You can change them in your `package.json`:

```json
"yoshi": {
  "servers": {
    "cdn": {
      "port": 3200,
      "dir": "dist/statics",
      "ssl": false
    }
  }
}
```

## build

### options

#### `--analyze`

run webpack-bundle-analyzer plugin.

#### `--stats`

output webpack stats file to `dist/webpack-stats.json` (see also [bundle analysis](../guides/bundle-analyze.md))|

#### `--source-map`

Explictly emit bundle source maps.

This task will perform the following:

1. Compile using `TypeScript` (`*.ts`) or `babel` (`*.js`) files into `dist/`. In case you do not want to transpile server (node), you can remove `.babelrc`/`babel.config.js`/`tsconfig`/package json's `babel` key. If you still need those (for transpiling client code), please use `yoshi.runIndividualTranspiler`.
2. Copy assets to `dist` folder (ejs/html/images...).

You can specify multiple entry points in your `package.json` file. This gives the ability build multiple bundles at once. More info about Webpack entries can be found [here](http://webpack.github.io/docs/configuration.html#entry).

```json
"yoshi": {
  "entry": {
    "a": "./a",
    "b": "./b",
    "c": ["./c", "./d"]
  }
}
```

**Note:** if you have multiple entries you should consider using the [`optimization.splitChunks`](https://gist.github.com/sokra/1522d586b8e5c0f5072d7565c2bee693)

**Note2:** the decision whether to use `TypeScript` or `babel` is done by searching `tsconfig.json` inside the root directory.

## test

### options

#### `--mocha`

Run unit tests with Mocha - this is the default

#### `--jasmine`

Run unit tests with Jasmine

#### `--karma`

Run tests with Karma (browser)

#### `--jest`

Run tests with Jest

#### `--protractor`

Run e2e tests with Protractor (e2e)

#### `--watch`

Run tests on watch mode (works for mocha, jasmine, jest & karma)

#### `--debug`

Allow test debugging (works for mocha, jest & protractor)

#### `--debug-brk`

Allow test debugging (works for mocha, jest & protractor), process won't start until debugger will be attached

#### `--coverage`

Collect and output code coverage

By default, this task executes both unit test (using `mocha` as default) and e2e test using `protractor`.
Default unit test glob is `{test,app,src}/**/*.spec.+(js|ts)`. You can change this by adding the following to your package.json:

```js
yoshi: {
  specs: {
    node: "my-crazy-tests-glob-here";
  }
}
```

- Note that when specifying multiple flags, only the first one will be considered, so you can't compose test runners (for now).

- Mocha tests setup:

  You can add a `test/mocha-setup.js` file, with mocha tests specific setup. Mocha will `require` this file, if exists.
  Example for such `test/mocha-setup.js`:

  ```js
  import "babel-polyfill";
  import "isomorphic-fetch";
  import sinonChai from "sinon-chai";
  import chaiAsPromised from "chai-as-promised";
  import chai from "chai";

  chai.use(sinonChai);
  chai.use(chaiAsPromised);
  ```

- Karma tests setup:

  When running tests using Karma, make sure you have the right configurations in your `package.json` as described in [`yoshi.specs`](#wixspecs) section. In addition, if you have a `karma.conf.js` file, the configurations will be merged with our [built-in configurations](yoshi/config/karma.conf.js).

- Jasmine tests setup:

  Specifying a custom glob for test files is possible by configuring `package.json` as described in [`yoshi.specs`](#wixspecs). The default glob matches `.spec.` files in all folders.
  <br />
  If you wish to load helpers, import them all in a file placed at `'test/setup.js'`.

- Jest test setup:

  You may specify a jest config object in your `package.json`, for example:

  ```json
    "jest": {
      "testRegex": "/src/.*\\.spec\\.(ts|tsx)$"
    }
  ```

  Every other argument you'll pass to `yoshi test --jest` will be forwarded to jest, For example:

  `yoshi test --jest --forceExit foo.spec.js`

  Will run jest on `foo.spec.js` file and will apply [`forceExit`](https://jestjs.io/docs/en/cli#forceexit).

  **Note:** `--debug & --debug-brk` won't be transfer to jest, but instead will be [used in yoshi for test debugging](https://jestjs.io/docs/en/troubleshooting#tests-are-failing-and-you-don-t-know-why)

## lint

### options

#### `--fix`

Automatically fix lint problems

Default: `false`

#### `--format`

Use a specific formatter for eslint/tslint/stylelint

Default: `stylish`

#### `[files...]`

Optional list of files (space delimited) to run lint on

Default: empty

Executes linters based on the project type:

- [`TSLint`](https://palantir.github.io/tslint/) for TypeScript projects (a `tslint.json` configuration file is required)
- [`ESLint`](https://eslint.org/) for Babel projects (an `.eslintrc` configuration file is required)
- [`Stylelint`](https://stylelint.io/) for any project with a `stylelint` configuration

## `release`

### options

#### `--minor`

bump a minor version instead of a patch

Default: `false`

Bump the patch version in `package.json` using `wnpm-release`.
