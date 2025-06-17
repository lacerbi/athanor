module.exports = {
  packagerConfig: {
    name: 'Athanor',
    asar: true,
    prune: true,
    icon: 'resources/images/athanor',
    // Ensure resources directory is not packed into asar
    asarUnpack: ['resources/**/*'],
    // Copy specific resources subfolders
    extraResource: ['resources/files', 'resources/prompts', 'resources/images'],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: 'resources/images/athanor.ico',
      },
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
              },
            },
          ],
        },
        devServer: {
          client: {
            overlay: {
              errors: true,
              warnings: false, // This will now be respected
            },
          },
        },
        port: 3000,
        loggerPort: 9000,
        nodeIntegration: false,
      },
    },
  ],
};
