import js from '@eslint/js'
import ts from 'typescript-eslint'
import globals from 'globals'

export default ts.config(
  js.configs.recommended,
  ts.configs.strictTypeChecked,
  ts.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    ...ts.configs.disableTypeChecked,
  },
  {
    files: ['**/@client/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'postcss.config.js',
      'tailwind.config.js',
      'playwright.config.ts',
      'eslint.config.js',
    ],
  },
)
