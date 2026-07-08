module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': null,
    'no-descending-specificity': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'declaration-no-important': null
  },
  ignoreFiles: ['dist/**', 'node_modules/**']
}
