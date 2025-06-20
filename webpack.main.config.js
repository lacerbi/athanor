const path = require('path');

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
  target: 'electron-main',
};
