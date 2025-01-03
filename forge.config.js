module.exports = {
  packagerConfig: {
    name: 'Athanor',
    asar: true,
    prune: true,
    // Ensure prompts directory is not packed into asar
    asarUnpack: ['resources/prompts/**/*'],
    // Copy resources to the final package
    extraResource: ['resources/prompts'],
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
              },
              prefixNamespace: false,
              outputTarget: {
                html: 'index.html',
                js: 'index.js',
                preload: 'preload.js',
              },
            },
          ],
        },
        port: 3000,
        loggerPort: 9000,
        nodeIntegration: false,
      },
    },
  ],
};
