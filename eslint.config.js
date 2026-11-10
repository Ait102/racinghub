import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'test-results',
      'playwright-report',
      'src/data/circuits/shapes',
      'src/series/wec/data/circuit-shapes.generated.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // Shared code must not depend on a championship.
    files: ['src/{api,data,hooks,lib}/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/components/Layout.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Match relative paths through any series folder.
              regex: String.raw`^\.{1,2}/(.*/)?(f1|wec|fe|imsa|dtm)(/|$)`,
              message: 'Общий код не импортирует серии.',
            },
          ],
        },
      ],
    },
  },
  ...['f1', 'wec', 'fe', 'imsa', 'dtm'].map((series) => ({
    files: [`src/series/${series}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^\\.{1,2}/(.*/)?(${['f1', 'wec', 'fe', 'imsa', 'dtm'].filter((id) => id !== series).join('|')})(/|$)`,
              message: 'Серии не импортируют друг друга; общее находится в src/.',
            },
          ],
        },
      ],
    },
  })),
  {
    files: ['**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);
