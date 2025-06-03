# Contributing to Athanor

Welcome, and thank you for your interest in contributing to Athanor! We're excited to have you join our community. During this pre-alpha stage, we especially value feedback and input from users to help shape Athanor's development.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Setting Up Your Development Environment](#setting-up-your-development-environment)
- [Making Changes](#making-changes)
  - [Coding Standards](#coding-standards)
  - [Commit Messages](#commit-messages)
  - [Testing](#testing)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Contribution Licensing & Developer Certificate of Origin (DCO)](#contribution-licensing--developer-certificate-of-origin-dco)
- [Architectural Overview](#architectural-overview)

## Ways to Contribute

> **Note:** As Athanor is in its pre-alpha stage, we are primarily focused on gathering user feedback to guide development. While code contributions that align with discussed issues are accepted, our current priority is understanding how Athanor fits into developers' workflows.

The most valuable contributions at this stage include:

- **Sharing User Experience Feedback:**

  - Tell us about your workflow, what works well, what doesn't, and how Athanor fits (or doesn't fit) into your development process. This feedback is invaluable during our pre-alpha stage.
  - Share your experiences in the [Discussions forum](https://github.com/lacerbi/athanor/discussions).

- **Supporting Athanor:**
  - Consider [sponsoring the project on GitHub](https://github.com/sponsors/lacerbi) to support its development.

- **Reporting Bugs:**

  - Before submitting a new bug, please [search existing issues](https://github.com/lacerbi/athanor/issues) to avoid duplicates.
  - If the bug hasn't been reported, [create a new issue](https://github.com/lacerbi/athanor/issues/new/choose). We aim to have templates to guide you.
  - **Security Vulnerabilities:** If you discover a security vulnerability, please report it privately.

- **Suggesting Enhancements:**

  - For new features or significant changes, please start by [opening a discussion in the "Ideas" category](https://github.com/lacerbi/athanor/discussions/new?category=ideas) or a feature request issue. This helps us discuss the proposal and ensure it aligns with the project's vision.

- **Improving Documentation:**

  - Our documentation, including the `README.md`, `TUTORIAL.md`, `PROJECT.md`, and module-specific `README.md` files (like those for LLM and Secure API Storage), can always be clearer or more comprehensive. Contributions like fixing typos, improving explanations, adding examples, or creating new guides are highly appreciated.

- **Contributing Code:**
  - While we're primarily focused on gathering feedback during this pre-alpha stage, code contributions that align with discussed issues or features are also accepted. Please discuss significant code changes in an issue or discussion first to ensure they align with our current development priorities.

## Setting Up Your Development Environment

For those interested in exploring the codebase or contributing code:

1.  **Prerequisites:**

    - [Node.js](https://nodejs.org/) (latest LTS version, currently v18.x+ is recommended, as per Athanor's `README.md`).
    - `npm` (which is included with Node.js).
    - Git.

2.  **Fork and Clone:**

    - If you plan to contribute code, first fork the `lacerbi/athanor` repository on GitHub.
    - Clone your fork to your local machine: `git clone https://github.com/YOUR_USERNAME/athanor.git`
    - Navigate into the project directory: `cd athanor`
    - Add the original Athanor repository as an upstream remote: `git remote add upstream https://github.com/lacerbi/athanor.git`

3.  **Install Dependencies:**

    - Run `npm install` in the project root to install all necessary dependencies (as per Athanor's `package.json`).

4.  **Recommended Tools & Configuration:**

    - **VS Code:** If you use Visual Studio Code, it may prompt you to install recommended extensions listed in `.vscode/extensions.json`. These extensions for ESLint, Prettier, and TypeScript can help you adhere to our coding standards.
    - **ESLint & Prettier:** Athanor uses ESLint for identifying and reporting on patterns in JavaScript/TypeScript and Prettier for consistent code formatting. Please ensure your contributions adhere to these standards. Configuration files (`.eslintrc.js`, `.prettierrc.js` or similar) are in the project root.

5.  **Running Athanor Locally:**
    - Use `npm run dev` to start the application in development mode. This typically starts the Webpack dev server for the renderer process and runs the Electron main process. (as per Athanor's `package.json`).

## Making Changes

### Coding Standards

- **TypeScript:** Athanor is built with TypeScript (v5+). Write clean, well-typed, and maintainable code.
  - Be mindful of Athanor's global type definitions in `src/types/global.d.ts`. If you modify IPC method signatures or the preload bridge (`electron/preload.ts`), ensure these global types are updated accordingly.
- **React:** For UI components, follow standard React (v18+) conventions and best practices.
- **Styling:** Athanor uses TailwindCSS 3 and some Material-UI (MUI) 5 components. Strive for consistency with the existing UI.
- **Electron Architecture:** Adhere to Electron's main/renderer process separation:
  - For direct file system operations, use functions from `fileSystemManager.ts` (in `electron/`) within the main process. These are typically exposed to the renderer via IPC handlers defined in `electron/handlers/`.
  - For UI features requiring file system information, use `fileSystemService.ts` (in `src/services/`) in the renderer process, which communicates with the main process via IPC.
- **Linting & Formatting:**
  - Before committing, run `npm run lint` to check your code for linting errors.
  - Run `npm run format` (or configure your editor to use Prettier on save) to automatically format your code.
  - All submitted code must pass linting and formatting checks.

### Commit Messages

- Please follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/). This practice helps in automating changelog generation and makes the project history easier to understand.
  - **Format:** `<type>[optional scope]: <description>`
  - **Examples:**
    - `feat: add user preference for dark mode`
    - `fix(renderer): correct layout issue in FileExplorer`
    - `docs: update instructions for setting up dev environment`
    - `style: apply consistent padding to action buttons`
    - `refactor(main): simplify logic in ignoreRulesManager`
    - `test(common): add unit tests for path normalization utility`
- Write clear, concise, and descriptive commit messages.
- If your commit addresses a specific GitHub issue, reference it in the commit body (e.g., `Closes #123`).

### Testing

- Athanor uses Jest for unit tests, with tests often co-located with the source files (e.g., `FileService.test.ts` alongside `FileService.ts`).
- Write unit tests for new features and bug fixes to ensure correctness and prevent regressions.
- Run all tests using `npm test` and ensure they pass before submitting your changes.
- If you modify existing functionality, update the corresponding tests.
- Refer to existing tests for examples of how to mock dependencies, including Electron modules and Node.js `fs/promises`.

## AI-Generated Code and Content

Athanor itself is a testament to the power of AI-assisted development: its codebase has been almost entirely (around 99%) generated using Large Language Models (LLMs) and, since v0.1.0, fully developed and integrated using Athanor's own workflows. This process, while highly efficient, is actively guided by human developers. Accurate prompting, careful review, and occasional direct steering are crucial, as LLMs, at their current stage, can sometimes propose incorrect changes or lead to suboptimal code if left unmonitored.

If you choose to contribute code, whether written by a human or an AI coding assistant, please ensure that:

- The code meets the same high standards outlined in our [Coding Standards](#coding-standards).
- You have thoroughly reviewed, tested, and understood any AI-generated code before submitting it. You are ultimately responsible for the changes you propose.
- Contributions, whether AI-assisted or not, should consist of targeted, point-wise additions or modifications.
- For any contributions, especially those spanning multiple files or introducing significant new features, we ask for plans to be discussed with the active developers (e.g., by opening an issue or discussion) _before_ extensive work is undertaken. This helps ensure alignment with the project's direction and avoids duplicated effort.

## Submitting Pull Requests (PRs)

If you are submitting a code contribution, please follow these steps to ensure a smooth process:

1.  **Create a Branch:** Create a new branch from the `main` branch for your changes: `git checkout -b type/descriptive-branch-name` (e.g., `feat/new-task-template-system` or `fix/resolve-diff-view-glitch`).
2.  **Keep PRs Focused:** Submit one PR per feature or bug fix. Smaller, focused PRs are easier and quicker to review and merge.
3.  **Stay Updated:** Before submitting your PR, ensure your branch is up-to-date with the `upstream/main` branch:
    ```bash
    git fetch upstream
    git rebase upstream/main
    # Resolve any conflicts, then continue the rebase if necessary
    ```
4.  **Pre-Submission Checklist:**
    - All tests pass (`npm test`). Automated checks will verify this on your PR.
    - Code is linted (`npm run lint`) and formatted (`npm run format`).
    - Commit messages adhere to Conventional Commits and are signed off (see DCO section below). Automated checks will verify DCO on all commits.
    - Relevant documentation (code comments, `README.md`s, `TUTORIAL.md`) has been updated if your changes affect it.
    - The application builds and runs correctly with your changes.
5.  **Open the Pull Request:**
    - Push your branch to your fork on GitHub: `git push origin type/descriptive-branch-name`.
    - Go to the Athanor repository on GitHub (`lacerbi/athanor`) and open a pull request from your branch to the `lacerbi/athanor:main` branch.
    - Provide a clear and descriptive title and summary for your PR. Explain the purpose of your changes ("what" and "why").
    - If applicable, include steps for reviewers to test your changes or screenshots for UI modifications.
    - Link any GitHub issues that your PR resolves (e.g., `Fixes #123` or `Implements #456`).

## Contribution Licensing & Developer Certificate of Origin (DCO)

We want to ensure that Athanor remains a freely available and reliable open-source tool. To manage contributions effectively:

- **License:** By submitting code, documentation, or any other materials (collectively, "Contributions") to the Athanor project, you agree that your Contributions will be licensed under the same **Apache License 2.0** that governs the project. You can find a copy of the license in the `LICENSE` file at the root of the repository.
- **Developer Certificate of Origin (DCO):** To ensure that all contributions are legitimately contributed, we require that all contributors agree to the Developer Certificate of Origin (DCO) 1.1. The DCO is a simple statement that you, as a contributor, have the right to submit your contribution and that you are doing so under the project's open-source license. You can read the full text of the DCO [here](https://developercertificate.org/).
  To signify your agreement to the DCO for your contributions, you must **sign off** on every commit. This is done by adding a `Signed-off-by:` line to your commit messages:
  ```
  Signed-off-by: Your Real Name <your.email@example.com>
  ```
  If you have set your `user.name` and `user.email` in your Git configuration, you can sign your commit automatically using `git commit -s`.
- **Automated Checks:** Pull requests will be checked automatically to ensure all commits include the `Signed-off-by:` line.

## Architectural Overview

Athanor is an Electron-based application with a clear separation between the main process and the renderer (React UI) process. Before diving into complex changes, it's helpful to understand its structure:

- **Core Architecture:** Review the "Core Architecture" section in `PROJECT.MD` for an overview of the main and renderer processes.
- **Main Process Components:** Key TypeScript modules in `electron/` include:
  - `main.ts`: Application startup and window creation.
  - `ipcHandlers.ts`: Aggregates all IPC handlers.
  - Managers like `fileSystemManager.ts`, `ignoreRulesManager.ts`, and `filePathManager.ts` for core backend logic.
  - The `electron/modules/` directory contains specialized modules like `llm/` (for LLM integration) and `secure-api-storage/` (for API key management).
- **Renderer Process Components:** Key areas in `src/`:
  - `AthanorApp.tsx` and `MainLayout.tsx`: Define the overall UI structure.
  - React components in `src/components/`.
  - Zustand stores in `src/stores/` for state management (e.g., `fileSystemStore.ts`, `workbenchStore.ts`).
  - Services like `fileSystemService.ts` that abstract IPC communication for the UI.
- **IPC Communication:** Communication between processes relies on IPC channels defined in `electron/preload.ts` and typed in `src/types/global.d.ts`.

Familiarizing yourself with these aspects will help you make effective contributions. The `PROJECT.MD` file is your primary guide for in-depth architectural details and action points for development.

---

Thank you for taking the time to read this document and for your interest in Athanor's development! Your feedback and engagement during this pre-alpha stage are crucial to shaping the future of this tool.
