# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**

- `npm run package` - **(Standard)** Build a local production application (in `out/`). This is the recommended way to test changes.
- `npm start` or `npm run dev` - **(Deprecated for testing)** Start development mode with hot reload. Do not use.
- `npm run make` - Unsupported. Do not use.

**Testing & Quality:**

- `npm test` - Run Jest unit tests (includes both main and renderer process tests)
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - **Note: Currently non-functional** due to ESLint configuration incompatibility (`.eslintrc.js` uses old format incompatible with ESLint 9+). Prettier is used for code formatting.

**Platform-specific builds:**

- `npm run build:win` - Build for Windows
- `npm run build:linux` - Build for Linux

## Architecture Overview

Athanor is an Electron desktop application for AI-assisted development workflows. It helps developers create context-rich prompts and apply AI-generated changes to codebases.

### Core Architecture Principles

**Main/Renderer Separation:**

- **Main Process** (`electron/`): File system operations, Git integration, project analysis
- **Renderer Process** (`src/`): React UI, state management with Zustand
- **IPC Communication**: Secure bridge via `preload.ts` and typed in `src/types/global.d.ts`

**Key Services:**

- `FileService.ts` - Central file system operations manager (main process)
- `RelevanceEngineService.ts` - Intelligent context discovery using multiple heuristics
- `ProjectGraphService.ts` - Background project analysis and dependency mapping
- `GitService.ts` - Git repository analysis for relevance scoring
- `UserActivityService.ts` - Real-time file activity tracking for relevance signals
- `SettingsService.ts` - Project and application settings management
- `ShellService.ts` - Terminal/CLI session management with persistent PTY sessions
- `TaskAnalysisUtils.ts` - Task description analysis and keyword extraction
- `DependencyResolver.ts` / `DependencyScanner.ts` - Language-aware dependency analysis

### Critical File System Patterns

**Always use proper abstraction layers:**

- Main process: Use `FileService.ts` singleton for all file operations
- Renderer process: Use `fileSystemService.ts` for UI-related file operations
- Never bypass IPC for file operations from renderer

**Global type definitions:**

- `src/types/global.d.ts` - Extends window interface and defines core types
- Must be updated when modifying IPC method signatures

### State Management

**Zustand stores in `src/stores/`:**

- `fileSystemStore.ts` - Selected files, file tree, preview state
- `workbenchStore.ts` - Multi-tab task management
- `contextStore.ts` - Intelligent context builder state
- `promptStore.ts` - Prompt templates and variants
- `taskStore.ts` - Task templates and variants
- `applyChangesStore.ts` - AI-generated file change management
- `settingsStore.ts` - Project and application settings state
- `logStore.ts` - Application log management with interactive entries
- `commandStore.ts` - Clipboard and command validation state
- `cliStore.ts` - Terminal session state management

### Project Structure Insights

**Core Intelligence:**

- Relevance Engine uses Git history, dependencies, file mentions, and user activity
- Project analysis runs in background worker thread (`projectAnalysisWorker.ts`)
- Results cached in `.ath_materials/project_graph.json`
- Two-phase scoring engine with multiple heuristics for relevance
- Automatic re-analysis when file changes are detected after inactivity

**AI Integration:**

- Optional direct API integration via secure storage (`electron/modules/secure-api-storage/`)
- Primary workflow: copy prompts to external AI, paste responses back
- XML command parsing for applying AI-generated changes
- LLM functionality provided by external `genai-lite` package supporting:
  - Anthropic Claude API
  - OpenAI GPT models
  - Google Gemini models
  - Mistral models
- Type-safe IPC channels for LLM operations via `common/types/llm.ts`
- Custom ApiKeyProvider supporting both secure storage and environment variables
- Environment variable fallback: `ATHANOR_<PROVIDER>_API_KEY`

**File Management:**

- Supports `.athignore` and `.gitignore` patterns
- Chokidar file watchers for real-time updates
- Path normalization via `PathUtils.ts`
- Agent task creation in `.ath_materials` directory

**CLI/Terminal Support:**

- Integrated terminal via `node-pty` and `xterm.js`
- Multi-session support with persistent terminals
- Platform-specific shell detection (PowerShell on Windows, zsh/bash on Unix)
- Managed by `ShellService.ts` and `cliStore.ts`

**Additional Features:**

- **Tooltips**: Contextual help throughout the UI via hover tooltips
- **Drag and Drop**: File paths can be dragged from explorer to task/context areas
- **Context Suggestions**: Automatic context suggestions based on task content
- **Preset Tasks**: Pre-defined task templates loaded from `task_*.xml` files
- **Token Budgeting**: Intelligent file inclusion based on token limits
- **Smart Preview**: Configurable preview of file contents in prompts
- **Documentation Format**: Multiple format options for file inclusion
- **Ignore Rules**: Advanced pattern matching with `.athignore` and `.gitignore`
- **Project Settings**: Stored in `.ath_materials/project_settings.json`

## Testing Considerations

**Mocking Strategy:**

- Electron modules mocked via `tests/__mocks__/electron.ts`
- File system operations mocked for isolation
- Tests co-located with source files (e.g., `FileService.test.ts`)

**Test Environment:**

- Jest with Node.js environment for main process
- ts-jest for TypeScript compilation
- Tests cover both main and renderer processes

## Development Guidelines

**When adding file system features:**

1. Add core functionality to `FileService.ts` or `PathUtils.ts`
2. Create IPC handlers in `handlers/` directory
3. Update `preload.ts` interface methods
4. Update `src/types/global.d.ts` type definitions
5. Implement UI-level operations in `fileSystemService.ts`

**When adding new IPC handlers:**

1. Create handler functions in appropriate file in `electron/handlers/`
2. Export from `ipcHandlers.ts` for registration
3. Add corresponding methods to `preload.ts`
4. Update type definitions in `src/types/global.d.ts`

**When working with shared types:**

- Use `common/types/` for types shared between main and renderer processes
- Update webpack configs to include new directories when needed

**Important UI Patterns:**

- **Left Panel**: File explorer with context menus and ignore functionality
- **Right Panel**: Task tabs, file viewer, and Apply Changes panel
- **Bottom Panel**: Log viewer with clickable entries for debugging
- **Action Panel**: Controls for prompt generation, preset tasks, and settings toggles
- **Task Templates**: XML-based templates in `resources/prompts/`
- **Prompt Variants**: Context menu for switching between prompt modes (Query, Coder, Architect)

**Security considerations:**

- Never bypass IPC bridge for file operations
- Validate all paths in main process handlers
- Use secure API key storage for LLM integration

**Code style:**

- TypeScript 5+ with strict typing
- Prettier for code formatting (ESLint config exists but is incompatible with ESLint 9+)
- TailwindCSS 3 + Material-UI components
- Conventional Commits for commit messages
- **DCO Sign-off Required**: All commits must be signed with DCO. Always use `git commit -s` when committing. If git config is not set (check with `git config user.name` and `git config user.email`), inform the user that these need to be configured before committing. For fixing unsigned commits, use `git rebase --signoff` or `git commit --amend -s`

## Key Dependencies

- **Electron 33+** - Desktop app framework
- **React 19+** - UI framework
- **TypeScript 5+** - Type safety
- **Zustand** - State management
- **Chokidar** - File watching
- **ignore** - .gitignore/.athignore parsing
- **js-tiktoken** - Token counting for prompts
- **Jest + ts-jest** - Testing framework
- **genai-lite** - Unified LLM integration supporting Claude, GPT, Gemini, and Mistral
- **node-pty** - Terminal emulation support
- **xterm & xterm-addon-fit** - Terminal rendering in UI

## Project Structure Context

This project has been analyzed and documented with hierarchical summaries.
In each directory, you'll find:

- `.summary_short.md`: One-line descriptions of the directory and its files
- `.summary_long.md`: Detailed analysis of components, dependencies, and architecture

**Important:** Always read these files **first** to quickly understand any part of the project, before reading source files.
Start with `.summary_short.md` for navigation, then consult `.summary_long.md` for details.

Last Context Build: 2025-07-04
