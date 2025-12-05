module.exports = {
  packagerConfig: {
    name: 'Athanor',
    executableName: 'athanor',
    asar: true,
    prune: true,
    icon: 'assets/athanor',
    osxSign: {
      'hardened-runtime': true,
      entitlements: './entitlements.mac.plist',
      'entitlements-inherit': './entitlements.mac.plist',

      postSign: async (context) => {
        const glob = require('glob');
        const path = require('path');
        const { execSync } = require('child_process');

        const nativeBinaries = glob.sync(
          path.join(context.appPath, '**/*.node')
        );

        for (const file of nativeBinaries) {
          execSync(
            `codesign --force --options=runtime --entitlements ./entitlements.mac.plist --sign - "${file}"`,
            { stdio: 'inherit' }
          );
        }
      },
    },
    asarUnpack: [
      'resources/**/*', // Ensure resources directory is not packed into asar
      //'node_modules/node-pty/**/*',
      //'node_modules/nan/**/*', // node-pty dependency
      '**/*.node', // All native bindings
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
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: 'assets/athanor.icns',
      },
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
