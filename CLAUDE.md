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
- `npm run lint` - Run ESLint on TypeScript/React code

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

### Project Structure Insights

**Core Intelligence:**

- Relevance Engine uses Git history, dependencies, file mentions, and user activity
- Project analysis runs in background worker thread (`projectAnalysisWorker.ts`)
- Results cached in `.ath_materials/project_graph.json`

**AI Integration:**

- Optional direct API integration via secure storage (`electron/modules/secure-api-storage/`)
- Primary workflow: copy prompts to external AI, paste responses back
- XML command parsing for applying AI-generated changes

**File Management:**

- Supports `.athignore` and `.gitignore` patterns
- Chokidar file watchers for real-time updates
- Path normalization via `PathUtils.ts`

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

**Security considerations:**

- Never bypass IPC bridge for file operations
- Validate all paths in main process handlers
- Use secure API key storage for LLM integration

**Code style:**

- TypeScript 5+ with strict typing
- ESLint + Prettier configuration
- TailwindCSS 3 + Material-UI components
- Conventional Commits for commit messages

## Key Dependencies

- **Electron 33+** - Desktop app framework
- **React 19+** - UI framework
- **TypeScript 5+** - Type safety
- **Zustand** - State management
- **Chokidar** - File watching
- **ignore** - .gitignore/.athignore parsing
- **js-tiktoken** - Token counting for prompts
- **Jest + ts-jest** - Testing framework
