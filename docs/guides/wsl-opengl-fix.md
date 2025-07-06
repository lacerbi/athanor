# WSL OpenGL/GPU Rendering Fix for Electron Apps

## Problem Description

When running Electron applications in Windows Subsystem for Linux (WSL), users may encounter a blank or black screen where the application window appears but no content is rendered. This is caused by incompatibilities between WSL's graphics subsystem and Electron's default OpenGL backend selection.

In WSL environments, Electron may default to using an OpenGL backend that doesn't properly interface with WSL's graphics translation layer (WSLg), resulting in failed rendering despite the application running correctly in the background.

## The Solution

The fix involves forcing Electron to use the `desktop` OpenGL backend, which is more compatible with WSL's graphics stack. This is accomplished by appending the `--use-gl=desktop` command line switch to Electron before the app starts.

### Implementation in Athanor

In `electron/main.ts`, we implemented an opt-in fix that checks for an environment variable:

```typescript
// --- WSL Graphics Fix Start ---
// This addresses a specific rendering issue on WSL where Electron may default
// to an incompatible graphics backend, causing a blank screen.
// By checking for a custom environment variable, we allow affected users to opt-in
// to forcing the 'desktop' OpenGL backend without affecting other users.
if (process.env.ELECTRON_USE_DESKTOP_GL === '1') {
  console.log(
    '[Main] ELECTRON_USE_DESKTOP_GL=1 detected. Applying --use-gl=desktop switch.'
  );
  app.commandLine.appendSwitch('use-gl', 'desktop');
}
// --- WSL Graphics Fix End ---
```

## How to Use

### For End Users

If you experience a blank screen when running the Electron app in WSL:

1. Set the environment variable before launching the app:
   ```bash
   export ELECTRON_USE_DESKTOP_GL=1
   ./your-electron-app
   ```

2. Or run it inline:
   ```bash
   ELECTRON_USE_DESKTOP_GL=1 ./your-electron-app
   ```

3. To make it permanent for your shell session, add it to your shell configuration:
   ```bash
   echo 'export ELECTRON_USE_DESKTOP_GL=1' >> ~/.bashrc
   source ~/.bashrc
   ```

### For Developers

When implementing this fix in your own Electron applications:

1. **Add the check early in your main process** - Place it before `app.whenReady()` and after importing Electron
2. **Make it opt-in** - Don't force this on all users as it may cause issues on native Linux systems
3. **Use environment variables** - This allows users to enable the fix without code changes
4. **Add logging** - Help users debug by logging when the fix is applied

Example implementation:
```typescript
import { app } from 'electron';

// Apply WSL graphics fix if requested
if (process.env.ELECTRON_USE_DESKTOP_GL === '1') {
  console.log('Applying WSL OpenGL fix: --use-gl=desktop');
  app.commandLine.appendSwitch('use-gl', 'desktop');
}

// Rest of your app initialization...
app.whenReady().then(() => {
  // Create window, etc.
});
```

## Technical Details

### Why This Happens

1. **WSLg Graphics Translation**: WSL uses WSLg (Windows Subsystem for Linux GUI) to translate Linux graphics calls to Windows
2. **OpenGL Backend Selection**: Electron can use different OpenGL implementations (ANGLE, desktop GL, software rendering)
3. **Default Selection Issues**: The automatic backend selection may choose an incompatible option in WSL environments

### What `--use-gl=desktop` Does

The `--use-gl=desktop` flag forces Chromium (Electron's underlying engine) to use the system's native OpenGL implementation rather than ANGLE or other alternatives. In WSL, this ensures proper communication with WSLg's graphics translation layer.

### Other Possible Values

- `--use-gl=angle` - Use ANGLE (Almost Native Graphics Layer Engine)
- `--use-gl=swiftshader` - Use software rendering
- `--use-gl=egl` - Use EGL for GL context creation

## Troubleshooting

If the fix doesn't work:

1. **Check WSLg is installed**: Run `wsl --version` and ensure you have WSL 2 with WSLg support
2. **Update graphics drivers**: Ensure your Windows GPU drivers are up to date
3. **Try software rendering**: Set `ELECTRON_USE_DESKTOP_GL=1` and add `--disable-gpu` as a last resort
4. **Check logs**: Look for OpenGL-related errors in the console output

## Alternative Solutions

If the environment variable approach doesn't work:

1. **Force software rendering**:
   ```bash
   ./your-electron-app --disable-gpu --disable-software-rasterizer
   ```

2. **Use X11 forwarding** (if WSLg is problematic):
   ```bash
   export DISPLAY=:0
   ./your-electron-app
   ```

3. **Run with specific Mesa settings**:
   ```bash
   MESA_GL_VERSION_OVERRIDE=4.5 ./your-electron-app
   ```

## References

- [Electron Command Line Switches](https://www.electronjs.org/docs/latest/api/command-line-switches)
- [Chromium GPU Command Line Options](https://chromium.googlesource.com/chromium/src/+/master/docs/gpu/gpu_testing.md)
- [WSLg Architecture](https://github.com/microsoft/wslg/blob/main/docs/WSLg_ArchitectureOverview.md)