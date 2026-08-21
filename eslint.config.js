import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // .cjs files (sequelize-cli config/migrations/seeders) intentionally use
    // CommonJS require()/module.exports - that's the format sequelize-cli expects.
    ignores: ['dist/**', 'node_modules/**', '**/*.cjs'],
  },
);
