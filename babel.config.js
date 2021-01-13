module.exports = {
  'presets': [
    '@babel/react',
    '@babel/preset-flow',
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
