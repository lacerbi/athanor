# Changelog

All notable changes to Athanor - AI Workbench will be documented in this file.
This changelog is based on available commit history and pull request information and may not include all minor changes or exact release dates for older versions.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (though early versions may not strictly follow it).

## [Unreleased]

_(Future changes will go here)_

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
