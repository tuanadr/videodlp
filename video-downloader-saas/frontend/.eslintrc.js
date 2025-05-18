module.exports = {
  extends: ['react-app'],
  rules: {
    // Vô hiệu hóa các quy tắc gây ra lỗi trong quá trình build
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/no-redundant-roles': 'off',
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: {
        'no-unused-vars': 'warn',
      },
    },
  ],
};