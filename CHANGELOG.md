# Changelog

All notable changes to Athanor - AI Workbench will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_(Future changes will go here)_

## [0.7.12] - 2025-07-05

### Changed

- **Migrated to genai-lite v0.1.3 Preset System**: Refactored model preset management to use genai-lite's configurable preset system with 'replace' mode. This eliminates code duplication while maintaining full control over Athanor's model configurations. ([275e792](https://github.com/lacerbi/athanor/commit/275e792))
  - Removed local `AthanorModelPreset` type and `athanorPresetService`
  - Added IPC channel for fetching presets from the LLM service
  - Updated UI components to use genai-lite's `ModelPreset` type
  - Configuration now centralized through `src/config/athanorModelPresets.json`

### Fixed

- **Build Configuration**: Added JSON module resolution support to TypeScript and webpack configurations to properly handle preset configuration imports.

### Dependencies

- Updated `genai-lite` from v0.1.1 to v0.1.3

## [0.7.11] - 2025-07-04

### Added

- **Task Button for Agent Task Files**: Added a new "Task" button in the ActionPanel that creates agent task files in `.ath_materials` directory, making it easier to generate task descriptions for AI coding assistants. ([40acc63](https://github.com/lacerbi/athanor/commit/40acc63))
- **Supplementary Materials Section**: Added support for a dedicated "Supplementary Materials" section in AI prompts. Files from `.ath_materials` directory now appear in a separate section, keeping reference materials distinct from main project files. Includes new `{{supplementary_section}}` placeholder in all prompt templates. ([782c610](https://github.com/lacerbi/athanor/commit/782c610))
- **Repository Context Mapping**: Added "Build Context Map" task template that generates hierarchical summaries (`.summary_short.md` and `.summary_long.md`) for efficient codebase navigation by AI agents. ([d528115](https://github.com/lacerbi/athanor/commit/d528115))
- **Comprehensive Repository Summaries**: Generated summary files throughout the codebase covering all major directories and components, with instructions added to AI assistant files. ([ce20fdf](https://github.com/lacerbi/athanor/commit/ce20fdf))

### Changed

- **Agent Task Command Enhancement**: Agent task command now triggers task description updates for better workflow integration. ([8a33f90](https://github.com/lacerbi/athanor/commit/8a33f90))

### Fixed

- **Task Template File Extension**: Renamed `task_build_repomap.md` to `task_build_repomap.xml` to match expected format. ([7b0c23b](https://github.com/lacerbi/athanor/commit/7b0c23b))

### Documentation

- Updated prompt documentation and examples to include the new `{{supplementary_section}}` placeholder. ([eae04bf](https://github.com/lacerbi/athanor/commit/eae04bf), [cfd596d](https://github.com/lacerbi/athanor/commit/cfd596d))
- Updated repository mapping task documentation. ([30bab77](https://github.com/lacerbi/athanor/commit/30bab77))
- Removed XML content from `PROJECT.md` to avoid parsing issues. ([2b915a7](https://github.com/lacerbi/athanor/commit/2b915a7))

## [0.7.10] - 2025-07-03

### Changed

- **Migrated to External LLM Module**: Replaced integrated LLM implementation (`electron/modules/llm/`) with external `genai-lite` package (^0.1.0) for better maintainability and separation of concerns. This significant refactoring maintains full backward compatibility while simplifying the codebase.
- **Improved API Key Handling**: Enhanced the ApiKeyProvider to support both secure storage and environment variable fallbacks seamlessly.
- **Centralized IPC Constants**: Moved LLM IPC channel constants to `common/types/llm.ts` for better code organization and reusability.
- **Updated Build Configuration**: Modified webpack configurations to include the new `common/` directory for TypeScript compilation.

### Fixed

- **Environment Variable Support**: Restored environment variable fallback functionality that was temporarily lost during the initial genai-lite migration.
- **Documentation Error**: Corrected environment variable name from `ATHANOR_GOOGLE_API_KEY` to `ATHANOR_GEMINI_API_KEY` to match the actual provider ID.

### Documentation

- Updated `CLAUDE.md` and `PROJECT.md` to reflect the new architecture using `genai-lite`.
- Added documentation for the `common/types/` directory pattern for shared types.
- Added Mistral to the list of supported environment variables in troubleshooting guide.

## [0.7.9] - 2025-07-03

### Added

- **API Key Environment Variable Fallback**: Implemented fallback support for API keys via environment variables when secure keyring storage is unavailable (e.g., on WSL systems). Keys can now be provided as `ATHANOR_<PROVIDER>_API_KEY` environment variables. ([0f8d36d](https://github.com/lacerbi/athanor/commit/0f8d36d), [9c06b83](https://github.com/lacerbi/athanor/commit/9c06b83), [fdbb0a0](https://github.com/lacerbi/athanor/commit/fdbb0a0))

### Changed

- **Refactored API Key Storage**: Replaced internal API key module with external `genai-key-storage-lite` module for better maintainability and separation of concerns. ([6574652](https://github.com/lacerbi/athanor/commit/6574652))
- Modified copied task instructions to add thinking capability. ([b493937](https://github.com/lacerbi/athanor/commit/b493937))

### Documentation

- Updated troubleshooting guide with instructions for using environment variable fallback for API keys, including examples for different providers. ([7385e5c](https://github.com/lacerbi/athanor/commit/7385e5c))
- Added design documentation for porting to the new API key module. ([4dbb8ff](https://github.com/lacerbi/athanor/commit/4dbb8ff))

## [0.7.8] - 2025-07-02

### Added

- A new `agent_task` command for advanced, agent-based workflows, including clickable log entries and dynamic prompt updates. ([a69b80c](https://github.com/lacerbi/athanor/commit/a69b80c), [94aa97f](https://github.com/lacerbi/athanor/commit/94aa97f), [67ba73e](https://github.com/lacerbi/athanor/commit/67ba73e))
- Enhanced `CREATE` file operation to allow overwriting existing files with a clear user warning. ([4e2027a](https://github.com/lacerbi/athanor/commit/4e2027a))
- Listeners for `Ctrl+C`/`Ctrl+V` to improve clipboard interaction. ([7743aa8](https://github.com/lacerbi/athanor/commit/7743aa8))

### Changed

- Updated the agentic architect prompt for better performance. ([4e2027a](https://github.com/lacerbi/athanor/commit/4e2027a))

### Fixed

- Corrected paste behavior within the application. ([bfb3a3e](https://github.com/lacerbi/athanor/commit/bfb3a3e))
- Added `ELECTRON_USE_DESKTOP_GL` environment flag to mitigate potential rendering issues. ([87ba6e3](https://github.com/lacerbi/athanor/commit/87ba6e3))
- Minor text clarifications in the Review panel for better usability. ([ef6d6d5](https://github.com/lacerbi/athanor/commit/ef6d6d5))

### Documentation

- Added `GEMINI.md` and updated `CLAUDE.md` to provide guidance for different AI models. ([b2f15cb](https://github.com/lacerbi/athanor/commit/b2f15cb), [fdc032d](https://github.com/lacerbi/athanor/commit/fdc032d))
- Clarified that Prettier is used for code formatting. ([c02b34a](https://github.com/lacerbi/athanor/commit/c02b34a))

### Tests

- Fixed and updated unit tests to align with the new `agent_task` command. ([8050594](https://github.com/lacerbi/athanor/commit/8050594))

## [0.7.7] - 2025-07-01

### Added

- **Git Diff Viewer**: A new "Git" mode in the Review panel allows users to view and revert local file changes (staged and unstaged) directly within the app. ([6d7af8c](https://github.com/lacerbi/athanor/commit/6d7af8c), [4b91851](https://github.com/lacerbi/athanor/commit/4b91851), [9911aab](https://github.com/lacerbi/athanor/commit/9911aab))
- Added a "Clear" button to the Review panel to easily dismiss its content. ([e7bc3b8](https://github.com/lacerbi/athanor/commit/e7bc3b8))
- Added a new "architect" prompt for agent-based workflows. ([9ca3712](https://github.com/lacerbi/athanor/commit/9ca3712))

### Changed

- Renamed the "Apply Changes" panel to "Review" to better reflect its dual purpose of handling both AI-suggested changes and Git diffs. ([6d7af8c](https://github.com/lacerbi/athanor/commit/6d7af8c))
- The Review panel UI now provides more intuitive text and warnings, adapting its guidance based on whether it is in "AI" or "Git" mode. ([e006b8a](https://github.com/lacerbi/athanor/commit/e006b8a))

### Fixed

- The Git diff view now correctly displays changes for newly created and deleted files. ([ff34d74](https://github.com/lacerbi/athanor/commit/ff34d74))
- Git-related features are now correctly disabled when the opened project is not a Git repository. ([9fe4622](https://github.com/lacerbi/athanor/commit/9fe4622))
- The application now properly refreshes its Git context when switching between projects. ([fc53c72](https://github.com/lacerbi/athanor/commit/fc53c72))
- Corrected a path resolution error during application startup. ([d86015e](https://github.com/lacerbi/athanor/commit/d86015e))
- The "Selected Files" list now correctly filters out folders and non-existent file paths. ([c68b40b](https://github.com/lacerbi/athanor/commit/c68b40b))

### Documentation

- Added a note that `npm run package` is the standard method for creating test builds. ([d86015e](https://github.com/lacerbi/athanor/commit/d86015e))
- Added a design document for the new Git diff feature. ([d13bd0f](https://github.com/lacerbi/athanor/commit/d13bd0f))

### Tests

- Updated and fixed unit tests to align with recent feature changes and refactoring. ([1ac9e9f](https://github.com/lacerbi/athanor/commit/1ac9e9f))

## [0.7.6] - 2025-06-30

### Added

- **Integrated CLI Tab**: A new panel providing a persistent, integrated shell that runs in the project's directory. This feature is supported on Windows and Linux. ([62c7e9a](https://github.com/lacerbi/athanor/commit/62c7e9a), [b3f04ac](https://github.com/lacerbi/athanor/commit/b3f04ac))
- **Troubleshooting Guide**: A new `TROUBLESHOOTING.md` file was added to help users resolve common issues. ([5ccd8b6](https://github.com/lacerbi/athanor/commit/5ccd8b6))

### Changed

- **macOS Support**: The CLI Tab feature is now officially marked as **unsupported** on macOS due to native dependency issues. A guide has been added to document the resolution attempts. ([9904172](https://github.com/lacerbi/athanor/commit/9904172))
- Added a note to the documentation that `electron-store`'s keyring functionality is unlikely to work correctly on WSL. ([f004d99](https://github.com/lacerbi/athanor/commit/f004d99))

### Fixed

- **CLI Stability**: Resolved numerous build and packaging issues related to the `node-pty` native dependency to ensure the CLI works reliably on Windows and Linux. ([a0b14e1](https://github.com/lacerbi/athanor/commit/a0b14e1), [625b28a](https://github.com/lacerbi/athanor/commit/625b28a), [e8e1fc1](https://github.com/lacerbi/athanor/commit/e8e1fc1))
- **CLI Persistence**: The integrated terminal session is now persistent and correctly managed by the application. ([6ea9bc8](https://github.com/lacerbi/athanor/commit/6ea9bc8), [16992f6](https://github.com/lacerbi/athanor/commit/16992f6))
- **Error Handling**: Implemented more robust error handling for opening external links on Linux. ([7932371](https://github.com/lacerbi/athanor/commit/7932371))
- The CLI tab is now automatically removed if the underlying shell process fails to launch, preventing a broken state. ([37df07c](https://github.com/lacerbi/athanor/commit/37df07c))

## [0.7.5] - 2025-06-28

### Added

- An option is now available in the project creation dialog to append default Athanor ignore rules to the project's `.gitignore` file. ([81b0a65](https://github.com/lacerbi/athanor/commit/81b0a65))
- Style matching has been introduced to writing prompts to improve the consistency of AI-generated content. ([456ed28](https://github.com/lacerbi/athanor/commit/456ed28))

### Changed

- Updated and expanded the main `PROJECT.md` documentation. ([1f5ceac](https://github.com/lacerbi/athanor/commit/1f5ceac))
- Created a new `docs/design` directory to better organize design specification documents. ([bb0d6a4](https://github.com/lacerbi/athanor/commit/bb0d6a4))

### Fixed

- Corrected various style comments in the codebase. ([16a92a8](https://github.com/lacerbi/athanor/commit/16a92a8))

## [0.7.4] - 2025-06-24

### Added

- "Accept All" and "Reject All" buttons to the Apply Changes panel for bulk handling of AI-suggested modifications ([ccd8609](https://github.com/lacerbi/athanor/commit/ccd8609)).
- Enhanced prompts to better keep track of edits within the currently active file ([034954a](https://github.com/lacerbi/athanor/commit/034954a)).

### Changed

- Replaced text-based navigation controls in the Apply Changes panel with icons for a cleaner user interface ([cd2f459](https://github.com/lacerbi/athanor/commit/cd2f459)).
- Moved the "Accept" and "Reject" buttons in the Apply Changes panel to the right side of the control bar for improved layout consistency ([4385c34](https://github.com/lacerbi/athanor/commit/4385c34)).

### Fixed

- Resolved a recurring issue where the application icon failed to display correctly on macOS in development mode ([d628e26](https://github.com/lacerbi/athanor/commit/d628e26), [be999f3](https://github.com/lacerbi/athanor/commit/be999f3)).

## [0.7.3] - 2025-06-24

### Added

- Implement implicit persistence for window state (size, position) in application settings ([2c9a904](https://github.com/lacerbi/athanor/commit/2c9a904)).

### Changed

- Updated various project dependencies to their latest versions ([3e5344b](https://github.com/lacerbi/athanor/commit/3e5344b), [e91aa01](https://github.com/lacerbi/athanor/commit/e91aa01)).

### Refactor

- Centralized application icons into the `/assets` directory and updated loading logic accordingly ([671f22f](https://github.com/lacerbi/athanor/commit/671f22f), [5f7812f](https://github.com/lacerbi/athanor/commit/5f7812f)).

### Documentation

- Improve the synchronization process for `TUTORIAL.md` by correctly stripping frontmatter and handling separators ([4102932](https://github.com/lacerbi/athanor/commit/4102932), [7d7429b](https://github.com/lacerbi/athanor/commit/7d7429b)).
- Update image paths within the tutorial documentation ([6cdf9cb](https://github.com/lacerbi/athanor/commit/6cdf9cb)).

## [0.7.2] - 2025-06-23

### Added

- Introduce recursive expand and collapse operations for directories in the file explorer's context menu ([a5dc1e4](https://github.com/lacerbi/athanor/commit/a5dc1e4)).

### Fixed

- Strengthen the parsing logic for `UPDATE_DIFF` operations and add related unit tests to improve reliability ([2dbfb3a](https://github.com/lacerbi/athanor/commit/2dbfb3a)).
- Add support for processing multiple `apply changes` command blocks within a single AI-generated output ([d16705f](https://github.com/lacerbi/athanor/commit/d16705f)).
- Resolve a performance issue in the `ApplyChangesPanel` by debouncing the scroll handler ([3f1984b](https://github.com/lacerbi/athanor/commit/3f1984b)).
- Ensure the 'Refactor Code' task prompt correctly incorporates the `threshold_line_length` project setting ([138e2c3](https://github.com/lacerbi/athanor/commit/138e2c3)).
- Improve the user experience for the new expand/collapse-all feature by refining UI feedback and behavior ([bac964c](https://github.com/lacerbi/athanor/commit/bac964c)).

## [0.7.1] - 2025-06-20

### Fixed

- Corrected the handling of nested `.gitignore` and `.athignore` files. Ignore patterns are now properly scoped to their containing directory, ensuring file exclusion behavior is consistent with Git's handling of path-relative rules. ([52d42a5](https://github.com/lacerbi/athanor/commit/52d42a5), [4286566](https://github.com/lacerbi/athanor/commit/4286566))

## [0.7.0] - 2025-06-20

### Added

- **Dynamic & Intelligent Context Builder**: A new core feature that automatically analyzes the project to find and score the most relevant files for a given task. This includes:
  - A comprehensive scoring engine with heuristics for code dependencies, task keywords, path matching, commit history, and more.
  - UI visualization of relevance scores in the file explorer.
  - An interactive display of files selected by the context builder.
- **Background Project Analysis**:
  - Project dependency and Git analysis now runs in a background worker thread to keep the UI responsive.
  - Implemented an intelligent trigger for automatic analysis and a manual "Re-analyze Project" button in the UI.
- **Build & Platform Support**:
  - Added build configurations and NPM scripts to support Linux (`.deb`, `.rpm`).
  - Improved application lifecycle and menu handling for macOS.
- **UI/UX Enhancements**:
  - Added a persistent "Word Wrap" toggle button to the File Viewer panel.
  - Implemented more robust navigation controls (previous/next file) in the "Apply Changes" panel.
  - Created a new `maxSmartContextTokens` setting for advanced control over AI context size.
- **Developer Experience**:
  - Added a GitHub Actions workflow to synchronize `TUTORIAL.md` from the official documentation website.

### Changed

- **Architecture**:
  - Major refactoring to move project analysis (`ProjectGraphService`) to a background worker, improving UI performance.
  - The Relevance Engine was updated to consume pre-computed data from the background analysis.
  - Centralized and improved dependency resolution logic.
- **Relevance Scoring**:
  - Refined and balanced scoring weights for path matching and other heuristics.
  - Improved task description parsing to filter out stopwords and short, meaningless tokens.
- **UI Layout**:
  - Refactored the display of selected files for a more compact and clear presentation.
  - The "Apply Changes" diff panel now has a fixed width for more consistent layout.
- **Dependencies**:
  - Updated model information for the Gemini 2.5 family.

### Fixed

- **Performance**:
  - Resolved a major performance issue causing the application to hang on macOS by refactoring the `ignoreRulesManager`.
  - Eliminated race conditions that could cause premature file tree display or inconsistent state in the `contextStore`.
- **macOS**:
  - Corrected an issue where the application would not function correctly in a packaged state due to an incorrect shell `PATH`.
  - Fixed bugs related to the application menu bar and window lifecycle on macOS.
- **Core Functionality**:
  - Fixed a bug where the `smart-preview` toggle was not working correctly.
  - Resolved multiple issues with the previous/next diff navigation in the "Apply Changes" panel.
  - Corrected a bug causing ignore rules to be cleared improperly.
  - Ensured the context store is cleared correctly when switching projects.

### Tests

- Added comprehensive unit tests for the new `DependencyResolver` and `PythonScanner`.
- Updated and fixed numerous existing tests for `GitService`, `ignoreRulesManager`, and `buildTaskAction` to align with architectural changes.

## [0.6.8] - 2025-06-08

### Fixed

- Resolved a critical bug where the user's file selection was incorrectly cleared when switching between main application tabs or when the file system refreshed ([`72bc205`](https://github.com/lacerbi/athanor/commit/72bc205)).

## [0.6.7] - 2025-06-08

### Added

- **Per-Task File Selection**: Each task tab now maintains its own independent list of selected files, decoupling it from the global file explorer selection ([`186ab3a`](https://github.com/lacerbi/athanor/commit/186ab3a)).
- **Task File List Popover**: Added a UI popover to the workbench to clearly display the files associated with the currently active task ([`79bc75a`](https://github.com/lacerbi/athanor/commit/79bc75a)).

### Refactor

- Refactored file selection state management from the global `fileSystemStore` to the task-specific `workbenchStore` to support per-task contexts ([`186ab3a`](https://github.com/lacerbi/athanor/commit/186ab3a)).
- Removed legacy file selection functions made redundant by the new implementation ([`320198b`](https://github.com/lacerbi/athanor/commit/320198b)).

### Documentation

- Added a `design-doc` variant to the 'Architect' prompt template ([`2307038`](https://github.com/lacerbi/athanor/commit/2307038)).
- Updated `PROJECT.md` to document the new per-task file selection functionality ([`255e9b7`](https://github.com/lacerbi/athanor/commit/255e9b7)).

### Tests

- Added comprehensive unit tests for the new per-task file selection feature and its state management ([`035e983`](https://github.com/lacerbi/athanor/commit/035e983)).
- Fixed a `setTimeout` leak in `workbenchStore` tests to improve test suite stability ([`6faa082`](https://github.com/lacerbi/athanor/commit/6faa082)).
- Corrected an issue with watcher cleanup in `FileService` tests to prevent listener leaks ([`e62c84d`](https://github.com/lacerbi/athanor/commit/e62c84d)).
- Resolved multiple other failing tests to ensure overall test suite health ([`6ac902b`](https://github.com/lacerbi/athanor/commit/6ac902b), [`dcb81d5`](https://github.com/lacerbi/athanor/commit/dcb81d5)).

## [0.6.6] - 2025-06-07

### Added

- **Intelligent Ignore File Scanner**: Implemented a new hierarchical ignore rule system that recursively scans for `.athignore` and `.gitignore` files. It uses a "Deepest Opinion Wins" algorithm to mimic Git's behavior and an "Athanor-First" precedence system to allow `.athignore` to override `.gitignore` ([`cbefa8d`](https://github.com/lacerbi/athanor/commit/cbefa8d), [`3dca2f6`](https://github.com/lacerbi/athanor/commit/3dca2f6)).
- **CLI Support**: Added the ability to open a project by providing a directory path as a command-line argument ([`489060b`](https://github.com/lacerbi/athanor/commit/489060b)).
- **Automatic Ignore Rule Refresh**: The file system and ignore rules now automatically refresh when the "Use .gitignore rules" setting is changed in Project Settings ([`61e9b6e`](https://github.com/lacerbi/athanor/commit/61e9b6e)).

### Changed

- Refactored the folder-opening logic to use a single, shared function for requests coming from either the GUI or the CLI, ensuring consistent behavior ([`a9d9fa2`](https://github.com/lacerbi/athanor/commit/a9d9fa2)).

### Fixed

- Adjusted the "Deepest Opinion Wins" algorithm to correctly handle complex nested ignore and un-ignore scenarios, ensuring the most specific rule is always applied ([`9540595`](https://github.com/lacerbi/athanor/commit/9540595)).

### Tests

- Added comprehensive unit tests for `ignoreRulesManager` to validate the new hierarchical scanning, rule precedence, and path relativity logic ([`db38958`](https://github.com/lacerbi/athanor/commit/db38958), [`316c28f`](https://github.com/lacerbi/athanor/commit/316c28f), [`0b5bc8d`](https://github.com/lacerbi/athanor/commit/0b5bc8d)).

## [0.6.5] - 2025-06-07

### Added

- "Open Folder" and "Open Recent" menu items for easier project access ([`dba6f4a`](https://github.com/lacerbi/athanor/commit/dba6f4a)).

### Fixed

- Resolved a bug that caused listener leaks and unresponsiveness when using the "Open Folder" menu item ([`bbdf6de`](https://github.com/lacerbi/athanor/commit/bbdf6de)).
- Corrected a state desynchronization issue between application settings on disk and in-memory state ([`20fac02`](https://github.com/lacerbi/athanor/commit/20fac02)).

### Changed

- Refactored the `useFileSystemLifecycle` hook to prevent excessive IPC listener churn and improve stability ([`e8c9207`](https://github.com/lacerbi/athanor/commit/e8c9207)).

### Tests

- Fixed failing unit tests related to recent bug fixes and refactoring ([`1538b0d`](https://github.com/lacerbi/athanor/commit/1538b0d)).

## [0.6.4] - 2025-06-07

### Changed

- **MAJOR CHANGE**: Simplified the project ignore rule handling. Athanor now uses rules from the project's `.gitignore` file by default. The `.athignore` file is now used for Athanor-specific rules or to override `.gitignore` rules, streamlining the initial project setup ([`7020050`](https://github.com/lacerbi/athanor/commit/7020050)).

### Added

- Added a **"Use .gitignore rules"** toggle in **Project Settings**, allowing users to disable the automatic application of `.gitignore` patterns ([`9c8a0d6`](https://github.com/lacerbi/athanor/commit/9c8a0d6)).

### Fixed

- The Project Settings pane now correctly falls back to global default settings instead of using its own hardcoded defaults ([`d831b79`](https://github.com/lacerbi/athanor/commit/d831b79)).

### Documentation

- Updated `PROJECT.md`, `TUTORIAL.md`, and the default `.athignore` header to reflect the new, simplified ignore rule behavior ([`adb73fd`](https://github.com/lacerbi/athanor/commit/adb73fd), [`228a882`](https://github.com/lacerbi/athanor/commit/228a882)).

## [0.6.3] - 2025-06-06

### Fixed

- Resolved a critical issue that caused the packaged application to hang and become unresponsive on startup ([`69cf600`](https://github.com/lacerbi/athanor/commit/69cf600)).

### Tests

- Corrected failing unit tests and added a new test case for the `fs:setBaseDirectory` handler to improve test coverage and stability ([`e1dbf33`](https://github.com/lacerbi/athanor/commit/e1dbf33)).

## [0.6.2] - 2025-06-06

### Added

- **AI Summaries Toggle**: Added a new option in **Project Settings** to enable or disable the inclusion of AI summary instructions in prompts, giving users more control over prompt content ([`c68dc3d`](https://github.com/lacerbi/athanor/commit/c68dc3d)).
- **Conditional Prompt Variables**: Enhanced the prompt template engine to support conditional inclusion of text based on project settings ([`cb6be41`](https://github.com/lacerbi/athanor/commit/cb6be41)).

### Changed

- Updated prompt templates to conditionally display information about AI summaries based on the new project setting ([`cb6be41`](https://github.com/lacerbi/athanor/commit/cb6be41)).

### Fixed

- Improved initial startup behavior when no project is selected ([`056aa2f`](https://github.com/lacerbi/athanor/commit/056aa2f)).

## [0.6.1] - 2025-06-06

### Added

- GitHub Actions workflow (`auto-tag.yml`) to automatically create and push a version tag when changes are merged into `main` ([`9de7c63`](https://github.com/lacerbi/athanor/commit/9de7c63)).

### Fixed

- `npm start` command to ensure the application runs correctly in development mode ([`a84e784`](https://github.com/lacerbi/athanor/commit/a84e784)).

### Documentation

- Updated `README.md` with clearer installation instructions and a refined Quick Start guide ([`c82f142`](https://github.com/lacerbi/athanor/commit/c82f142)).

### Tests

- Expanded the `run-tests` workflow (`pr-checks.yml`) to execute on multiple operating systems (`ubuntu-latest`, `windows-latest`, `macos-latest`) and Node.js versions (18.x, 20.x, 22.x) ([`18e6d9f`](https://github.com/lacerbi/athanor/commit/18e6d9f)).

## [0.6.0] - 2025-06-04

### Added

- Version badge to `README.md` for clear release status visibility ([`33166c1`](https://github.com/lacerbi/athanor/commit/33166c1)).

### Changed

- **MILESTONE**: First official release of Athanor - AI Workbench, transitioning from pre-alpha development status.
- **Project status officially updated from Pre-Alpha to Alpha**: Documentation and related materials reflect this transition to a more mature development stage.
- Application version updated to 0.6.0 ([`270c744`](https://github.com/lacerbi/athanor/commit/270c744)).

### Notes

This release represents the first stable version of Athanor, consolidating all features and improvements from the 0.5.x development series. No major functional changes from v0.5.10, focusing on release preparation and documentation updates.

## [0.5.10] - 2025-06-03

### Added

- Added new issue templates (`bug_report.md`, `feature_request.md`) in `.github/ISSUE_TEMPLATE/` to guide users in reporting bugs and suggesting features.

### Fixed

- Introduced dark theme support for the open project dialog box.

### Documentation

- Updated `README.md` and `CONTRIBUTING.md` to provide more precise information for contributors.

## [0.5.9] - 2025-06-01

### Added

- Implemented Syntax Highlighting in Athanor's File Viewer to improve code readability for various languages ([`4864708`]).

## [0.5.8] - 2025-06-01

### Added

- GitHub Actions workflow (`pr-checks.yml`) to perform DCO checks and run unit tests on pull requests ([`6194e33`](https://github.com/lacerbi/athanor/commit/6194e33)). This workflow automatically:
  - Validates Developer Certificate of Origin (DCO) for all non-merge commits in Pull Requests using the `scripts/check-dco.sh` script.
  - Runs the full suite of unit tests (`npm test`) on Node.js 18.x for changes pushed to `main` or submitted via Pull Requests to `main`.
- `jest-environment-jsdom` to dev dependencies for enhanced testing capabilities ([`fce1faf`](https://github.com/lacerbi/athanor/commit/fce1faf)).

### Fixed

- Core path normalization and platform conversion utilities in `PathUtils.ts` for improved consistency and reliability ([`484d6a8`](https://github.com/lacerbi/athanor/commit/484d6a8)).
- Standardized Unix-style path operations (`joinUnix`, `dirname`, `basename`) in `PathUtils.ts` ([`554215e`](https://github.com/lacerbi/athanor/commit/554215e)).
- Relative path calculation and the `normalizeForIgnore` function in `PathUtils.ts` (and its usage by `ignoreRulesManager.ts`) for more accurate ignore rule application ([`f8ececd`](https://github.com/lacerbi/athanor/commit/f8ececd), [`9f90baf`](https://github.com/lacerbi/athanor/commit/9f90baf)).
- DCO checking script (`scripts/check-dco.sh`) to correctly handle multi-line commit messages, ensuring accurate DCO validation ([`33dd03e`](https://github.com/lacerbi/athanor/commit/33dd03e)).

## [0.5.7] - 2025-06-01

### Added

- **AI-Assisted Template Design**: Introduced an "AI Assisted Design" section in the "Custom Prompts & Tasks Help" modal, allowing users to copy specialized instructions for an AI to help create `prompt_*.xml` and `task_*.xml` templates (`2e8082b`).
- **Custom Prompts & Tasks Help Modal**: Added a comprehensive help modal accessible within the application that provides guidance, links to tutorials, and access to template storage folders (`91c6a86`).

### Documentation

- Added `custom_prompt_designer.md` and `custom_task_designer.md` files, providing detailed instructions for AI-guided creation of custom prompt and task templates (`9b69dd6`).
- Improved general information and instructions related to custom prompts and tasks (`91c6a86`).
- Standardized path references to use lowercase 'athanor' for consistency in documentation (`e5889ca`).

### Style

- Adjusted the layout of the "Custom Prompts & Tasks Help" modal for improved clarity and user experience (`9b69dd6`).

### Tests

- Fixed and expanded unit tests for `coreHandlers` to ensure robustness and cover recent changes (`e15a078`).

## [0.5.6] - 2025-05-31

### Added

- Support for user-defined custom prompt and task templates, loadable from global user directories (`%APPDATA%/Athanor/prompts/` or `~/Library/Application Support/Athanor/prompts/` or `~/.config/Athanor/prompts/`) and project-specific directories (`.ath_materials/prompts/`) (`5d8db5e`).
- Example `example_prompt.xml` and `example_task.xml` templates in `resources/prompts/` to guide custom template creation (`05d73a8`).

### Fixed

- Corrected UI rendering for custom prompt indicators (small dot) (`d103f27`).
- Resolved issues in `coreHandlers.test.ts` to ensure tests for `app:get-user-data-path` pass reliably (`cf4d1b5`).

### Documentation

- Added a pre-alpha software warning to the `TUTORIAL.md` to set user expectations (`b63ec47`).
- Included `bugs` field in `package.json` to provide a standard way to link to the issue tracker (`1afb73e`).

## [0.5.5] - 2025-05-31

### Added

- New "PR & Changelog" task (`task_pr_changelog.xml`) to automate the generation of Pull Request descriptions and changelog entries from commit messages.
- Comprehensive `CONTRIBUTING.md` guide for prospective contributors.
- Project `CHANGELOG.md` for tracking notable changes and releases.

### Fixed

- Resolved rendering issues with dark theme for context menus and tooltips in the file manager, preset prompts, and tasks.

### Documentation

- Added "Quick Start" and "Example Workflows" sections to `README.md`.
- Updated `TUTORIAL.md` with the latest information and usage examples.
- Updated `README.md` with references to `CONTRIBUTING.md`.

## [0.5.4] - 2025-05-30

_Corresponds to "Dark Theme (#13)" and "Dark Theme Fixes (#14)"_

### Added

- Dark theme support with a toggle mechanism.

### Fixed

- Dark mode rendering issues for buttons, text above the file manager, and the Apply Changes diff view.
- Diff view colors updated to be more color-blind friendly.

### Tests

- Added test coverage for theme toggling and UI rendering in dark mode.
- Fixed existing tests for compatibility with new theme logic.

## [0.5.3] - 2025-05-29

_Corresponds to "Branding Updates (#12)"_

### Added

- New Athanor logo and a set of application icons.

### Changed

- Standardized project name to "Athanor - AI Workbench" across the project.

### Documentation

- Updated `README.md` with new logo, project name, and improved clarity.
- Updated tutorial (d2b8c7e).
- Added new application snapshots to README (3ae9136, 12bbfad, 2b0deb2).

## [0.5.2] - 2025-05-29

_Corresponds to "Various Fixes, Features, Refactors, and Test Enhancements (#11)"_

### Added

- Functionality to replace file content from File Viewer using clipboard contents.
- "Send to API" and "Fuzzy Match" are now flagged as experimental features (not shown by default).

### Fixed

- Issue where the task button would hang after being pressed.
- Bug in `ManualCopyAction` where smart preview was unintentionally included.
- Ensured relative paths are passed correctly in clipboard-related actions.

### Tests

- Added or expanded unit tests for `ApplyAiOutputAction.ts`, `buildTaskAction.ts`, `descriptions.ts`, `ManualCopyAction`, and `coreHandlers.ts`.
- Unified unit testing approach across modules.

### Refactors

- Removed deprecated `ActionType` to simplify codebase.

### Dependencies

- Updated deprecated packages.

### Documentation

- Updated package metadata and descriptions.
- Added guidance in prompts to avoid non-standard whitespace.
- Expanded unit test documentation and coverage guidelines.
- Updated `README.md` and `TUTORIAL.md` (92d838d).

## [0.5.0] - 2025-05-27

_Corresponds to "Secure API Storage and LLM Provider Integration (#10)"_

### Added

- **Secure API Key Management**: Introduced `secure-api-storage` module, interface for API key input, secure storage with OS-level encryption, visual checkmark for saved keys, and a dedicated API key manager settings pane.
- **LLM Provider Support**: Added `llm` module, Athanor LLM presets (`src/config/athanorModelPresets.json`), dynamic registration of providers, and persistence for selected LLM models.
- **Enhanced API Interaction**: Added "Send to API" and "Cancel" button functionality with button state management during API requests, supporting both mock and real API communication.
- Improved UX for API key management with responsive dialog handling and error feedback.

### Changed

- Updated support for Gemini 2.5 with corrected safety settings.
- Filtered unused model features (e.g., for `o4-mini`).
- Improved model metadata alignment with the Cline spec.

### Refactors

- Centralized "Send to API" logic.
- Moved action panel components to dedicated folders (`src/components/action-panel/`).
- Added utilities for adapter error handling.

### Documentation

- Updated `README.md` to reflect secure API storage and direct API call capabilities.
- Improved query prompt with contextual summary.

## [0.4.0] - 2025-05-24

_Corresponds to "New Settings Tab (#9)"_

### Added

- New **Settings** tab and pane with functionalities for project and application settings.
- Project info path management (save, browse, clear).
- Smart preview line settings (min/max lines).
- Configurable threshold for display line length.
- Truncation for long path visualization in project settings and file manager.

### Changed

- Merged min/max smart preview options into a single setting.
- Enabled lenient parsing in CDATA, SEARCH, and REPLACE operations for Apply Changes.
- Settings JSON preview moved to an info button for a cleaner UI.

### Refactors

- Removed hardcoded default settings.
- Removed outdated YAML project configuration.

### UI/UX

- Reorganized settings layout into columns.
- Integrated tab tooltips.

## [0.3.2] - 2025-05-20

_Corresponds to "Enhance ATH Command Tag Parsing & Project Info Handling (#8)"_

### Added

- Support for correctly handling escaped `<` and `>` characters in ATH command tags.
- Configurable maximum line length variable for prompts to improve formatting control.

### Changed

- Clarified sourcing of project information (e.g., `PROJECT.md`) in prompts to avoid duplication.

## [0.3.1] - 2025-04-24

_Corresponds to "Move File System Logic to `FileService` (#7)"_

### Refactors

- Migrated core file system operations into a dedicated `FileService` for better modularity, testability, and security.
- Removed deprecated file management code.

### Fixed

- A path traversal bug.

### Tests

- Added unit tests for the new `FileService`.

## [0.3.0] - 2025-04-20

_Corresponds to "Improved Apply Changes (#6)"_

### Added

- Improved prompts for `UPDATE_DIFF` operations.
- Experimental fuzzy matching for applying changes (defaults to strict mode).
- Auto-replacement of non-breaking spaces with regular spaces in AI responses.
- Auto-selection of newly created files in the file explorer after applying changes.
- Resizable log panel (height can be dragged).

### Fixed

- Default match mode for applying changes set to strict.
- Tweaked lenient regex for improved handling of missing `]]>` in CDATA sections.

### Documentation

- Version bump noted.

## [0.2.2] - 2025-04-19

_Corresponds to "Improve Generated Prompt (#5)"_

### Changed

- Project information (`project_info`) is now read from `PROJECT.md` or other files in the base folder, replacing the dedicated YAML file system.
- File tree visualization in prompts now represents the root folder as `.` to reduce AI confusion.
- Prompt template for "reasoning" updated to "full-file" (indicating full file updates without diffs).

### Added

- An on/off toggle to include or exclude project information in the generated prompt.
- Updated `PROJECT.md` file in the Athanor base folder.

## [0.2.1] - 2025-04-07

_Corresponds to "Docs toggles (#4)"_

### Added

- **Smart Preview** toggle to show condensed views of file content.
- **Markdown/XML tags** toggle for formatting file content in prompts and for copying.
- **File tree toggle** for including/excluding the project's file tree in documentation-related prompts.

### Changed

- Moved toggle buttons closer to preset prompts and tasks for improved usability.
- Switched prompt references from "codebase" to "project" for consistency.

### Fixed

- Ensured `file_tree` XML tags are correctly placed within the prompt variables.

### Documentation

- Added initial `README.md`.
- (Note: `LICENSE` file was briefly created and deleted on 2025-04-07 based on git log: `c74b037`, `bcf8f17`).

## Early Enhancements & Features (Leading up to v0.2.1)

### Dynamic Task Framework - ~2025-02-24

_Corresponds to "Dynamic tasks (#3)"_

#### Added

- XML-based task structure for standardized task definitions.
- Mechanism for loading tasks dynamically at runtime.
- "Writer" prompt template for content generation.

#### Fixed

- Issue with variant selection display for tasks.

#### Documentation

- Updated to reflect the new dynamic task framework.

### New Project Creation Dialog - ~2025-02-17

_Corresponds to "New project dialog (#2)"_

#### Added

- Interactive dialog box for new project creation with improved UI and tooltips.
- Proper cancellation behavior for the new project dialog, reverting to the current folder.

#### Changed

- Updated `.athignore` creation pattern and default settings.
- Enhanced project description and query prompt functionality.

#### Refactors

- File ignore services moved into a dedicated module.

### Interactive Logs - ~2025-02-15

_Corresponds to "Feature/interactive logs (#1)"_

#### Added

- Interactive log entries in the log panel that can be clicked to trigger functions.

## [0.1.0] - ~2025-01-03

_Based on "feat: fixed configuration files to work for dev and production -> v0.1.0" and early git log_

### Added

- Initial configuration files to support both development and production environments (`366328b`).
- Athanor application version display (`4346940`).
- Robust path resolution for application resources in dev and production (`ea7781e`).
- Multi-tab support for managing different tasks (`f27569b`, `aa22fa8`).
- Context field implementation in prompts and UI (`021bcec`, `7b95c74`, `6269039`).
- Dynamic prompt loading and `promptService` (`a39c387`, `d415b46`).
- Prompt variant selection mechanism (`973f89a`, `6af126b`, `6e75ef8`).
- "Query" prompt template (`4505e00`).
- Drag-and-drop of files from file explorer into text areas (`ff4c0f8`).
- Lenient parsing for CDATA section closures in "Apply Changes" (`504774b`).
- Copy files to clipboard functionality (`b093983`, `fe56483`).
- `ath_materials` folder for supplementary project files (renamed from `ath_resources`) (`ca0ef40`).
- Metaprompt (`1ee441b` - Feb 2025).

### Changed

- Switched to regex parsing for "Apply Changes" command blocks (`2bdfb86`).
- Improved robustness of ATH command closure detection (`737c8c4`).

### Fixed

- Numerous UI fixes for tab scrolling, button appearance, and layout (`380692b`, `edeccae`, `40e8e09`).
- Corrected `.athignore` functionality for adding files relative to project path (`7eecff7`, `c416977`, `cdc00f8`).
- Proper loading of folders and file system refresh (`22caf72`).
- Handling of non-text files in codebase documentation and previews (`f9fb8b9`, `729fed4`).

### Refactors

- Introduced `ignoreRulesManager.ts` (`fea5018`).
- Organized code into a `commands` folder (`196b198`).
- Split `AthanorApp` and `FileExplorer` into more manageable components (`827020f`, `6459062`).

## Initial Project Setup - 2025-01-02

### Changed

- Project initialized after a major commit history issue (`d00888c`).
