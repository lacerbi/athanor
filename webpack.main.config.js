// webpack.main.config.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'main/index': './electron/main.ts',
    projectAnalysisWorker: './electron/workers/projectAnalysisWorker.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: [
          path.resolve(__dirname, 'electron'),
          path.resolve(__dirname, 'electron/handlers'),
        ],
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, '.webpack'),
    filename: '[name].js',
  },
  externals: {
    'node-pty': 'commonjs2 node-pty',
    'node-addon-api': 'commonjs2 node-addon-api',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/node-pty',
          to: 'node_modules/node-pty',
        },
      ],
    }),
  ],
  target: 'electron-main',
};
