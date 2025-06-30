module.exports = {
  packagerConfig: {
    name: 'Athanor',
    asar: true,
    prune: true,
    icon: 'assets/athanor',
    osxSign: {
      'hardened-runtime': true, // Keep the security features on
      entitlements: './entitlements.mac.plist', // Use our key for the main app
      'entitlements-inherit': './entitlements.mac.plist', // Let child processes (our shell) use the key too
    },
    asarUnpack: [
      'resources/**/*', // Ensure resources directory is not packed into asar
      //'node_modules/node-pty/**/*',
      //'node_modules/nan/**/*', // node-pty dependency
      //'**/*.node', // All native bindings
      //'x64/node_modules/node-pty/**/*',
      //'**/node_modules/node-pty/**/*',
    ],
    // Copy specific resources subfolders
    extraResource: [
      'resources/files',
      'resources/prompts',
      'resources/images',
      'assets',
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: 'assets/athanor.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'assets/athanor.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
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
