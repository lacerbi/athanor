module.exports = {
  packagerConfig: {
    name: 'Athanor',
    asar: true,
    prune: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './public/index.html',
              js: './src/index.tsx',
              name: 'main_window',
              preload: {
                js: './electron/preload.ts',
                config: './webpack.preload.config.js',
                // Add this to ensure correct path resolution
                name: 'preload',
              },
            },
          ],
        },
      },
    },
  ],
};
