<ath_task
id="build_context_map"
order="5"
label="Build Context Map"
icon="Map"
tooltip="Generate hierarchical repo map with summaries for agentic context building">

<ath_task_variant
id="comprehensive"
label="Comprehensive Scan"
tooltip="Full recursive scan with short and long summaries">

# Task: Build Hierarchical Context for Agentic Coding

## Overview

Generate comprehensive project summaries at multiple levels of detail to enable efficient agentic coding without context bloating. This task systematically processes folders and files to create both short (one sentence) and long (detailed functionality) summaries.

## Target Location

{{selected_files}}

## Instructions

### Phase 1: Directory Traversal Setup

1. Start from the selected folder(s) above (if no files are selected, start from the project root and do the full project)
2. Recursively traverse all subdirectories
3. **IMPORTANT**: Respect .gitignore rules - skip any files/folders that match .gitignore patterns
4. Create a processing plan that lists all directories and files to be analyzed

### Phase 2: File-Level Summary Generation

**CRITICAL**: For each file, spawn a sub-agent to handle the analysis. The sub-agent should:

1. **Read the file content** completely
2. **Check for existing summaries** in the same directory:
   - Look for `.summary_short.md` and `.summary_long.md`
   - If found, read them to build upon existing understanding
3. **Generate two summary types**:

   **Short Summary** (1 sentence):
   - Capture the file's primary purpose in one clear, concise sentence
   - Focus on WHAT the file does, not HOW
   - Example: "Implements the main authentication service handling user login, logout, and session management."

   **Long Summary** (detailed):
   - Main purpose and responsibility
   - Key functions/classes/components with brief descriptions
   - Important interfaces or APIs exposed
   - Critical dependencies (internal and external)
   - Notable algorithms or business logic
   - Any non-obvious behaviors or gotchas
   - Integration points with other parts of the system

### Phase 3: Directory-Level Summary Aggregation

For each directory containing files:

1. **Create/Update `.summary_short.md`**:
   - One-line description of the directory's purpose
   - List of files with their one-sentence summaries
   - Format:

   ```markdown
   # Directory: [path]

   Purpose: [one sentence describing this directory's role]

   ## Files:

   - `filename1.ext`: [short summary]
   - `filename2.ext`: [short summary]
   ```

2. **Create/Update `.summary_long.md`**:
   - Detailed overview of the directory's functionality
   - How files work together
   - Key architectural decisions
   - Important patterns used
   - Format:

   ```markdown
   # Directory: [path]

   ## Overview

   [2-3 paragraphs about this directory's role and importance]

   ## Key Components

   ### filename1.ext

   [long summary from file analysis]

   ### filename2.ext

   [long summary from file analysis]

   ## Internal Dependencies

   [How files in this directory interact]

   ## External Dependencies

   [What this directory depends on from other parts of the project]
   ```

### Phase 4: Hierarchical Aggregation

After processing all files and immediate subdirectories:

1. **Bubble up summaries** to parent directories
2. Parent directory summaries should synthesize child directory summaries
3. Continue until reaching the root selected folder

### Phase 5: Update Agentic Documentation

Look for and update agentic documentation files in the project root or .ath_materials:

1. **Check for existing files**:
   - `CLAUDE.md`
   - `GEMINI.md`
   - `AI_CONTEXT.md`
   - Any other `*.md` files that appear to be AI/agent instructions

2. **Update or create sections**:
   - Add/update a "Project Structure Context" section that explains:
     - The existence of `.summary_short.md` and `.summary_long.md` files throughout the project
     - How these files provide hierarchical context at each directory level
     - That agents should consult these files for quick understanding of any part of the codebase
     - The purpose: to enable efficient navigation without processing all files
   - Include a "Last Context Build" timestamp
   - Add instructions for agents on how to use these summary files effectively

   Example section to add:

   ```markdown
   ## Project Structure Context

   This project has been analyzed and documented with hierarchical summaries.
   In each directory, you'll find:

   - `.summary_short.md`: One-line descriptions of the directory and its files
   - `.summary_long.md`: Detailed analysis of components, dependencies, and architecture

   Use these files to quickly understand any part of the codebase without reading all source files.
   Start with `.summary_short.md` for navigation, then consult `.summary_long.md` for details.

   Last Context Build: [timestamp]
   ```

## Important Considerations

1. **Incremental Updates**: If summary files already exist, build upon them rather than starting fresh. Look for patterns that might have changed.

2. **Sub-Agent Spawning**: Each file should be processed by its own sub-agent to ensure thorough analysis and prevent context overflow in the main agent.

3. **File Type Awareness**: Adjust summary detail based on file type:
   - Source code: Focus on APIs, logic, and dependencies
   - Configuration: Highlight key settings and their impacts
   - Documentation: Extract main topics and cross-references
   - Tests: Note what functionality is being tested

4. **Summary File Naming**: Always use:
   - `.summary_short.md` for one-line summaries
   - `.summary_long.md` for detailed summaries
   - The dot prefix makes them hidden files in Unix-like systems

5. **Multiple Passes**: This task is designed to be run multiple times. Each pass can refine and improve summaries based on accumulated context.

## Output Expectations

- Summary files created in each processed directory
- Updated agentic documentation with fresh context
- A final report listing all directories processed and any issues encountered

Remember: The goal is to create a contextual map that allows future AI agents to quickly understand and navigate the codebase without needing to process every file in detail.
</ath_task_variant>

</ath_task>
