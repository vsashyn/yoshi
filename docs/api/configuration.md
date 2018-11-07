---
id: configuration
title: Configuration
sidebar_label: Configuration
---

Configurations are meant to be inside `package.json` under `yoshi` section or by passing flags to common tasks, for example:

```json
{
  "name": "my-project",
  "version": "0.0.1",
  "yoshi": {
    "entry": {
      "app": "./app2.js"
    }
  }
}
```

Alternatively, you can create a file named `yoshi.config.js` in your project's root directory, and export an object with the configuration you need. For example:

```js
module.exports = {
  entry: {
    app: "./app2.js"
  }
};
```

> Yoshi will prefer configuration from `package.json` over `yoshi.config.js` file.

## extends

A path to a package that sets up defaults for `yoshi`'s config. The project's config can override those defaults.

The purpose of this option is to allow reusing configurations that are the same across multiple (similar) projects.

Here's an example of how a simple `extends` file looks like:

```js
module.exports = {
  defaultConfig: {
    exports: "[name]",
    externals: {
      lodash: "lodash"
    }
  }
};
```

## separateCss

By default, your `require`d css will bundled to a separate `app.css` bundle. You can leave your css in main js bundle by adding the following to your `package.json`:

```json
"yoshi": {
  "separateCss": false
}
```

## splitChunks

Configure webpack's `optimization.splitChunks` option. It's an opt-in feature that creates a separate file (known as a chunk), consisting of common modules shared between multiple entry points.

Supports both `false` value _(default)_, `true` and a [configuration object](https://gist.github.com/sokra/1522d586b8e5c0f5072d7565c2bee693#configuration):

```json
"yoshi": {
  "splitChunks": true
  }
```

## cssModules

We use [css modules](https://github.com/css-modules/css-modules) as default. You can disable this option any time by adding the following to wix section inside your `package.json`:

```json
"yoshi": {
  "cssModules": false
}
```

You also use the `prod` keyword to only separate css on CI and production, this is useful for speeding up HMR on local dev environments.

```json
"yoshi": {
  "separateCss": "prod"
}
```

Disabling cssModules on a specific css file is possible by adding `.global` before file extention.
For example:

`./Counter.global.scss` //no css modules for this file

Using css modules inside your component is easy:

```js
import s from "./Counter.scss"; // import css/scss

<p className={s.mainColor}>{counterValue}</p>;
```

Using css when css modules are turned off:

```js
import "./Counter.scss"; // import css/scss

<p className="mainColor">{counterValue}</p>;
```

## tpaStyle

Set to true to build with TPA style.

## enhancedTpaStyle

Set to true to build with enhanced TPA style.

- ![status experimental](https://img.shields.io/badge/status-experimental-ff69b4.svg)

## clientProjectName

The name of the client project.

## keepFunctionNames

Set to true to keep function names when uglifying

## entry

Explanation is in [cli/build](./cli.md#build) section.

## servers.cdn

Explanation is in [cli/start](./cli.md#start) section.

## externals

Prevent bundling of certain imported packages and instead retrieve these external dependencies at runtime (as a script tags)

```json
{
  "yoshi": {
    "externals": {
      "react": "React"
    }
  }
}
```

## specs

Specs globs are configurable. `browser` is for karma, `node` is for mocha and jasmine.

```json
{
  "yoshi": {
    "specs": {
      "browser": "dist/custom/globs/**/*.spec.js",
      "node": "dist/custom/globs/**/*.spec.js"
    }
  }
}
```

For example:

```json
{
  "yoshi": {
    "specs": {
      "browser": "dist/src/client/**/*.spec.js",
      "node": "dist/src/server/**/*.spec.js"
    }
  }
}
```

## runIndividualTranspiler

In case you don't want to transpile your server (node) code, and you still need `.babelrc`/`tsconfig`, you can add `runIndividualTranspiler` flag to skip server transpiling.

## transpileTests

An option to not transpile tests with Babel (via `@babel/register`). Defaults to `true`.

## externalUnprocessedModules

You can explicitly ask build process to transpile some node modules in case those modules do not contain transpiled code.
Note that this is not a recommended workflow. It can be very error prone:

1.  It might be for example that your app babel config and the node module babel config will be conflicting.
2.  Any babel plugin that is used by your dependencies will need to be installed by your app as well.
3.  You'll need to also add nested dependencies that need transpiling into array, which can be confusing.

Anyway, if you don't have a better alternative you can pass array with module names in this property.

## exports

If set, export the bundle as library. `yoshi.exports` is the name.

Use this if you are writing a library and want to publish it as single file. Library will be exported with `UMD` format.

### hmr

`Boolean` | `"auto"`

Set to `false` in order to disable hot module replacement. (defaults to true)

`"auto"` is an experimental feature which provides zero configuration HMR for react. It will include `react-hot-loader` to the top of the entry file and will wrap React's root component in special Higher Order Component which enables hot module reload for react. Also it will call `module.hot.accept` on the project's entry file.

### liveReload

`Boolean`

If true, instructs the browser to physically refresh the entire page if / when webpack indicates that a hot patch cannot be applied and a full refresh is needed.

## performance

Allows to use the Webpack Performance Budget feature.
The configuration object is the same as in webpack.
For more info, you can read the [webpack docs](https://webpack.js.org/configuration/performance/).

## resolveAlias

Allows you to use the Webpack Resolve Alias feature.
The configuration object is the same as in Webpack, note that the paths are relative to Webpacks context.
For more info, you can read the [webpack docs](https://webpack.js.org/configuration/resolve/#resolve-alias).

## hooks

Run a shell script at a specific time in yoshi's execution.

For exmaple:

```json
{
  "yoshi": {
    "hooks": {
      "prelint": "echo running-before-lint"
    }
  }
}
```

Next time you'll run `yoshi lint`, this command will execute and only then the linter will run.

**supported hooks:**

- `prelint` - Runs before the linter

**Missing a hook?** Feel free to open issues/PRs for more hooks if needed.

## umdNamedDefine

`Boolean`

If option is `true` AMD modules of the UMD build will have names. Otherwise an anonymous define is used(the same as in [webpack](https://webpack.js.org/configuration/output/#output-umdnameddefine)).
By default it is `true`.

## universalProject

`Boolean`

Indicates whether the current project is a universal project.
