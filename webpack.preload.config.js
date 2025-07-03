const path = require('path');

module.exports = {
  entry: './electron/preload.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: [
          path.resolve(__dirname, 'electron'),
          path.resolve(__dirname, 'common'),
        ],
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  target: 'electron-preload',
};
