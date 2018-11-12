module.exports = {
  plugins: ['stylelint-prettier'],
  defaultSeverity: 'error',
  rules: {
    'prettier/prettier': [true, { severity: 'warning' }],
    'color-no-invalid-hex': true, // Disallow invalid hex colors.
    'font-family-no-duplicate-names': true, // Disallow duplicate font family names.
    // 'font-family-no-missing-generic-family-keyword': true, // Disallow missing generic families in lists of font family names.
    'function-calc-no-unspaced-operator': true, // Disallow an unspaced operator within calc functions.
    'function-linear-gradient-no-nonstandard-direction': true, // Disallow direction values in linear-gradient() calls that are not valid according to the standard syntax.
    'string-no-newline': true, // Disallow (unescaped) newlines in strings.
    'unit-no-unknown': true, // Disallow unknown units.
    // 'property-no-unknown': true, // Disallow unknown properties. TODO: although may help on `colour`?
    // 'keyframe-declaration-no-important': true, // Disallow !important within keyframe declarations.
    'declaration-block-no-duplicate-properties': true, // Disallow duplicate properties within declaration blocks.
    'declaration-block-no-shorthand-property-overrides': true, // Disallow shorthand properties that override related longhand properties within declaration blocks.
    'block-no-empty': true, // Disallow empty blocks.
    'selector-pseudo-class-no-unknown': true, // Disallow unknown pseudo-class selectors.
    'selector-pseudo-element-no-unknown': true, // Disallow unknown pseudo-element selectors.
    // 'selector-type-no-unknown': true, // Disallow unknown type selectors.
    'media-feature-name-no-unknown': true, // Disallow unknown media feature names.
    'at-rule-no-unknown': true, // Disallow unknown at-rules.
    'comment-no-empty': true, // Disallow empty comments.
    // 'no-descending-specificity': true, // Disallow selectors of lower specificity from coming after overriding selectors of higher specificity. XXX: maybe can catch some bugs early
    'no-duplicate-at-import-rules': true, // Disallow duplicate @import rules within a stylesheet.
    'no-duplicate-selectors': true, // Disallow duplicate selectors.
    'no-empty-source': [true, { severity: 'warning' }], // Disallow empty sources.
    'no-extra-semicolons': true, // Disallow extra semicolons (Autofixable).
    'no-invalid-double-slash-comments': true, // Disallow double-slash comments (//...) which are not supported by CSS.
  },
};
