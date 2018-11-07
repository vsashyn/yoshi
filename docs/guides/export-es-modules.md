---
id: export-es-modules
title: Export ES Modules
sidebar_label: Export ES Modules
---

## How to export ES modules along with commonjs?

### TL;DR
Add `module: 'path/to/entry.js'` in your `package.json` and make sure you are **not** using[`babel-plugin-transform-es2015-modules-commonjs`](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-modules-commonjs) in `.babelrc`. Similarly, for typescript project, make sure you have `{"module": "es6"}` in `tsconfig.json`.

### Why

* bundlers (rollup/webpack) could use ES modules (import/export) to perform tree-shaking.

> When you import a library, you'll end up having all of it in your bundle, even though you use only a small part. The commonly known [`tree-shaking`](https://webpack.js.org/guides/tree-shaking/) is a feature that makes sure unused modules will not be included in your bundle.

* Yoshi (webpack under the hood)[will use `module` field instead of `main`](https://webpack.js.org/guides/author-libraries/#final-steps).
Yoshi will also use this field to infer whether to create `/es` directory with no modules transformed.

### How

1. Don't include `@babel/plugin-transform-modules-commonjs` to your `.babelrc`.
    * If you are using `@babel/preset-env`, `@babel/preset-es2015` or other preset which includes this plugin under the hood, use `{ modules: false }` to configure it.
    * If you are using `babel-preset-yoshi` there is nothing special you need to do in babel config.
2. For typescript project, no special `tsconfig.json` change is needed.
3. Specify path to your entry file with `module: 'dist/es/src/entry.js'`. Please note that Yoshi will create `es` directory with untranspiled modules near your usual transformation output (`dist/src` and `dist/es/src`).

*package.json*
```json
"module": "dist/es/src/entry.js",
"babel": {
  "presets": [
    "yoshi"
  ]
},
"yoshi": {
  "entry": "./entry.js"
}
```

This will create 2 ouput targets:

```
dist
└── src/entry.js
└── es
     └── src/entry.js
```

__NOTE:__ In `pacakge.json`, you can [configure `"sideEffects": false`](https://github.com/webpack/webpack/tree/master/examples/side-effects) and allow webpack to perform tree-shaking on your library when imported to other projects, eg:

```js
import { Button } from 'wix-style-react';
```
