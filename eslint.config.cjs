// Correctness checks only: preserve the existing compact ES5 UI style.
const rules = {
  'no-dupe-args': 'error', 'no-dupe-keys': 'error', 'no-duplicate-case': 'error',
  'no-unreachable': 'error', 'no-unsafe-finally': 'error', 'valid-typeof': 'error',
  'no-constant-binary-expression': 'error', 'no-obj-calls': 'error', 'no-new-symbol': 'error'
};
module.exports = [
  { ignores: ['dist/**', 'site/**', 'third-party/**', '**/node_modules/**', '.venv/**'] },
  { files: ['**/*.js', '**/*.cjs'], languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' }, rules },
  { files: ['app/**/*.inline.js', 'manager/app/**/*.inline.js', 'picker/app/**/*.inline.js', 'notify/app/**/*.inline.js', 'shared/*.js'],
    languageOptions: { ecmaVersion: 5, sourceType: 'script' } },
  // Node 8.12 supports object spread; the real Node 8 suite remains the compatibility check.
  { files: ['helper/*.js', 'scripts/*.js'], languageOptions: { ecmaVersion: 2018, sourceType: 'commonjs' } }
];
