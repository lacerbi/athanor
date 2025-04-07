# Athanor - AI Code Nexus

Athanor is an Electron-based desktop application that integrates AI coding assistants into a developer's local workflow. It streamlines the process of creating prompts with relevant code context and applying AI-generated changes back to your codebase.

## Key Features

- **Dynamic File Explorer**: Browse your project with automatic file tracking, line counting, and intelligent file exclusion through `.athignore` rules
- **Prompt Creation & Refinement**: Select files/folders and generate specialized prompts for your AI assistant using customizable templates
- **Apply AI-Generated Changes**: Copy AI responses back to Athanor to parse custom XML commands that create, modify, or delete files
- **Task & Prompt Management**: Organize your work with multiple task tabs, each containing a description and AI output area
- **Project Setup**: Easily configure projects with `.athignore` files (optionally seeded from `.gitignore`)
- **Visual Diff Viewer**: Preview changes before applying them with a GitHub-style diff interface
- **Flexible UI Layout**: Navigate between file explorer, task workspace, and apply changes panels with an intuitive interface

## Technology Stack

- **Electron**: Powers the cross-platform desktop application
- **React**: Provides the front-end UI framework with TypeScript
- **Node.js**: Handles file system operations and back-end functionality
- **Zustand**: Manages application state across components
- **Chokidar**: Watches file system for changes
- **TailwindCSS**: Styles the UI with a utility-first approach
- **Material-UI (MUI)**: Provides additional UI components

## Development Setup

### Prerequisites

- **Git**: For cloning the repository
- **Node.js**: Latest LTS version recommended (v18.x+)

#### Installing Node.js

- **Windows**: Download and install from [nodejs.org](https://nodejs.org/)
- **macOS**: Using Homebrew: `brew install node`
- **Linux**:
  - Ubuntu/Debian: `sudo apt update && sudo apt install nodejs npm`
  - Fedora: `sudo dnf install nodejs npm`
  - Or use [NVM](https://github.com/nvm-sh/nvm) (recommended): `nvm install --lts`

### Installation & Running

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/athanor.git
   ```

2. Navigate to the project directory:
   ```bash
   cd athanor
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the application in development mode:
   ```bash
   npm run dev
   ```
   This command will concurrently:
   - Start the Webpack dev server for the renderer process
   - Watch and compile the preload script
   - Launch the Electron application with hot reloading

## Basic Usage

1. When Athanor launches, you'll be prompted to select a project folder
2. The application will scan your project files and display them in the file explorer
3. Select relevant files or folders for your task
4. Use the prompt templates to generate context-aware prompts for your AI assistant
5. Copy the generated prompt to your AI assistant (e.g., ChatGPT, Claude)
6. When you receive AI-generated code changes, copy them back to Athanor
7. Preview the changes in the diff viewer and apply them to your project

## Contributing

Contributions are welcome! Please follow standard GitHub fork & pull request workflows.

## License

[Specify your license here]
