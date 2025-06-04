# ⚗️ <img src="./resources/images/athanor_logo.png" alt="Athanor Logo" height="32"> — AI Workbench <sub><sub></sub></sub>

> _where modern alchemists cook_

[![Version](https://img.shields.io/github/package-json/v/lacerbi/athanor?label=Version)](https://github.com/lacerbi/athanor)
[![Status: WIP](https://img.shields.io/badge/Status-Work%20In%20Progress-yellow)](https://github.com/lacerbi/athanor)
[![Stage: Alpha](https://img.shields.io/badge/Stage-Alpha-yellow)](https://github.com/lacerbi/athanor)
[![Sponsor me on GitHub](https://img.shields.io/badge/Sponsor-%E2%9D%A4-%23db61a2.svg?logo=GitHub)](https://github.com/sponsors/lacerbi)
[![Node.js >=18.x](https://img.shields.io/badge/Node.js-%3E%3D18.x-brightgreen)](https://nodejs.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Athanor is a desktop app for AI-assisted workflows, from coding to technical writing. **Athanor does not require API keys.**

Open a project folder, select files, specify your task, and quickly create effective prompts with all the relevant context to paste into any LLM chat interface like ChatGPT, Claude, or Gemini.
Athanor then assists in efficiently integrating the AI-generated responses back into your project or codebase, ensuring **you remain in full control of all changes while minimizing tedious copy-paste**.

<p align="center">
  <img src="./resources/images/athanor_snapshot.png" alt="Athanor AI Workbench Snapshot" width="750">
  <br>
  <em>Athanor's interface: File explorer (left), task management and prompt generation (right).</em>
</p>
<p align="center">
  <img src="./resources/images/athanor_snapshot_apply_changes.png" alt="Athanor AI Workbench Apply Changes Snapshot" width="750">
  <br>
  <em>'Apply Changes' panel: Review and accept/reject diffs generated using any AI chat assistant.</em>
</p>

> 🚧 **WORK IN PROGRESS & ALPHA STAGE**: 🚧 Expect the glassware to be unpolished, reagents to be unstable, and formulas to occasionally yield unexpected outcomes. Features may evolve, and your feedback during this critical phase is invaluable for shaping Athanor's development. Please see our [Development and Feedback](#-development-and-feedback) section below for how to contribute.

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Installation Setup](#-installation-setup)
- [Basic Usage](#-basic-usage)
- [Development and Feedback](#-development-and-feedback)
- [License](#-license)

## ✨ Key Features

- **Smart Context Selection**: Easily choose files & folders for your AI prompt, or let the "Autoselect" feature intelligently pick relevant context directly from your local project or codebase.
- **Seamless AI Chat Integration**: Works effortlessly with your favorite AI assistants (like ChatGPT, Claude, Gemini). Just copy from Athanor to your AI, and paste the response back – no API keys needed for the core workflow!
- **Workflow-Tailored Prompts**: Jumpstart your coding tasks with specialized prompt templates designed for a natural development flow: "Autoselect" relevant files, "Query" your project, "Architect" new features, "Code" implementations or "Write" text.
- **Controlled Changes**: Paste AI responses into Athanor. Preview all proposed file changes (creations, updates, deletions) in a clear visual diff viewer, then accept or reject each one individually before any edit is written to disk.
- **Custom Templates**: Create your own prompt and task templates via global and project-specific configuration to tailor Athanor to your workflow.
- **Optional Direct API Automation**: For advanced users or specific automated tasks (like "Autoselect"), Athanor allows direct connection to LLMs via API keys.

## 🔗 Official Resources

- **Main Website:** [athanor.works](https://athanor.works/)
- **Full Tutorial:** [docs.athanor.works/tutorial/introduction](https://athanor.works/docs/tutorial/introduction)
- **Development Blog:** [athanor.works/blog](https://athanor.works/blog)

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

## 💡 Quick Start

1. When Athanor launches, you'll be prompted to select a project folder
2. The application will scan your project files and display them in the file explorer
3. Describe the desired task in the Task Description area (e.g., "implement a new function to sort users by registration date")
4. Select relevant files or folders for your task from the file manager
5. Use the prompt templates to generate prompts for your AI assistant, including:

   - **Autoselect**: Ask an LLM to select the best files for your task
   - **Query**: Ask questions about your existing codebase
   - **Coder**: Directly implement the desired feature
   - **Architect**: Plan a complex feature over possibly multiple steps

6. Copy the generated prompt into your AI assistant interface (e.g., Claude, Gemini, ChatGPT)

   - We recommend strong models, such as Claude 4 Sonnet or Gemini 2.5 Pro, but others might work

7. Copy the AI generated response and click on **Apply AI Output** in Athanor

   - Preview proposed changes in the diff viewer and apply them to your project

<details>
  <summary><strong>View Example Workflows (Click to expand)</strong></summary>

### Example Workflows

- **Simple Feature**: Add a dark mode toggle to the application.

  1.  Task Description: `"Implement a dark mode toggle switch in the settings panel that saves the user's preference."`
  2.  Select files manually (e.g., `SettingsPanel.tsx`, `themeStore.ts`) or use the **Autoselect** prompt, then **Apply AI Output**.
  3.  Use the **Coder** prompt, then **Apply AI Output**.
  4.  Review and apply changes in the diff viewer.

- **Complex Feature**: Integrate a new payment gateway (e.g., Stripe) for subscriptions.

  1.  Task Description: `"Integrate Stripe for handling monthly user subscriptions. This should include creating subscription plans, handling webhooks for payment success/failure, and updating user subscription status."`
  2.  Use the **Autoselect** prompt to identify relevant files, then **Apply AI Output**.
  3.  Use the **Architect** prompt to break down the integration into manageable steps, denoted as Commits (e.g., Commit 1: Setup Stripe SDK and API keys; Commit 2: Implement plan selection UI; Commit 3: Handle checkout session creation; Commit 4: Implement webhook endpoint). Then **Apply AI Output**.
  4.  Select Commit 1 from the "Context" area just below the Task description and use the **Coder** prompt.
  5.  After each **Coder** response, **Apply AI Output**, review the changes for that step in the diff viewer, and accept/reject.
  6.  If needed, discuss with your AI assistant to fix issues and apply further changes.
  7.  Once the commit is completed, proceed to the next step from the Architect's plan either in the same chat (e.g., "Proceed with Commit 2"), or generating a new **Coder** prompt with "Commit 2" as context.

- **Query Project**: Understand how user authentication is currently handled.
  1.  Task Description: `"Explain the current user authentication flow, including token generation, storage, and validation. Which files are primarily involved?"`
  2.  Use the **Autoselect** prompt to identify potentially relevant auth-related files, then **Apply AI Output**.
  3.  Use the **Query** prompt to ask your question, then review the AI's explanation.
  4.  Continue the discussion in the AI chat if you have follow-up questions based on the AI's response.

</details>

Read the [**full online tutorial**](https://athanor.works/docs/tutorial/introduction) or the [local version](https://www.google.com/search?q=TUTORIAL.MD) for more detailed information.

## 👥 Development and Feedback

Athanor is being developed by [Luigi Acerbi](https://lacerbi.github.io/).

This project is in its alpha stage, and your feedback is crucial to help us improve and shape Athanor's development. We are primarily focused on understanding how Athanor fits into real-world development workflows.

- **User Experience Feedback:** Share your workflow experiences, what works well, what doesn't, and how Athanor fits into your development process. This is the most valuable contribution at this stage.
- **General Questions, Ideas & Discussions:** Join the conversation on [GitHub Discussions](https://github.com/lacerbi/athanor/discussions).
- **Bug Reports & Specific Feature Requests:** Please submit them via [GitHub Issues](https://github.com/lacerbi/athanor/issues). _(Consider using our issue templates for bugs and features.)_
- **Contributing:** For those interested in contributing, our [CONTRIBUTING.md](CONTRIBUTING.md) file provides detailed information. While we accept code contributions that align with discussed issues, our current focus is on gathering user feedback. All contributions are licensed under the Apache License 2.0 and require agreement to the Developer Certificate of Origin (DCO) by signing off on commits.

## 📜 License

Athanor is released under the [Apache-2.0 license](LICENSE).
