const path = require('path');

module.exports = {
  entry: './electron/preload.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: [path.resolve(__dirname, 'electron')],
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, '.webpack/renderer/main_window'), // Change this line
    filename: 'preload.js',
  },
  target: 'electron-preload',
};
