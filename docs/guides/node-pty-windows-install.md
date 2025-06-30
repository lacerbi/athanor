# Guide: Setting Up a Windows Environment for `node-pty` in Electron

This guide provides a comprehensive set of instructions to configure a Windows machine for compiling native Node.js modules like `node-pty`, which are often required for Electron applications. Following these steps in order should resolve common build errors.

### Step 1: Install Node.js Version Manager (nvm-windows)

To avoid conflicts and easily manage Node.js versions, it's highly recommended to use a version manager.

1.  **Uninstall any existing versions of Node.js** from your system via "Apps & features" to prevent conflicts.
2.  Download the installer for the latest release of `nvm-windows` from the [official GitHub repository](https://github.com/coreybutler/nvm-windows/releases).
3.  Run the `nvm-setup.exe` installer and follow the on-screen prompts.

### Step 2: Install and Use the Latest LTS Node.js

Once `nvm-windows` is installed, use it to install the official Long-Term Support (LTS) version of Node.js. LTS versions offer the best stability and compatibility.

1.  Open a **new** command prompt or PowerShell window **as an Administrator**.
2.  Install the latest LTS version by running:
    ```bash
    nvm install lts
    ```
3.  Tell `nvm` to use the version it just installed (the version number will be in the output of the previous command):
    ```bash
    nvm use <version_number> # e.g., nvm use 22.11.0
    ```
4.  Verify that Node.js and npm are installed correctly:
    ```bash
    node -v
    npm -v
    ```

### Step 3: Install Python

The build tool `node-gyp` requires a compatible version of Python.

1.  Download a recent version of Python (e.g., 3.11 or 3.12) from the [official Python website](https://www.python.org/downloads/windows/).
2.  Run the installer. **Crucially, on the first screen of the installer, check the box that says "Add Python to PATH"**. This is a very important step.

### Step 4: Install and Configure Visual Studio Build Tools

This is the most critical part, as it provides the necessary C++ compiler and libraries.

1.  Go to the [Visual Studio Downloads page](https://visualstudio.microsoft.com/downloads/).
2.  Scroll down to the "All downloads" section, expand "Tools for Visual Studio", and download the **"Build Tools for Visual Studio 2022"**.
3.  Run the installer. You will be prompted to select components to install.
4.  **Workloads Tab:** Check the box for **"Desktop development with C++"**.
5.  **Individual Components Tab:** This is the key step that resolved our specific error.
    - Click on the **"Individual components"** tab.
    - Use the search bar to find and select **"MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)"**.
6.  Click **Install** to complete the setup. A system reboot is recommended after the installation finishes.

### Step 5: Configure the Project and Install Dependencies

With the build environment now fully configured, you can set up the project.

1.  Open a **new** command prompt or PowerShell window **as an Administrator**.
2.  If you don't already have it, install Yarn globally. We found it provided more reliable error reporting than npm.
    ```bash
    npm install -g yarn
    ```
3.  Navigate to your project directory (e.g., `cd C:\Users\luigi\Documents\GitHub\athanor`).
4.  Clean any old installation attempts:
    ```bash
    rm -rf node_modules package-lock.json yarn.lock
    ```
5.  Run the installation using Yarn:
    ```bash
    yarn install
    ```
    This should now successfully download and compile `node-pty` without errors.

### Step 6: Final Rebuild for Electron

The final step is to ensure `node-pty` is compiled specifically against Electron's internal version of Node.js, not the system version.

1.  While still in your project directory (in an Administrator terminal), run the rebuild command:
    ```bash
    yarn electron-rebuild -w node-pty
    ```
2.  Once complete, you can start your Electron application:
    ```bash
    yarn start
    ```

Your environment is now fully configured, and the application should run with the integrated terminal functionality enabled.
