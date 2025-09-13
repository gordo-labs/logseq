module.exports = {
  root: true,
  env: { es2022: true, node: true, browser: false },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  ignorePatterns: ['dist/', 'build/', 'static/'],
  extends: ['eslint:recommended'],
  rules: {}
};

