# Athanor AI Workbench - Troubleshooting

This document provides solutions to common issues encountered while using Athanor.

---

## API Key Storage Errors

### Problem: `ApiKeyStorageError: OS-level encryption is not available`

When you attempt to save an API key in the `Settings > API Key Management` panel, you might encounter an error message similar to this:

`Error invoking remote method 'secure-api-key:store': ApiKeyStorageError: OS-level encryption is not available. Please ensure your system supports secure storage.`

### Cause

This error occurs when Athanor cannot access a native service on your operating system to securely store credentials like API keys. This is not a bug in Athanor itself but an issue with the system's environment configuration.

- **Linux:** This is the most common platform for this error. Athanor uses Electron's `safeStorage` API, which relies on a standard "keyring" provider (like **GNOME Keyring** or **KWallet**) to interact with the system's secret service. Many minimal Linux distributions or custom desktop environments do not install this required `libsecret` library by default.
- **Windows & macOS:** This error is rare on these platforms because the necessary components (DPAPI on Windows, Keychain on macOS) are integral parts of the operating system.

### Solution (for Linux Users)

To resolve this, you must install a compatible keyring library. The most common one is `libsecret`.

#### For Ubuntu/Debian/Mint (Most Common)

If you are using Ubuntu or a derivative like Linux Mint or Pop!\_OS, open a terminal and run the following command. This will install the necessary library and its development files.

```bash
sudo apt-get update && sudo apt-get install libsecret-1-0 libsecret-1-dev
```

#### For Fedora/RHEL/CentOS

Open a terminal and run:

```bash
sudo dnf install libsecret-devel
```

#### For Arch Linux

Open a terminal and run:

```bash
sudo pacman -S libsecret
```

#### Special Case: WSL (Windows Subsystem for Linux)

If you're running Athanor in WSL, installing `libsecret` alone is not sufficient. Even after successful installation, you will still likely encounter the "OS-level encryption is not available" error.

<details>
<summary><strong>Additional information on WSL compatibility issues</strong></summary>

**Why this happens:** WSL doesn't provide the full Linux desktop environment that keyring services expect. Specifically:

- No native display server (X11/Wayland)
- No D-Bus session bus running by default
- No login session management that keyring daemons rely on

**Current Status:** There is no straightforward fix for this limitation. The keyring services that Electron's `safeStorage` API depends on cannot function properly in the WSL environment.

**Workarounds:**

1. **Use native Windows Athanor** for full functionality including secure API key storage
2. **Run Athanor in WSL without API key storage** - you can still use all other features, just not the direct LLM API integration
3. **Advanced users only:** Attempt to set up X11 forwarding with a Windows X server and manually initialize gnome-keyring (complex, unreliable, and not recommended)

</details>

### Recommended Workaround: Using Environment Variables

For any environment where secure storage is unavailable (including WSL and minimal Linux distributions), Athanor supports API keys via environment variables as a fallback. This is the recommended solution.

**How it works:**

1.  Set an environment variable in your shell's configuration file (e.g., `~/.bashrc`, `~/.zshrc`, or `~/.profile`).
2.  Use the naming convention `ATHANOR_<PROVIDER_ID>_API_KEY`. The provider ID must be in uppercase.
3.  Restart your terminal or source the configuration file.
4.  Launch Athanor from that terminal session.

**Examples:**

```bash
# For OpenAI
export ATHANOR_OPENAI_API_KEY="sk-..."

# For Anthropic
export ATHANOR_ANTHROPIC_API_KEY="sk-ant-..."

# For Gemini
export ATHANOR_GEMINI_API_KEY="..."

# For Mistral
export ATHANOR_MISTRAL_API_KEY="..."
```

When Athanor starts, it will detect these environment variables and enable the "Send via API" functionality for the corresponding providers, even if the OS keyring service is not available.

#### **IMPORTANT FINAL STEP (ALL DISTRIBUTIONS):**

After the installation is complete, **you must log out and log back in**, or simply restart your computer. This ensures the newly installed keyring service is active and available to all applications, including Athanor.

After restarting, when you first try to save a key, your system might prompt you to create a new default keyring and set a password for it. This is a one-time setup. Once completed, Athanor will be able to store API keys securely.

---

## Linux/WSL Graphics Issue (Blank Screen)

### Problem: The application window is blank or black on startup

When launching Athanor on certain Linux desktop environments or within the Windows Subsystem for Linux (WSL), the application may start, but the window remains completely blank. You may see a black or white screen instead of the user interface.

### Cause

This issue typically occurs when Electron, the framework used by Athanor, fails to automatically select the correct graphics rendering backend for your system. The default choice may be incompatible with your graphics driver setup, especially within the virtualized environment of WSL.

### Quick Solution

Set the `ELECTRON_USE_DESKTOP_GL` environment variable before launching Athanor:

```bash
export ELECTRON_USE_DESKTOP_GL=1
./athanor
```

Or add it to your shell configuration file (`~/.bashrc`, `~/.zshrc`, etc.) to make it permanent.

### Detailed Information

For a comprehensive guide on this issue, including technical details, alternative solutions, and implementation notes for developers, see [WSL OpenGL/GPU Rendering Fix for Electron Apps](./guides/wsl-opengl-fix.md).
