# ⚗️ <img src="./resources/images/athanor_logo.png" alt="Athanor Logo" height="32"> — AI Workbench  <sub><sub></sub></sub>
> *where modern alchemists cook*

[![Status: WIP](https://img.shields.io/badge/Status-Work%20In%20Progress-yellow)](https://github.com/lacerbi/athanor)
[![Stage: Pre-Alpha](https://img.shields.io/badge/Stage-Pre--Alpha-orange)](https://github.com/lacerbi/athanor)
[![Node.js >=18.x](https://img.shields.io/badge/Node.js-%3E%3D18.x-brightgreen)](https://nodejs.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Athanor is a desktop app for AI-assisted workflows, from coding to technical writing. **Athanor does not require API keys.**

Open a project folder, select files, specify your task, and quickly create effective prompts with all the relevant context to paste into any LLM chat interface like ChatGPT, Claude, or Gemini.
Athanor then assists in efficiently integrating the AI-generated responses back into your project or codebase, ensuring **you remain in full control of all changes while minimizing tedious copy-paste**.

> 🚧 **WORK IN PROGRESS**: 🚧 This project is in pre-alpha stage, so expect the glassware to be unpolished, reagents to be unstable, and formulas to occasionally yield unexpected outcomes.

## 📋 Table of Contents

- [Key Features](#key-features)
- [Installation Setup](#installation-setup)
- [Basic Usage](#basic-usage)
- [Development](#development)
- [License](#license)

## ✨ Key Features

- **Smart Context Selection**: Easily choose files & folders for your AI prompt, or let the "Autoselect" feature intelligently pick relevant context directly from your local project or codebase.
- **Seamless AI Chat Integration**: Works effortlessly with your favorite AI assistants (like ChatGPT, Claude, Gemini). Just copy from Athanor to your AI, and paste the response back – no API keys needed for the core workflow!
- **Workflow-Tailored Prompts**: Jumpstart your coding tasks with specialized prompt templates designed for a natural development flow: "Autoselect" relevant files, "Query" your project, "Architect" new features, "Code" implementations or "Write" text.
- **Controlled Changes**: Paste AI responses into Athanor. Preview all proposed file changes (creations, updates, deletions) in a clear visual diff viewer, then accept or reject each one individually before any edit is written to disk.
- **Optional Direct API Automation**: For advanced users or specific automated tasks (like "Autoselect"), Athanor allows direct connection to LLMs via API keys.
- **Organized Multi-Task Workspace**: Manage several coding challenges at once using dedicated "task tabs," each with its own description, context, and AI output area, keeping your work focused and efficient.

## 🚀 Installation Setup

Athanor is currently available in developer mode.

**Prerequisites:** Running Athanor will require **Node.js** (latest LTS version, v18.x+).

#### Installing Node.js

- **Windows**: Download and install from [nodejs.org](https://nodejs.org/)
- **macOS**: Using Homebrew: `brew install node`
- **Linux**:
  - Ubuntu/Debian: `sudo apt update && sudo apt install nodejs npm`
  - Fedora: `sudo dnf install nodejs npm`
  - Or use [NVM](https://github.com/nvm-sh/nvm) (recommended): `nvm install --lts`

### Installation & Running

1. **Clone the repository**: `git clone https://github.com/lacerbi/athanor.git`

- Or simply [**download it**](https://github.com/lacerbi/athanor/archive/refs/heads/llm-api-calls.zip)

2. **Navigate to the project directory**: `cd athanor`
3. **Install dependencies**: `npm install`
4. **Run the application in development mode**: `npm run dev`

- You can also compile it into an executable with `npm run package`

## 💡 Basic Usage

1. When Athanor launches, you'll be prompted to select a project folder
2. The application will scan your project files and display them in the file explorer
3. Select relevant files or folders for your task
4. Use the prompt templates to generate context-aware prompts for your AI assistant
5. Copy the generated prompt to your AI assistant (we recommend Claude, but others such as ChatGPT, Gemini, etc. might work)
6. When you receive AI-generated code changes, copy them back to Athanor
7. Preview the changes in the diff viewer and apply them to your project

Read the [**full tutorial**](TUTORIAL.md).

## 👥 Development

Athanor is being developed by [Luigi Acerbi](https://lacerbi.github.io/) for use in the [Machine and Human Intelligence Group](https://www.helsinki.fi/en/researchgroups/machine-and-human-intelligence).

Contributions are welcome! Please follow standard GitHub fork & pull request workflows.

## 📜 License

Athanor is released under the [Apache-2.0 license](LICENSE).
