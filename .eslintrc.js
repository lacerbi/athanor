module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      project: './tsconfig.json',
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'plugin:electron/recommended',
      'prettier', // Must be last to override other configs
    ],
    plugins: [
      'react',
      'react-hooks',
      '@typescript-eslint',
      'prettier',
      'electron',
    ],
    env: {
      browser: true,
      es2021: true,
      node: true,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'electron/no-ipc-sync': 'error',
    },
    overrides: [
      {
        // Disable certain rules for specific file patterns
        files: ['*.js', '*.jsx'],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
        },
      },
    ],
  }