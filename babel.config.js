module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            src: './src',
          },
        },
      ],
      [
        'react-native-worklets-core/plugin',
        {
          enableDevelopment: true,
        }
      ],
      'react-native-reanimated/plugin'
    ],
  };
};

