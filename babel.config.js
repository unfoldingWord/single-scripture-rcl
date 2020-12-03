module.exports = {
  'presets': [
    '@babel/react',
    [
      '@babel/preset-env',
      {
        'modules': false,
        'useBuiltIns': 'usage',
        'corejs': 3,
      },
    ],
  ],
};