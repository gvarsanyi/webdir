
module.exports = {
  env: {
    browser: true,
    es2020: true
  },
  extends: ['google'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    warnOnUnsopportedTypeScriptVersion: false
  },
  overrides: [{
    files: ['**/*.ts', '**/*.tsx'],
    plugins: ['@typescript-eslint', 'unicorn'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: ['tsconfig.json']
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error'],
      '@typescript-eslint/indent': ['error', 2],
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: ['!./*', '!../*'] }],
      '@typescript-eslint/no-unused-vars': ['error'],
      'indent': 'off',
      'no-restricted-imports': 'off',
      'no-unused-vars': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'valid-jsdoc': ['error', { requireParamType: false, requireReturn: false, requireReturnType: false }]
    }
  }],
  plugins: ['import'],
  root: true,
  rules: {
    'arrow-spacing': ['error', { before: true, after: true }],
    'comma-dangle': ['error', 'never'],
    'eol-last': ['error', 'always'],
    'eqeqeq': ['error', 'smart'],
    'import/order': ['error', {
      'alphabetize': { caseInsensitive: false, order: 'asc' },
      'groups': ['external', 'builtin', 'parent', ['sibling', 'index']],
      'newlines-between': 'never',
      'pathGroups': [{ group: 'external', pattern: 'react', position: 'before' }],
      'pathGroupsExcludedImportTypes': ['builtin']
    }],
    'max-len': ['error', { code: 140 }],
    'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 1, maxEOF: 0 }],
    'object-curly-spacing': ['error', 'always'],
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'valid-jsdoc': ['error', { requireParamType: true, requireReturn: true, requireReturnType: true }]
  }
};
