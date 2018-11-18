---
id: stylelint-setup
title: Stylelint Setup
sidebar_label: Stylelint Setup
---

## Introduction

Yoshi defines [`stylelint-config-yoshi`](https://github.com/wix/yoshi/tree/master/packages/stylelint-config-yoshi), which is a custom [Stylelint configuration](https://jestjs.io/docs/en/configuration#preset-string) to enable zero-configuration stylesheet linting for any application. It follows the following mindset:

- Focus on possible errors rather than stylistic opinions
- Auto-fixable code-style with prettier (`yoshi lint --fix`)

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
