# Athanor - AI Workbench

## App Description

Athanor is an **Electron-based desktop application** that integrates AI coding assistants into a developer’s workflow. Its primary goal is to streamline two main flows:

1.  **Intelligent Prompt Creation & Refinement**
    - The user describes a task and manually selects a few key "seed" files.
    - Athanor's **Relevance Engine** automatically analyzes the project—leveraging dependencies, Git history, file mentions, and user activity—to identify and include other relevant "neighboring" files.
    - Athanor then generates a comprehensive, context-rich prompt using specialized templates.
    - The user copies this prompt into an AI assistant (e.g., ChatGPT, Claude, Gemini, etc.).
    - **Tooltips**: Throughout the application, contextual help is provided via tooltips that appear when hovering over buttons, controls, and interface elements. This is the primary method for providing short helper information without cluttering the UI.

2.  **Applying AI-Generated Changes**
    - The user copies the AI’s response from the assistant back into the clipboard.
    - Athanor parses custom XML-like commands (e.g., `ath command="apply changes"...`) to figure out how to create, modify, or delete specific files.
    - The user can preview diffs, accept or reject each change, and finalize changes to disk.

### Key Features

1.  **Intelligent Context Builder (Relevance Engine)**
    - At the core of Athanor is a sophisticated `RelevanceEngineService.ts` that automatically discovers contextually relevant files, going far beyond manual selection.
    - It uses a two-phase scoring engine fueled by multiple heuristics:
      - **Code Analysis**: Direct dependencies in languages like JavaScript/TypeScript and Python are resolved using `DependencyResolver.ts` and `DependencyScanner.ts`.
      - **Git History**: `GitService.ts` analyzes commit history to find files that are frequently changed together.
      - **Project Graph**: Identifies "hub files" (highly interconnected) and files that mention each other.
      - **User Activity**: `UserActivityService.ts` tracks recently edited files, giving them higher relevance.
      - **Task Description**: Natural language analysis of the task description identifies keywords and direct path mentions.
    - The engine produces a token-budgeted list of "neighboring files" that are included in the prompt, providing the AI with rich, relevant context. This state is managed in the UI by `contextStore.ts`.

2.  **Project-Wide Analysis & Caching**
    - On opening a project, Athanor runs a background analysis using a `projectAnalysisWorker.ts` to build a comprehensive dependency and relationship graph of the entire codebase.
    - This graph, managed by `ProjectGraphService.ts`, powers the Relevance Engine.
    - The resulting graph is cached in the `.ath_materials` folder as `project_graph.json` to ensure fast subsequent loads. The analysis automatically re-runs when file changes are detected after a period of user inactivity.

3.  **Direct LLM API Integration (Optional)**
    - While the core workflow is API-key-free, Athanor includes an optional feature for direct communication with LLM providers (OpenAI, Anthropic, Gemini, Mistral).
    - API keys are stored securely using Electron's `safeStorage` via the `ApiKeyServiceMain`.
    - The `LLMService` from the external `genai-lite` package manages these interactions with a custom ApiKeyProvider that supports both secure storage and environment variable fallbacks.

4.  **Git Integration**
    - Athanor deeply integrates with Git repositories via `GitService.ts`.
    - It uses Git to find recently committed files and identify files that share commit history, which are key signals for the Relevance Engine.
    - The service can also retrieve commit history for specific files.

5.  **Dynamic File Explorer**
    - Displays a tree of the chosen project directory.
    - Tracks file line counts (for text files) and uses `.athignore` rules to hide excluded paths.
    - Allows multi-select of files and folders; selecting a folder auto-selects its descendants unless hidden.
    - Automatically updates when files are added or removed on disk (Chokidar watchers).

6.  **Ignore Rules Management**
    - By default, Athanor automatically processes rules from the project's `.gitignore` file. This behavior can be toggled in the project settings.
    - The `.athignore` file is used for Athanor-specific ignore rules or for overriding `.gitignore` rules (e.g., re-including a file with an exception rule like `!path/to/file`).
    - The main process (via `ignoreRulesManager.ts`) uses the `ignore` library to handle advanced wildcard matching, including an 'ignore all by name' option available via the file explorer's context menu.

7.  **Task & Prompt Management**
    - Multiple “task tabs,” managed by `workbenchStore.ts`, each containing:
      - A **task description**: plain-text or markdown instructions.
      - An **AI output** area: displays the generated prompt for the user to copy.
      - A **context** field: for ephemeral data (like partial commit messages or specific instructions); includes context suggestions based on task content (`contextDetection.ts`).
      - A **selected files list** which holds the user's explicitly selected files for that task. This list acts as a "seed" for the Relevance Engine to discover additional relevant files. Each task tab maintains its own distinct list of selected files.
    - Prompt (`prompt_*.xml`) and Task (`task_*.xml`) templates live in `resources/prompts/` and are loaded on application startup via `promptService.ts`.
    - The user can dynamically switch between prompt/task _variants_ (e.g., different modes like “Query,” “Coder,” “Architect” or task variations like “Default”, “LaTeX”) using context menus in the Action Panel (`PromptContextMenu.tsx`, `TaskContextMenu.tsx`).

8.  **Clipboard & Code Changes**
    - Code blocks or raw text can be copied with consistent line endings and optional code fences.
    - The “apply changes” flow scans for XML blocks from the AI’s output, extracts file operations, and shows them in a diff panel.

9.  **Project Setup & Supplementary Materials**
    - On folder selection, Athanor can create a `.athignore` file if it does not exist.
    - A hidden `.ath_materials` folder is automatically created to store extra references (like doc fragments).
    - If a `.gitignore` file exists, its rules are automatically applied by default.

10. **User Interface Layout**
    - **Left Panel**: The file explorer with watchers, expansions, checkboxes, and a context menu (right-click to ignore items).
    - **Right Panel**: Tabs for different tasks, a file viewer, and the “Apply Changes” panel that lists AI-proposed modifications. Action Panel controls prompt generation, preset tasks, and configuration toggles (Smart Preview, Include File Tree, Documentation Format).
    - A bottom **log panel** shows messages and clickable events for debugging or re-inspection (`logStore.ts`).

11. **Preset Tasks**
    - Pre-defined tasks (e.g., 'AI Summary', 'Refactor Code') available in the Action Panel, loaded from `task_*.xml` files.

12. **Drag and Drop**
    - File paths can be dragged from the file explorer and dropped into the Task Description or Context text areas (`useFileDrop.ts`).

## Tech Stack

### Core Architecture

Athanor follows Electron's recommended **“secure by default”** pattern, separating logic between **main** and **renderer** processes:

1.  **Main Process (Electron)**
    - **`main.ts`**: Application startup, window creation, and core event handling. It creates singleton instances of services like `FileService` and `SettingsService`.
    - **IPC Handlers**:
      - `ipcHandlers.ts` collects all handlers from `handlers/` (e.g., `coreHandlers.ts`, `fileOperationHandlers.ts`, `fileWatchHandlers.ts`) into a single registration function.
      - Handlers receive the `FileService` instance and delegate all file system operations to it, ensuring a single point of control.
    - **File Service (`electron/services/FileService.ts`)**:
      - Maintains a global “base directory” to represent the open project folder.
      - Performs all file reads/writes, folder creation, and error handling using Node's `fs/promises` and Chokidar for watching.
      - Integrates with `ignoreRulesManager.ts` to handle file exclusion logic.
      - Cleans up watchers on application exit or directory change.
      - Delegates pure path manipulation logic to `PathUtils.ts`.
    - **Ignore Rules Manager (`ignoreRulesManager.ts`):**
      - Loads `.athignore` and `.gitignore` files for file exclusion.
      - Provides advanced matching logic using the `ignore` npm library.
    - **Path Utilities (`electron/services/PathUtils.ts`):**
      - Provides a set of pure, static functions for all path normalization (Unix-style internally), conversion, and manipulation logic.
    - **Git Service (`electron/services/GitService.ts`)**:
      - Executes `git` commands to analyze the repository for the Relevance Engine (e.g., shared commit history, recent changes). It is a core component of the context-building heuristics.
    - **Project Graph Service (`electron/services/ProjectGraphService.ts`)**:
      - Runs in a background worker thread to analyze the entire project.
      - Builds a graph of dependencies, file mentions, and Git-based relationships, which is then cached. This graph is the primary data source for the Relevance Engine.
    - **Relevance Engine Service (`electron/services/RelevanceEngineService.ts`)**:
      - The central service for intelligent context discovery. It orchestrates `GitService`, `ProjectGraphService`, and other utilities to score all project files based on their relevance to the current task.
    - **User Activity Service (`electron/services/UserActivityService.ts`)**:
      - A lightweight service that listens for file changes from `FileService` to identify which files are being actively edited, providing a real-time relevance signal.
    - **Dependency Resolver/Scanner (`DependencyResolver.ts`, `DependencyScanner.ts`)**:
      - Utilities used by the Project Graph Service to perform language-aware dependency analysis for JavaScript/TypeScript and Python.
    - **LLM & API Key Services**:
      - LLM functionality provided by external `genai-lite` package with custom ApiKeyProvider
      - Secure API key storage via `genai-key-storage-lite` package (`ApiKeyServiceMain`)
      - Shared IPC channel types in `common/types/llm.ts`

2.  **Renderer Process (React)**
    - **`src/services/fileSystemService.ts`**:
      - High-level logic for building a file tree from data returned via IPC from the main process's `FileService`.
      - Normalizes line endings and counts file lines for text files.
      - Applies ignoring rules or merges them into the UI structure.
    - **React Components** (`src/components/*`):
      - **`AthanorApp.tsx`** and **`MainLayout.tsx`** define the overall UI layout:
        - File explorer on the left (expanded by `FileExplorer.tsx`).
        - Action tabs (workbench, viewer, review) on the right.
      - `ApplyChangesPanel.tsx` is the UI for viewing & applying AI-proposed code modifications.
      - `FileContextMenu.tsx` handles ignoring items and possibly other file actions from the explorer.
      - `ActionPanel.tsx` controls prompt generation and preset tasks, hooking into `promptStore.ts`, `workbenchStore.ts`, and `taskStore.ts`.
    - **Global Stores** (Zustand) in `src/stores/*`:
      - `fileSystemStore.ts`: Tracks selected files/folders, previews, and tree data.
      - `promptStore.ts`: Manages loaded prompt definitions & active prompt variants.
      - `workbenchStore.ts`: Maintains multiple “task tabs” used to hold user tasks & AI outputs.
      - `applyChangesStore.ts`: Handles the ephemeral list of file changes returned by AI, letting the user apply or reject them.
      - `contextStore.ts`: Manages the state for the intelligent context builder, tracking user-selected "seed" files and the "neighboring" files automatically discovered by the Relevance Engine.
      - `taskStore.ts`: Manages loaded task definitions & active task variants.
    - **Utilities** (`src/utils/*`):
      - `fileTree.ts`: Functions for sorting & iterating nested file structures.
      - `constants.ts`: Shared config (e.g., thresholds for large files).
      - `extractTagContent.ts`: Helpers for parsing XML segments.
      - Others (e.g., `buildPrompt.ts`, `tokenCount.ts` (using `js-tiktoken`)) serve specialized tasks like AI prompt assembly or token counting.

### Technology Stack

- **Electron v33+**: Powers the main/renderer separation. The main process is responsible for file system access, watchers, and launching the application. The renderer hosts the React UI.
- **React 19+**: Renders the front-end UI, including file explorer trees, task/prompt panels, and the changes diff viewer.
- **TypeScript 5+**: Provides strict typing across main and renderer processes.
- **Node.js** (latest LTS): Provides the backend runtime for the main process, including **Worker Threads** for background project analysis.
- **Zustand**: Maintains local state in separate stores—e.g., file selection state (`fileSystemStore.ts`), prompt management (`promptStore.ts`), multi-tab workbench (`workbenchStore.ts`), task management (`taskStore.ts`), etc.
- **Chokidar**: Watches the local file system for changes in the open folder.
- **ignore**: Reads `.athignore` and `.gitignore` to filter out hidden or excluded files in the Explorer.
- **js-tiktoken**: Used for accurate token counting in prompts.
- **genai-lite**: Unified LLM integration supporting Claude, GPT, Gemini, and Mistral models.
- **Webpack & electron-forge**: Build, package, and run the Electron application.
- **TailwindCSS 3 + Lucide Icons**: Provides a flexible styling system and icon library for a clean UI.
- **Material-UI (MUI) 5**: Partially integrated for certain UI elements (used in some components).
- **Prettier**: Code formatting for consistent style (configured via `.prettierrc`).
- **ESLint**: Currently non-functional due to incompatible configuration format (`.eslintrc.js` uses old format incompatible with ESLint 9+). The `npm run lint` command will not work properly.
- **Jest & ts-jest**: Provide the unit testing framework. Tests are typically colocated with the source code they validate (e.g., `FileService.test.ts` alongside `FileService.ts`).
- **Testing Mocks**: Key dependencies, including Electron itself (via `tests/__mocks__/electron.ts`) and Node.js modules like `fs/promises`, are mocked to ensure isolated and reliable unit tests.

### Future Considerations

- **Testing**: Enhance and expand the current unit test coverage, particularly for more complex main process handlers and a broader range of React components to ensure robustness and catch regressions effectively.
- **Database or Extended Persistence**: If user data or historical tasks become more complex, a storage layer might be beneficial.
- **Refined Prompt Templates**: Additional dynamic placeholders or user-defined placeholders.
- **Advanced Visual Diffs**: Implement more advanced color-coded diffs for large or complex changes.
- **Extending the Relevance Engine**: Incorporate more advanced heuristics for context discovery, such as semantic code search or analysis of runtime behavior.
- **Security**: Further refine path sanitization and sandboxing, especially if running untrusted AI output.

### Action Points

1.  When working with direct file system operations:
    - Use **`FileService.ts`** methods in main process code via the singleton instance.
    - Access through IPC handlers defined in `handlers/` directory.
    - Handle errors appropriately at each layer.

2.  When building UI features:
    - Use `fileSystemService.ts` for file tree operations in the renderer.
    - Access through React hooks and components.
    - Handle loading states and error conditions.

3.  For new file system features:
    - Add core functionality to **`FileService.ts`** or **`PathUtils.ts`** as appropriate.
    - Create corresponding IPC handlers in `handlers/`.
    - Add interface methods to `preload.ts`.
    - Implement high-level operations in `fileSystemService.ts` if needed for the UI.

4.  TypeScript & Global Types:
    - Regularly open and double-check **`src/types/global.d.ts`** to avoid TypeScript mistakes.
    - This file extends the `window` interface to expose `window.fileSystem`, houses core global interfaces (like `FileOperation`), and organizes key application-level types.
    - If an IPC method signature changes in the main process or `preload.ts`, update both the main code **and** `global.d.ts` accordingly.

5.  When debugging:
    - Check main process logs for **`FileService.ts`** or **`PathUtils.ts`** issues.
    - Verify IPC communication through preload bridge.
    - Inspect renderer process state using React DevTools, focusing on Zustand stores and `fileSystemService.ts` usage.

6.  Security considerations:
    - Never bypass the IPC bridge for file operations from the renderer process.
    - Validate all paths and operations rigorously in the main process handlers.
    - Handle sensitive data appropriately at each layer.

7.  Testing & Running the App:
    - Use **`npm run package`** to create local production builds for testing, as this is the standard procedure.
    - The `npm start` command is for active development with hot-reloading and is deprecated for testing, as it may not reflect the final application behavior.
    - Note that `npm make` is **unsupported**. Users are expected to compile locally using `npm run package`.
