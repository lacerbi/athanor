const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
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
  output: {
    path: path.resolve(__dirname, '.webpack'),
    filename: 'renderer.js',
    publicPath: '/',
  },
  target: 'web',
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8080,
    hot: true,
    compress: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
