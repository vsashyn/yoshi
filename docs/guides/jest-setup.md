---
id: jest-setup
title: Jest Setup
sidebar_label: Jest Setup
---

## Introduction

Yoshi defines a custom [Jest preset](https://jestjs.io/docs/en/configuration#preset-string) to enable zero-configuration testing for most apps.

This preset configures Jest with 3 different project types ([learn more](https://jestjs.io/docs/en/configuration#projects-array-string-projectconfig)), each project uses a unique environment ([learn more](https://jestjs.io/docs/en/configuration#testenvironment-string)). Each environment sets up its own globals and is configured to run for every file that matches a certain glob pattern ([learn more](https://github.com/isaacs/node-glob)).

## Installation

```bash
npm install --save-dev jest-yoshi-preset puppeteer
```

Add the following to your Jest config:

```json
{
  "preset": "jest-yoshi-preset"
}
```

> If you're using TypeScript you should add `jest-yoshi-preset` types to your code by adding the following to your `tsconfig.json`:

```json
{
  "files": ["./node_modules/jest-yoshi-preset/types.d.ts"]
}
```

## Usage

### Dev mode

Use the `start` command to build and serve your bundle and static files, your `e2e` tests require them.

```sh
yoshi start
```

From a different terminal window, use `npx jest` command normally.

Run a specific test

```shell
npx jest my-specific-test
```

Run all tests of a spcific type (different [jest project](https://jestjs.io/docs/en/configuration#projects-array-string-projectconfig)).

You can filter the tests using the display name (`e2e`, `component`, `server`) and choose more than one, separated by commas.

For example, running only server and component tests:

```shell
MATCH_ENV=server,component npx jest
```

Run jest using watch mode

```shell
npx jest --watch
```

### CI mode

> You can also use this mode locally

In this mode, your tests will run against you local `dist/statics` directory.

```shell
npx yoshi test --jest
```

Yoshi serves the files from `dist/statics`. Make sure to run `npx yoshi build` before you run the tests using this mode.

## Environments

### JSDOM (component)

Sets up a standard [JSDOM](https://github.com/jsdom/jsdom) environment for component tests.

It's configured for every file under `<rootDir>/src/**/*.spec.js`.

### Bootstrap (server)

An environment for testing your server (API) code. It starts up a different instance of your server ([wix-ng-bootstarp based](https://github.com/wix-platform/wix-node-platform)) for every test file.

You sohuld define setup and teardown functions to start/stop your server and relevant mocks (learn more: [wix-bootstrap-testkit](https://github.com/wix-platform/wix-node-platform/tree/master/bootstrap/wix-bootstrap-testkit), [wix-rpc-testkit](https://github.com/wix-platform/wix-node-platform/tree/master/rpc/wix-rpc-testkit)).

Runs for every test file matching `<rootDir>/test/server/**/*.spec.js`.

### Puppeteer (e2e)

An environment that pre-configures [Puppeteer](https://github.com/GoogleChrome/puppeteer) for running your E2E tests.

It creates a global Browser instance ([learn more](https://github.com/GoogleChrome/puppeteer/blob/v1.5.0/docs/api.md#class-browser)) and a global Page instance ([learn more](https://github.com/GoogleChrome/puppeteer/blob/v1.5.0/docs/api.md#class-page)) for every test file. They're available as `global.browser` and `global.page` respectively.

Runs for every file that matches `<rootDir>/test/e2e/**/*.spec.js`.

## Configuration

This preset looks for a `jest-yoshi.config.js` file at the root of your project. The exported object is used to configure different parts of the preset.

example configurations:

- [fullstack project](https://github.com/wix/yoshi/blob/master/packages/create-yoshi-app/templates/fullstack/jest-yoshi.config.js)
- [client project](https://github.com/wix/yoshi/blob/master/packages/create-yoshi-app/templates/client/jest-yoshi.config.js)

```js
module.exports = {
  bootstrap: {
    // environment setup function which called before each test file
    setup: async ({ globalObject }) => {},
    // environment teardown function which called after each test file
    teardown: async ({ globalObject }) => {}
  },
  server: {
    // runs a command which bootstrap the server
    command: "node server.js",
    // wait for a server to start listening on this port before running the tests
    // this port will be available in you server script as an environment variable (PORT)
    port: 3000
  },
  puppeteer: {
    // toggle headless chrome mode
    headless: true
  }
};
```

### Setup Files

If you want to run some code before your tests you can use one of the 3 following setup files (1 for each environment):

- `<rootDir>/test/setup.component.(j|t)s`: JSDOM (component)
- `<rootDir>/test/setup.server.(j|t)s`: Bootstrap (server)
- `<rootDir>/test/setup.e2e.(j|t)s`: Puppeteer (e2e)

These setup files are actually [Jests's `setupTestFrameworkScriptFile`](https://jestjs.io/docs/en/configuration#setuptestframeworkscriptfile-string)

> A path to a module that runs some code to configure or set up the testing framework before each test.
