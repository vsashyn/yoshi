---
id: stylelint-setup
title: Stylelint Setup
sidebar_label: Stylelint Setup
---

## Introduction

[Stylelint](https://stylelint.io) is a linter for stylesheet files, like CSS, LESS and SASS. It can also integrate with Prettier, to make sure code style is consistent and more maintainable. For example, consider the following code:

```css
.button {
  color: #fa; /* <- what */
}
```

This CSS code is problematic: color hex codes must be 6 or 3 figures long: `#000000`, or its shorthand `#000`.
How does Chrome handle this undefined behavior? What about IE 11? Safari? Even if it is already well tested and works exactly like we want - **this is an error-prone code**, that the common developer shouldn't even bother to know about - and CSS has many of these.
Stylelint solves these code smells by warning us _while writing our code_, in our favorite environment. :clap:

To make this integration easy and consistent across Wix, Yoshi defines [`stylelint-config-yoshi`](https://github.com/wix/yoshi/tree/master/packages/stylelint-config-yoshi), which is a custom [Stylelint configuration](https://stylelint.io/user-guide/configuration/) to enable zero-configuration stylesheet linting for any application. It follows the following mindset:

- Only fail on errors that can cause production bugs rather than stylistic opinions
- If it's not a critical bug, we try only to add auto-fixable rules (`yoshi lint --fix`)

## Installation

```bash
npm install --save-dev stylelint-config-yoshi
```

Add the following to your `package.json`:

```json
{
  "stylelint": {
    "extends": "stylelint-config-yoshi"
  }
}
```

## Usage

Now that `stylelint` is configured with `stylelint-config-yoshi`, every [`yoshi lint`](api/cli.md#lint) execution will also lint your stylesheets.
