# `stylelint-config-yoshi`

This is a custom [Stylelint configuration](https://jestjs.io/docs/en/configuration#preset-string) which follows the following mindset:

- Only fail on errors that can cause production bugs rather than stylistic opinions
- If it's not a critical bug, we try only to add auto-fixable rules (`yoshi lint --fix`)

## Enabled stylelint rules:

- `prettier/prettier`: warning. uses Prettier to format the code automatically.
- `color-no-invalid-hex`: error. Disallow invalid hex colors.
- `font-family-no-duplicate-names`: error. Disallow duplicate font family names.
- `function-calc-no-unspaced-operator`: error. Disallow an unspaced operator within calc functions.
- `function-linear-gradient-no-nonstandard-direction`: error. Disallow direction values in linear-gradient() calls that are not valid according to the standard syntax.
- `string-no-newline`: error. Disallow (unescaped) newlines in strings.
- `unit-no-unknown`: error. Disallow unknown units.
- `declaration-block-no-duplicate-properties`: error. Disallow duplicate properties within declaration blocks.
- `declaration-block-no-shorthand-property-overrides`: error. Disallow shorthand properties that override related longhand properties within declaration blocks.
- `block-no-empty`: error. Disallow empty blocks.
- `selector-pseudo-class-no-unknown`: error. Disallow unknown pseudo-class selectors.
- `selector-pseudo-element-no-unknown`: error. Disallow unknown pseudo-element selectors.
- `media-feature-name-no-unknown`: error. Disallow unknown media feature names.
- `at-rule-no-unknown`: error. Disallow unknown at-rules.
- `comment-no-empty`: error. Disallow empty comments.
- `no-duplicate-at-import-rules`: error. Disallow duplicate @import rules within a stylesheet.
- `no-duplicate-selectors`: error. Disallow duplicate selectors.
- `no-empty-source`: error. Disallow empty sources.
- `no-extra-semicolons`: error. Disallow extra semicolons (Autofixable).
- `no-invalid-double-slash-comments`: error. Disallow double-slash comments (//...) which are not supported by CSS.
