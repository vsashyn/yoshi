---
id: babel-setup
title: Babel Setup
sidebar_label: Babel Setup
---

## Introduction

Yoshi provides its own preset for full-stack, client or Node.js projects. It is pre-configured, maintained and tuned for the current state of Yoshi.

## Usages in Yoshi projects

Configure `yoshi` to use its built-in preset by adding the following to your `package.json` or with separate `babelrc`/`babel.config.js` config:

```json
{
  "babel": {
    "presets": ["yoshi"]
  }
}
```

## Configuration options

- `targets`: Avoid redundant transformations if specified targets already support some of ESNext features. [Read more](https://babeljs.io/docs/plugins/preset-env/#targets).
  By default, if no `targets` provided, it will compile for **all** targets (`node` on test environment).
- `modules` (defaults to `"commonjs"` in `test` environment and to false in `production` and `development` ): Enable transformation of ES6 module syntax to another module type. [Read more](https://babeljs.io/docs/plugins/preset-env/#modules). Set `false` to ignore module transforms.
- `ignoreReact` (default: `false`): Ignores plugins and presets related to React.
- `debug` (default: `false`): Outputs the targets/plugins used according to specified targets. [Read more](https://babeljs.io/docs/plugins/preset-env/#debug).

## Modes

The preset behaves differently according to the environment. The environment is determined by checking `process.env.BABEL_ENV`, `process.env.NODE_ENV` and use `development` as the default if none was supplied.

1. `NODE_ENV = 'test'` - Transpile for current node version for fast testing in mind.

2. `NODE_ENV = 'development'` - Transpile for modern browsers for fast builds in mind.

3. `NODE_ENV = 'production'` - Optimize bundle, compile for all possible targets from `IE10`, prepare for uglifycation, with full browsers support, runtime optimization and small bundle size in mind.

## Wanna know what's inside?

- [preset-env](https://babeljs.io/docs/plugins/preset-env) for ESNext to ES5 transform. Moreover, you can customize current targets and module type to build for. Will use all targets and commonjs module type as a default values. Configured with target `node` for `test` environment.
- [preset-react](https://babeljs.io/docs/plugins/preset-react) for JSX and Flow transforms.
- [transform-runtime](https://babeljs.io/docs/plugins/transform-runtime) externalize references to helpers and builtins, automatically polyfilling your code without polluting globals.
- [transform-class-properties](https://babeljs.io/docs/plugins/transform-class-properties).
- [transform-decorators](https://babeljs.io/docs/plugins/transform-decorators) (legacy).

### Environment specific plugins:

#### `test`
  - [dynamic-import-node](https://github.com/airbnb/babel-plugin-dynamic-import-node) - Babel plugin to transpile import() to a deferred require(), for node.
  - [syntax-object-rest-spread](https://babeljs.io/docs/plugins/syntax-object-rest-spread) Allow the syntax of Object `{ ...rest, ...spread }`

#### `development`
  - [syntax-dynamic-import](https://babeljs.io/docs/plugins/syntax-dynamic-import) - Allow the syntax of dynamic imports since all transformations done by webpack.
  - [syntax-object-rest-spread](https://babeljs.io/docs/plugins/syntax-object-rest-spread) Allow the syntax of Object `{ ...rest, ...spread }`

#### `production`
  - [syntax-dynamic-import](https://babeljs.io/docs/plugins/syntax-dynamic-import) - Allow the syntax of dynamic imports since all transformations done by webpack.
  - [remove-prop-types](https://github.com/oliviertassinari/babel-plugin-transform-react-remove-prop-types) only for production builds.
  - [proposal-object-rest-spread](https://babeljs.io/docs/plugins/transform-object-rest-spread) - Transform Object `{ ...rest, ...spread }`
