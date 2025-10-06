import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { defineConfig, globalIgnores } from 'eslint/config'
import pluginImport from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: {
      import: pluginImport,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // import rules
      'import/order': ['warn', {
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
      'import/no-extraneous-dependencies': ['warn', {
        devDependencies: [
          'vite.config.js',
          'eslint.config.js',
          'test/**',
          'src/__tests__/**',
          'src/components/**/*.spec.*',
        ],
      }],
      'import/no-unresolved': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: undefined,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: pluginImport,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': 'allow-with-description' }],
      // readability
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],
      '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
      '@typescript-eslint/member-ordering': 'warn',
      // import rules
      'import/order': ['warn', {
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
      'import/no-extraneous-dependencies': ['warn', {
        devDependencies: [
          'vite.config.js',
          'eslint.config.js',
          'test/**',
          'src/__tests__/**',
          'src/components/**/*.spec.*',
        ],
      }],
      'import/no-unresolved': 'error',
    },
  },
])
