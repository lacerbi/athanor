# Athanor - AI Workbench (Website)

The current project is the website for `Athanor - AI Workbench`, built using Docusaurus.

## App Description

Athanor is a desktop application that integrates AI coding assistants into a developer’s workflow. **Athanor does not require API keys.** Its primary goal is to streamline two main flows:

1.  **Prompt Creation & Refinement**

    - The user selects relevant files/folders within a dynamic file explorer.
    - Athanor then generates prompt text (optionally using multiple specialized “prompt templates” or “task templates”).
    - The user copies this prompt into an AI assistant (e.g., ChatGPT, Bard, Claude, etc.).
    - **Tooltips**: Throughout the application, contextual help is provided via tooltips that appear when hovering over buttons, controls, and interface elements. This is the primary method for providing short helper information without cluttering the UI.

2.  **Applying AI-Generated Changes**
    - The user copies the AI’s response from the assistant back into the clipboard.
    - Athanor parses custom XML-like commands (e.g., `<ath command="apply changes">...`) to figure out how to create, modify, or delete specific files.
    - The user can preview diffs, accept or reject each change, and finalize changes to disk.

### Key Features

1.  **Dynamic File Explorer**

    - Displays a tree of the chosen project directory.
    - Tracks file line counts (for text files) and uses `.athignore` rules to hide excluded paths.
    - Allows multi-select of files and folders; selecting a folder auto-selects its descendants unless hidden.
    - Automatically updates when files are added or removed on disk (Chokidar watchers).

2.  **Ignore Rules Management**

    - `.athignore` is the primary ignore file used within Athanor.
    - Rules can be seeded from `.gitignore` during initial setup, ensuring minimal duplication.
    - The main process (via `ignoreRulesManager.ts`) uses the `ignore` library to handle advanced wildcard matching, including an 'ignore all by name' option available via the file explorer's context menu.

3.  **Task & Prompt Management**

    - Multiple “task tabs,” managed by `workbenchStore.ts`, each containing:
      - A **task description**: plain-text or markdown instructions.
      - An **AI output** area: displays the generated prompt for the user to copy.
      - A **context** field: for ephemeral data (like partial commit messages or specific instructions); includes context suggestions based on task content (`contextDetection.ts`).
    - Prompt (`prompt_*.xml`) and Task (`task_*.xml`) templates live in `resources/prompts/` and are loaded on application startup via `promptService.ts`.
    - The user can dynamically switch between prompt/task _variants_ (e.g., different modes like “Query,” “Coder,” “Architect” or task variations like “Default”, “LaTeX”) using context menus in the Action Panel (`PromptContextMenu.tsx`, `TaskContextMenu.tsx`).

4.  **Clipboard & Code Changes**

    - Code blocks or raw text can be copied with consistent line endings and optional code fences.
    - The “apply changes” flow scans for XML blocks from the AI’s output, extracts file operations, and shows them in a diff panel.

5.  **Project Setup & Supplementary Materials**

    - On folder selection, Athanor can create a `.athignore` file if it does not exist.
    - A hidden `.ath_materials` folder is automatically created to store extra references (like doc fragments).
    - If `.gitignore` exists, its rules can be merged in as an optional step.

6.  **User Interface Layout**

    - **Left Panel**: The file explorer with watchers, expansions, checkboxes, and a context menu (right-click to ignore items).
    - **Right Panel**: Tabs for different tasks, a file viewer, and the “Apply Changes” panel that lists AI-proposed modifications. Action Panel controls prompt generation, preset tasks, and configuration toggles (Smart Preview, Include File Tree, Documentation Format).
    - A bottom **log panel** shows messages and clickable events for debugging or re-inspection (`logStore.ts`).

7.  **Preset Tasks**

    - Pre-defined tasks (e.g., 'AI Summary', 'Refactor Code') available in the Action Panel, loaded from `task_*.xml` files.

8.  **Drag and Drop**
    - File paths can be dragged from the file explorer and dropped into the Task Description or Context text areas (`useFileDrop.ts`).
