### **Athanor Feature Specification: The Dynamic & Intelligent Context Builder**

**Version:** 1.4
**Date:** June 8, 2025

#### **1. Overview & Goals**

This document specifies the design for a major new Athanor feature: the Dynamic & Intelligent Context Builder. The primary goal is to move beyond simple file selection and proactively build a highly relevant, token-efficient context for Large Language Model (LLM) prompts.

This entire system is designed to run locally without any LLM involvement, ensuring speed, privacy, and deterministic behavior. It is engineered to be highly configurable and adaptable to various project structures and developer workflows.

#### **1.1. The Three-Tiers Model**

The system will automatically identify and prioritize files based on a rich set of heuristics, organizing them into a three-tiered model:

1.  **Selected Files:** The core files of interest, either selected manually by the user or automatically via a "cold start" heuristic. Their full content is included in the prompt context.
2.  **Neighboring Context:** A set of supporting files deemed highly relevant to the selected files and the user's task. These are included in the prompt context via a "Smart Preview" to conserve tokens.
3.  **Other Files:** All other project files that are not included in the context to reduce noise.

#### **1.2. Interactive Workflow**

A core principle of this feature is its **interactive and transparent workflow**. Rather than being an invisible, one-time process, context-building is a live dialogue between the developer and the workbench. As the user works within a specific task tab—typing a description or modifying the per-task file selection—the File Explorer will dynamically update to visually represent the context. This goes beyond a simple three-tier distinction:

- **Selected Files** are clearly marked.
- **Neighboring Files** are highlighted with a variable intensity that directly reflects their calculated `totalRelevanceScore`. This provides a granular, at-a-glance understanding of _how_ relevant the system believes each file is to the task.
- **Other Files** remain un-highlighted.

This transforms the file list into a real-time dashboard of the system's reasoning, allowing the user to inspect, guide, and refine the context for the active task _before_ committing to the final prompt generation. This interactive loop is essential for moving beyond "black-box" prompt engineering and toward a more deliberate, controllable, and ultimately more effective development process.

#### **2. Core Concepts & Heuristics**

The context-building algorithm is powered by a series of heuristics that analyze project files and metadata. Understanding these foundational concepts is essential before reviewing the main algorithm.

##### **2.1. Direct Dependency Analysis**

- **What it is:** A method to identify files that are explicitly imported or required by another file.
- **Rationale:** This is the strongest signal of a direct relationship. If `ComponentA.tsx` imports `useUtils.ts`, any task concerning `ComponentA` is likely informed by `useUtils`.
- **Implementation:** Use fast, regex-based scanning for **language-specific** import statements. The `DependencyScanner` service will identify the file's language by its extension (e.g., `.py`, `.java`, `.ts`) and apply the appropriate regex pattern (e.g., `import ... from '...'`, `require('...')`, `from ... import ...`, `use ...;`, `@import '...'`). We will implement a library of regular expressions for the target languages, which will include 10-20 of the most popular programming languages and is easily extendable. This polyglot approach avoids the overhead of building a full Abstract Syntax Tree (AST) for every file while supporting a wide range of languages.

##### **2.2. File Mention Analysis**

- **What it is:** A method to identify when a file's name or path is mentioned inside the content of another file, even if it's not a formal dependency.
- **Rationale:** This is a broader, more generic heuristic that can uncover implicit relationships. For example, a `README.md` file might reference a configuration script, or a comment in one file might refer to another for context.
- **Implementation:** To ensure performance, this analysis will be pre-computed and cached. The `ProjectGraphService` will scan every project file once, extracting text that matches common file name patterns. The results (a map of which file mentions which other filenames) are cached. The relevance engine then uses this cache during scoring, which is much faster than re-scanning files on the fly.

##### **2.3. Sibling File Analysis**

- **What it is:** Identifying files within the same directory that share a base name but have different, conventional extensions.
- **Rationale:** Modern development practices frequently co-locate related assets. For example, `Button.tsx` is often accompanied by `Button.css`, `Button.test.tsx`, and `Button.stories.tsx`.
- **Implementation:** This is a fast operation involving path manipulation and directory listing, likely managed by the existing `FilePathManager`.

##### **2.4. Shared Commit Adjacency**

- **What it is:** Discovering files that are frequently modified and committed together in the project's Git history.
- **Rationale:** This reveals implicit, functional relationships not captured by static imports. For instance, a change to an API endpoint often accompanies a change to the documentation or a corresponding client-side service.
- **Implementation:** Requires a `GitService` in the main process to run commands like `git log` to find commits touching a specific file, followed by `git show --name-only` to list all other files in those commits. This analysis should be limited to recent history to remain performant.

##### **2.5. Project Hub File Analysis**

- **What it is:** Identifying files that are central to the project's architecture, defined by having a high number of other files importing them (a high "in-degree").
- **Rationale:** Every project has pillars—foundational files like `config.ts`, `styles/theme.css`, `utils/helpers.js`, or `types/global.d.ts`. Their context is often implicitly required for tasks throughout the codebase.
- **Implementation:** This requires a `ProjectGraphService` to perform a one-time (and cached) analysis of the entire project, running the Direct Dependency Analysis on all files to build a project-wide dependency graph. This service would identify the top N most-imported files as "Hubs".

##### **2.6. Recent Activity Analysis**

- **What it is:** A hybrid method that identifies files that have been recently worked on by combining two signals: long-term commit history and immediate file modifications.
- **Rationale:** A file's relevance is highly correlated with its recent activity. Combining historical and live data provides a comprehensive view of the developer's focus. What a developer _has been_ working on (commits) and what they are working on _now_ (live edits) are both strong indicators of what they will need in their prompt context.
- **Implementation:**
  - **Committed History (Git):** The `GitService` will run `git log --name-only --since="X days ago"` to retrieve a list of recently committed files. This provides a stable, low-noise signal of intentional work.
  - **Live Working Set (File System):** The application's file watcher service (powered by Chokidar in `FileService.ts`) will monitor `mtime` (last modified time) for files. Changes within a very short window (e.g., the last hour) are considered part of the active working set. This is crucial for capturing uncommitted work-in-progress and must be tightly integrated with the `ignoreRulesManager` to filter out irrelevant file changes from build processes or package installations.

##### **2.7. Task Description Keyword Matching**

- **What it is:** A real-time analysis of the user's plain-text "Task Description" to extract keywords.
- **Rationale:** The user's intent is explicitly stated here. If the task is to "fix the login form button," files with `login`, `form`, and `button` in their paths are extremely likely to be relevant.
- **Implementation:** A simple, fast function that removes common "stop words" from the task description string. This can be debounced to run as the user types, feeding keywords into the relevance engine.

---

#### **3. The Two-Phase Context Algorithm**

The core of the feature is a structured, two-phase algorithm that first establishes a baseline context (the "Seed Basket") and then expands upon it.

##### **3.1. Configuration Constants**

The algorithm's behavior is controlled by a set of external constants, allowing for easy tuning and user configuration.

```typescript
// Phase 1: Seeding
const SEED_TRIGGER_THRESHOLD = 2;
const SEED_BASKET_SIZE = 5;

// Phase 2: Scoring Weights
const SCORE_DIRECT_DEPENDENCY = 50;
const SCORE_TASK_KEYWORD_SINGLE = 40;
const SCORE_TASK_KEYWORD_MULTI = 60;
const SCORE_SHARED_COMMIT_SINGLE = 30;
const SCORE_SHARED_COMMIT_MULTI = 50;
const SCORE_ACTIVELY_EDITING = 35;
const SCORE_SIBLING_FILE = 25;
const SCORE_PROJECT_HUB = 20;
const SCORE_RECENT_COMMIT_ACTIVITY = 10;
const SCORE_SAME_FOLDER = 10;
const SCORE_FILE_MENTION = 8;
const SCORE_GLOBAL_KEYWORD = 5;

// Phase 2: Final Selection
const MAX_NEIGHBOR_TOKENS = 10000;
```

##### **3.2. Phase 1: Seed Basket Creation**

**Goal:** Establish a high-quality initial set of files to drive the main scoring phase. This phase distinguishes between files the user explicitly selected and files added by heuristic, as user selections carry more weight.

**Process:**

1.  **Check Selection Count:** Given a list of `originallySelectedFiles` from the user:
    - **If `originallySelectedFiles.length > SEED_TRIGGER_THRESHOLD`:** The user's selection is treated as the definitive seed. These files are added directly to the "Seed Basket," and each is marked as `isOriginallySelected: true`.
    - **If `originallySelectedFiles.length <= SEED_TRIGGER_THRESHOLD` (including the "no selection" case):** A "seeding round" is triggered to find a good starting context.
      a. A preliminary scoring round is run using the rules from Phase 2 to score all other project files.
      b. The `originallySelectedFiles` are added to the Seed Basket first, marked as `isOriginallySelected: true`.
      c. The top-scoring files from the preliminary round are then added to the Seed Basket until it reaches `SEED_BASKET_SIZE`. These heuristically added files are marked as `isOriginallySelected: false`.

##### **3.3. Phase 2: Neighborhood Scoring & Final Selection**

**Goal:** Score every file _not_ in the Seed Basket to determine its relevance, then greedily select the best ones for the prompt based on a token budget.

**A. Neighborhood Scoring:**

For each candidate file outside the Seed Basket, a `totalRelevanceScore` is calculated. The scoring logic iterates through each file in the Seed Basket and applies the following rules. Note the "seed modifier," which reduces the score contribution from files that were not part of the user's original selection.

| Heuristic                  | Trigger Condition                                         | Base Score | Notes                                                                               |
| :------------------------- | :-------------------------------------------------------- | :--------- | :---------------------------------------------------------------------------------- |
| **Direct Dependency**      | Is a dependency of a seed file.                           | 50         | Score is halved if the seed file was not originally selected.                       |
| **Task Keywords**          | Path matches keywords from task description.              | 40 / 60    | 40 for 1 match, 60 for 2+. Independent of seed files.                               |
| **Shared Commits**         | Shares Git commits with a seed file.                      | 30 / 50    | 30 for 1-2 commits, 50 for 3+. Score is halved if seed was not originally selected. |
| **Actively Editing**       | File `mtime` indicates modification in the last hour.     | 35         | Independent of seed files. Captures live, uncommitted changes from the file system. |
| **Sibling File**           | Is a sibling of a seed file.                              | 25         | Score is halved if the seed file was not originally selected.                       |
| **Project Hub**            | Is identified as a project "hub" file.                    | 20         | Independent of seed files.                                                          |
| **Recent Commit Activity** | Was included in a Git commit recently.                    | 10         | Independent of seed files. Based on `git log`.                                      |
| **Folder Co-location**     | In the same folder as a seed file.                        | 10         | Score is halved if the seed file was not originally selected.                       |
| **File Mention**           | A seed file's content mentions the candidate file's name. | 8          | Score is halved if seed was not originally selected. Uses pre-computed cache.       |
| **Global Keywords**        | Path contains a generic global keyword.                   | 5          | Independent of seed files.                                                          |

**B. Greedy Token-Based Selection:**

1.  All candidate files with a `totalRelevanceScore > 0` are collected.
2.  The list is sorted in descending order by score.
3.  The system iterates through the sorted list, adding files to the final **"Neighboring Context"** tier.
4.  For each file, the token count of its "Smart Preview" is calculated.
5.  Files are added until the cumulative token count reaches the `MAX_NEIGHBOR_TOKENS` budget.

**C. UI Visualization:**

The visualization of file relevance in the UI is a direct representation of the scoring from Step A and is **independent of the token-based selection** in Step B. This ensures the user sees the full relevance landscape, not just the subset that fits into the prompt.

1.  **Thresholding:** Candidate files are only considered for highlighting if their `totalRelevanceScore` is above a minimum threshold (e.g., `5`).
2.  **Normalization:** For all files that pass the threshold, their scores are normalized. The range of scores (from the minimum threshold to the maximum score calculated in the current context) is mapped to a `[0.05, 1.0]` scale.
3.  **Non-Linear Transform:** The normalized score (`x`) is passed through a curve (`f(x) = 1 - (1 - x)^2`) to make lower-relevance highlights more discernible.
4.  **Color Mapping:** The final transformed value is mapped to a color gradient, from a low-intensity to a high-intensity highlight color, and applied to the file's entry in the UI.

#### **4. Architectural & Implementation Plan**

An expert developer should plan for the following architectural changes:

- **New Main Process Services:**
  - `RelevanceEngineService.ts`: The central orchestrator that implements the two-phase algorithm.
  - `ProjectGraphService.ts`: Manages the creation, caching, and querying of the project-wide dependency graph to identify Hub files. This service should also be responsible for the **pre-computation and caching of the file mention analysis** to ensure high performance. This should run in the background.
  - `GitService.ts`: A dedicated module to interface with the Git command line for commit and activity analysis.
  - `DependencyScanner.ts`: A stateless service for performing the fast, regex-based dependency scanning. It will be **language-aware, using a map of file extensions to language-specific regex patterns** to support a polyglot environment.
- **IPC Communication:**
  - A primary IPC channel, e.g., `ath:recalculate-context`, will be invoked from the renderer whenever the context needs to be updated (file selection changes, task description is edited).
  - The main process will perform the full analysis and return the complete three-tiered context model (`{ selected: [...], neighboring: [...] }`) to the renderer.
- **UI / Renderer Integration:**
  - The `FileExplorer.tsx` component will be updated to render the three-tiered context model. This includes applying a distinct style for **Selected** files and a variable-intensity background highlight for **Neighboring** files based on their final relevance score.
  - The relevance engine will source its inputs (user-selected files, task description) from the active task tab managed by `workbenchStore.ts`.
  - State management for the computed context (`{ selected: [...], neighboring: [...] }`) will be held in the renderer, likely in a new `contextStore.ts` or integrated into `workbenchStore.ts`.
  - React hooks (`useEffect`) will trigger the context recalculation when dependencies from the active tab change (e.g., `selectedFiles`, `taskDescription`).
- **Performance & Caching:**
  - The project dependency graph and the file mention map are expensive to compute and should be cached in the `.ath_materials` folder. They should only be recomputed when file changes are detected by Chokidar.
  - The analysis of the task description should be debounced to avoid excessive IPC calls while the user is typing.
  - Git operations should be executed asynchronously in the main process to avoid blocking the UI.

By following this specification, a developer can build a sophisticated, powerful, and highly valuable feature that will significantly enhance Athanor's core capabilities.

---

### **Staged Implementation Plan**

To manage the complexity of the **Dynamic & Intelligent Context Builder**, the feature's development is divided into eight distinct, incremental stages. This approach ensures continuous integration and allows for testing and refinement throughout the development cycle.

**Current Status (June 2025):** Implementation is complete up to and including Stage 6. The application now features a live, interactive context builder with a comprehensive scoring engine, granular UI relevance visualization, and advanced graph-based project analysis. The next phases will focus on performance optimization and integrating live file activity.

#### **Stage 1: Foundational Backend Services (Completed)**

- **Goal:** Establish the core, non-UI backend services required for context analysis.
- **Implementation:**
  - A `GitService.ts` was created to interface with the local Git repository for commit history analysis.
  - A stateless `DependencyScanner.ts` was implemented for fast, regex-based dependency scanning across multiple languages.
- **Outcome:** Foundational backend infrastructure is in place and unit-tested.

#### **Stage 2: Three-Tier UI Driven by Manual File Selection (Completed)**

- **Goal:** Implement the user-facing three-tier context model (`Selected`, `Neighboring`, `Other`) driven by manual file selections.
- **Implementation:**
  - A `RelevanceEngineService.ts` was created, initially identifying direct dependencies of selected files as the "neighboring" context.
  - The `FileExplorerItem.tsx` component was updated to visually render the three tiers.
  - `buildPrompt.ts` was enhanced to consume the new context object (full content for selected files, smart previews for neighboring files).
- **Outcome:** The feature became visible and interactive. The File Explorer now provides feedback based on file selection, and the prompt builder is more intelligent.

#### **Stage 3: Live Task Description Analysis (Completed)**

- **Goal:** Make the context builder dynamic by reacting to the user's written intent in real-time.
- **Implementation:**
  - The `RelevanceEngineService.ts` was enhanced to process the `taskDescription` text and implement the "Task Keywords" heuristic.
  - The `ActionPanel.tsx` was wired up to trigger a debounced context recalculation as the user types in the task description area.
- **Outcome:** The UI became dynamic. The File Explorer now updates automatically as the user types, providing immediate feedback on how their task description influences the context.

#### **Stage 4: Comprehensive Scoring Engine (Completed)**

- **Goal:** Upgrade the context builder's intelligence by implementing the full, multi-faceted scoring algorithm.
- **Implementation:**
  - The `RelevanceEngineService.ts` was fully developed with the complete two-phase scoring logic defined in the specification.
  - Heuristics relying on the foundational services, such as `Shared Commits`, `Sibling File`, and `Folder Co-location`, were integrated.
- **Outcome:** The quality of "neighboring" context suggestions improved dramatically. The system now uses a sophisticated, weighted model to determine relevance, transparently enhancing the user experience.

#### **Stage 5: Granular UI Relevance Visualization (Completed)**

- **Goal:** Implement the detailed UI feedback mechanism, showing not just _what_ is relevant, but _how_ relevant it is.
- **Implementation:**
  - Enhance `FileExplorerItem.tsx` to apply background highlighting to "Neighboring" files.
  - The component will receive the relevance score for each file from the `RelevanceEngineService`.
  - Implement the client-side logic for the visualization: score thresholding, normalization, the non-linear transform (`1 - (1 - x)^2`), and mapping the final value to a color gradient.
- **Outcome:** The user interface provides a much richer, more intuitive understanding of the context builder's suggestions. The "Neighboring" files are no longer a monolithic block but are visually ranked by relevance, allowing for faster user comprehension.

#### **Stage 6: Advanced Graph-Based Analysis (Completed)**

- **Goal:** Introduce a deeper level of project understanding by analyzing the entire codebase for high-level structure and implicit relationships.
- **Implementation:**
  - Create `ProjectGraphService.ts` to build a project-wide dependency graph and a file-mention map.
  - This service will identify "Hub Files" and find non-obvious file mentions.
  - Integrate these new `Project Hub` and `File Mention` heuristics into the scoring engine.
- **Outcome:** The context builder can now identify globally important files (e.g., configs, base styles, core utilities) even if they aren't directly imported by the selected files, leading to a more holistic and accurate context.

#### **Stage 7: Performance & Caching**

- **Goal:** Ensure the advanced graph analysis is performant by implementing a hybrid caching strategy that minimizes disruption while keeping data fresh.
- **Implementation:**
  - **Hybrid Rebuild Strategy:** A two-pronged approach is implemented:
    1.  **Intelligent Background Rebuild:** Analysis is automatically triggered off the main thread (using a Node.js `worker_thread`) after a period of file system quiescence (3s) and user inactivity (5s idle or window blur). This prevents UI stutter and runs when the user is not actively engaged.
    2.  **Manual On-Demand Rebuild:** A "Refresh Project Analysis" button is added to the UI, allowing users to force a rebuild at any time.
  - **Caching in `ProjectGraphService.ts`:** The service now includes `saveToCache()` and `loadFromCache()` methods to serialize the graph to `.ath_materials/project_graph.json`. On startup, the cache is loaded, falling back to a full analysis only if the cache is missing or stale.
- **Outcome:** The feature is now fast and scalable, providing advanced analysis without a recurring performance penalty. The intelligent refresh logic ensures the data is up-to-date without interrupting the user's workflow, making it suitable for large, real-world projects.

#### **Stage 8: Live Activity & User Configuration**

- **Goal:** Complete the feature by incorporating real-time file activity and allowing users to customize the engine's behavior.
- **Implementation:**
  - Integrate the final heuristics: `Actively Editing` (by tracking file `mtime` from Chokidar) and `Recent Commit Activity`.
  - Add a "Context Builder Settings" section to the project settings UI, allowing users to tune key scoring parameters.
- **Outcome:** The feature is now complete. It's fully dynamic, reacting to what the user is selecting, typing, and editing. It's also configurable, allowing expert users to tailor its behavior to their specific needs, fulfilling all design goals.
