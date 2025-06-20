const path = require('path');
const isEnvDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  mode: isEnvDevelopment ? 'development' : 'production',
  entry: ['./src/index.tsx'],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [/src/, path.resolve(__dirname, 'electron')],
        use: [{ loader: 'ts-loader' }],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      buffer: false,
      stream: require.resolve('stream-browserify'),
      timers: require.resolve('timers-browserify'),
    },
  },
  target: 'web',
  performance: {
    hints: isEnvDevelopment ? false : 'warning',
  },

  devServer: {
    hot: true,
    client: {
      overlay: {
        errors: true, // Show overlay for errors
        warnings: false, // Do NOT show overlay for warnings
      },
    },
  },
};
