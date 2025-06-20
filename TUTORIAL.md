**For the most up-to-date tutorial information, videos and materials, check out the [website](https://athanor.works/).**

---
---
id: introduction
title: Getting Started with Athanor
sidebar_position: 1
---

# Getting Started with Athanor

Welcome to the Athanor tutorial!

Athanor is a desktop application designed to help users and developers integrate AI assistants into their workflow. It streamlines creating AI prompts with relevant file context and applying the AI-generated changes back to your project or codebase.

<video
autoPlay
muted
playsInline
controls
className="tutorial-hero-video"
title="Athanor AI Workbench Demo"

>

  <source src="/video/athanor-demo-av1.mp4" type='video/mp4; codecs="av01.0.05M.08"' />
  <source src="/video/athanor-demo-x264.mp4" type="video/mp4" />
  Your browser does not support the video tag. Consider upgrading to a newer browser.
</video>

_Watch Athanor's workflow in action: Describe task → Select files → Generate prompts → Use any AI chat assistant → Review and apply changes_

## What You'll Learn

This tutorial will guide you through Athanor's main features:

- **Project Setup**: How to configure your project with Athanor
- **Interface Navigation**: Understanding the layout and panels
- **Prompt Creation**: Building effective AI prompts with context
- **Applying Changes**: Reviewing and implementing AI suggestions
- **Advanced Features**: Custom templates, preset tasks, and workflows

## Prerequisites

Before starting, ensure you have:

- **Node.js** (latest LTS version, v18.x+) installed
- A code project or folder you'd like to work with
- Access to an AI assistant like ChatGPT, Claude, or Gemini

## Installation

### Node.js

Follow these steps if **Node.js** is not installed in your system.

- **Windows**: Download and install from [nodejs.org](https://nodejs.org/)
- **macOS**:
  - Using Homebrew (recommended): `brew install node`
  - Download and install from [nodejs.org](https://nodejs.org/)
- **Linux**:
  - Ubuntu/Debian: `sudo apt update && sudo apt install nodejs npm`
  - Fedora: `sudo dnf install nodejs npm`
  - Or use [NVM](https://github.com/nvm-sh/nvm) (recommended): `nvm install --lts`

### Athanor

If you haven't installed Athanor yet, follow these steps.

The easiest way to install Athanor is with the command-line installer:

```bash
npx setup-athanor [athanor-installation-folder]
```

This command downloads the Athanor source code, installs all necessary dependencies, and compiles a ready-to-run desktop application. The `[athanor-installation-folder]` is optional and defaults to `athanor`.

### Running Athanor

After the setup script finishes, you can launch the compiled application.

1.  **Locate the application:** The Athanor executable is in the `out` subfolder of your installation directory.
    - **macOS**: `[athanor-installation-folder]/out/Athanor-darwin-*/Athanor.app`
    - **Windows**: `[athanor-installation-folder]\out\Athanor-win32-*\Athanor.exe`
    - **Linux**: `[athanor-installation-folder]/out/Athanor-linux-*/Athanor`
2.  **Launch Athanor:** Simply double-click the application to run it.

<details>
<summary>🛡️ <strong>Security Warning When Running the App for the First Time</strong></summary>

Because the application is compiled on your machine and not signed by a verified developer, your OS might show a security warning.

- **On macOS:** Gatekeeper may block the app.

  1.  Right-click the `Athanor.app` icon and select "Open".
  2.  A dialog will appear warning you that the developer is unidentified. Click the "Open" button to run the app.
      You only need to do this the first time you launch the application.

- **On Windows:** You may see a "Windows SmartScreen" popup. Click "More info" and then "Run anyway" to proceed.

</details>

<details>
<summary><strong>Manual Installation & Alternative Running Methods</strong></summary>

If the `npx` command fails, or if you prefer to set up the project manually, follow these steps.

**1. Clone the Repository:**

```bash
git clone [https://github.com/lacerbi/athanor.git](https://github.com/lacerbi/athanor.git)
```

Alternatively, you can [download the source code](https://github.com/lacerbi/athanor/archive/refs/heads/main.zip) as a ZIP file and extract it.

**2. Install Dependencies:**

```bash
cd athanor
npm ci
```

**3. Choose how to run the app:**

- **Option A: Compile the Application (Recommended)**
  Manually compile the application into a standalone executable.

  ```bash
  npm run package
  ```

  This creates the application in the `out` folder, which you can then run as described above.

- **Option B: Run in Development Mode**
  This method is useful for development but is slower and opens a console with the application.

  ```bash
  npm start
  ```

</details>

Once Athanor launches, you're ready to begin the tutorial!

## Open Source & Community Feedback

Athanor is an open-source project. You're welcome to explore the [codebase on GitHub](https://github.com/lacerbi/athanor).

:::warning 🚧 **ALPHA SOFTWARE**: 🚧

Please be aware that Athanor is currently in an **alpha stage**. This means the application is under active development. Features described here may evolve, and you might encounter some rough edges or bugs.

Your feedback is incredibly valuable as we refine both the application and this tutorial. Please report any issues or share your thoughts via [GitHub Issues](https://github.com/lacerbi/athanor/issues) and [GitHub Discussions](https://github.com/lacerbi/athanor/discussions).

Thank you for exploring Athanor!

:::

---
id: project-setup
title: Project Setup
sidebar_position: 2
---

# 1. Project Setup

When you first launch Athanor, you'll be prompted to **select a project folder**. This is where Athanor will analyze your files and help you create AI prompts.

## Folder Selection

Choose any folder containing code, documentation, or files you want to work with. This could be:

- A software development project
- A documentation repository
- A research project with various file types
- Any folder structure you'd like AI assistance with

## Ignore File Configuration

Athanor filters files using both `.gitignore` and its own `.athignore` file. This keeps your workspace clean and ensures prompts contain only relevant content.

### How It Works

- **`.gitignore`**: By default, Athanor automatically respects the rules in your project's `.gitignore` file. You can disable this behavior in the **Settings** tab.
- **`.athignore`**: This file is used for Athanor-specific rules or to override `.gitignore`. For example, you can re-include a file ignored by `.gitignore` using an exception rule like `!path/to/file`.

### Initial Project Setup

When you first select a project folder, Athanor helps you configure your ignore settings:

- If a `.gitignore` file is present, its rules are applied automatically.
- If your project does not have an `.athignore` file, a dialog will appear offering to create a default one. This is recommended and includes common rules for files like `node_modules/`, `.git/`, and build artifacts.

:::info What is the `.athignore` file?
The `.athignore` file gives you fine-grained control over file visibility within Athanor without modifying your project's main `.gitignore`.

Key characteristics:

- **Role**: It works alongside `.gitignore` to filter the project. Use it for Athanor-specific rules or to override `.gitignore` rules.
- **Gitignore-like Syntax**: It uses the same pattern matching as `.gitignore` (e.g., `node_modules/`, `*.log`, `build/`) and supports advanced wildcards.
- **Purpose**: To hide irrelevant files, build artifacts, or sensitive directories, keeping your Athanor workspace focused.

**If a file or folder does not appear in Athanor's file explorer, it is likely due to a rule in either `.gitignore` or `.athignore`.** You can edit the appropriate file to adjust visibility.
:::

## Project Scanning

Once the folder is selected:

1. Athanor scans your project directory.
2. Files and folders matching rules in `.gitignore` (if enabled) and `.athignore` will **not** appear in the File Explorer.
3. The filtered file tree is displayed in the **File Explorer** on the left panel

## Supplementary Materials

Athanor automatically creates a hidden `.ath_materials` folder in your project to store:

- Documentation fragments
- Project-specific settings
- Custom prompt templates (if you create any)
- Other supplementary materials

This folder helps keep Athanor-specific files organized without cluttering your main project.

## Next Steps

With your project configured, you're ready to explore Athanor's interface and start creating your first AI prompts!

---
id: navigating-interface
title: Navigating the Interface
sidebar_position: 3
---

# 2. Navigating the Interface

Athanor's interface is designed to streamline your AI-assisted workflow. Let's explore the main areas and their functions.

## Interface Layout

![Athanor Interface](/img/tutorial/athanor_snapshot.png)
_Athanor's interface: File explorer (left), task management and prompt generation (right)_

Athanor's interface is primarily divided into three main areas:

### Left Panel: File Explorer

The **File Explorer** shows your project's file tree with several key features:

- **Expand/Collapse**: Click folder icons to navigate your project structure
- **Multi-Select**: Check boxes next to files and folders to include them in prompts
- **Context Menu**: Right-click any item to add it to `.athignore` or perform other actions
- **Refresh**: Updates automatically when files change, or manually refresh if needed

On top of the File Explorer, buttons allows you to:

- **Open** another project folder
- **Refresh** the File Manager (and Athanor as a whole)
- **Copy** the content of the selected files to the clipboard

### Right Panel: Multi-Tab Workspace

The right panel contains several tabs for different functions:

#### Prompt Studio (Workbench Tab)

This is your main workspace, containing:

- **Task Description**: Text area where you describe what you want the AI to do
- **Context Field**: Optional area for ephemeral data like commit messages or specific instructions
- **Preset Prompts**: Buttons for different prompt templates (Autoselect, Query, Coder, Architect, etc.)
- **Preset Tasks**: Pre-defined tasks like "AI Summary" or "Refactor Code"
- **Generated Prompt**: Display area for the final prompt, automatically copied to clipboard
- **Configuration Toggles**: Options for Smart Preview, Include File Tree, Documentation Format

#### File Viewer Tab

- View the content of selected files
- Preview file contents before including them in prompts

#### Apply Changes Tab

- Review AI-generated code changes
- Preview diffs and selectively apply modifications
- Accept or reject individual file changes

#### Settings Tab

- Manage project-specific and global application settings
- Configure API keys for direct AI integration (optional)

### Bottom Panel: Log Display

The **bottom log panel** shows:

- Messages and notifications
- Error information
- Clickable events for debugging
- Re-inspection of previous actions

## Key Interface Features

### Tooltips

Throughout Athanor, hover over buttons, controls, and interface elements to see **contextual help tooltips**. This is the primary method for getting quick information.

### Drag and Drop

You can **drag file paths** from the File Explorer and **drop them** into:

- Task Description text area
- Context field
- Any text input where file references are useful

### Responsive Design

The interface adapts to different window sizes and can be resized to fit your workflow preferences.

## Navigation Tips

1. **Start with File Selection**: Choose relevant files in the left panel first
2. **Use Task Description**: Clearly describe your goal in the main text area
3. **Choose Appropriate Prompts**: Different prompt types serve different purposes
4. **Monitor the Log**: Check the bottom panel for helpful messages and feedback

Now that you're familiar with the interface, let's dive into creating your first AI prompt!

---
id: prompt-creation
title: Prompt Creation & Refinement
sidebar_position: 4
---

# 3. Prompt Creation & Refinement

This is one of Athanor's core workflows. Learn how to create effective AI prompts with the right context and structure.

## The Prompt Creation Process

### Step 1: Select Relevant Files

In the **File Explorer** (left panel):

1. **Check boxes** next to files and folders relevant to your task
2. **Folder selection** automatically includes non-hidden descendants
3. **Multi-select** allows you to choose files from different directories

**Selection Strategy Tips:**

- Include files you want to modify
- Add related files for context (interfaces, types, configurations)
- Consider including documentation or README files
- Don't over-select - focus on what's truly relevant
- **No worries if this seems tedious–we'll see how to automate this soon**

### Step 2: Write Your Task Description

Navigate to the **Prompt Studio** (Workbench tab) and use the "Task Description" area:

```markdown
Example: "Implement a new function to sort users by registration date"
Example: "Refactor the ApiService.ts to use async/await instead of promises"
Example: "Explain how the authentication middleware works"
```

**Task Description Best Practices:**

- Be specific about what you want to achieve
- Include any constraints or requirements

### Step 3: Use Context Field (Optional)

The **Context** field below the task description is useful for:

- Partial commit messages
- Specific technical requirements
- Temporary notes or instructions
- Information that shouldn't be part of the main task

You won't need to use this most of the time.

### Step 4: Choose a Prompt Template

Athanor provides several **preset prompt templates**:

#### Core Prompt Types

- **Autoselect**: Asks the AI to suggest which files are relevant to your task
- **Query**: For asking questions about the codebase without making changes
- **Architect**: For planning new features or refactorings, often breaking them into multiple steps ("commits")
- **Coder**: For generating code to implement a feature or change
- **Minimal**: Provides only repository information and your task description
- **Writer**: For writing or editing text, like documentation
- **Meta-prompt**: For creating a detailed prompt from a simpler task description

#### Prompt Variants

Many prompt templates have **variants** (e.g., "Default", "Full file updates"):

1. **Right-click** a prompt button to see available variants
2. **Select** a different variant via the context menu
3. **Left-click** the button to use the active variant

### Step 5: Configure Options

Use the **configuration toggles** to customize your prompt:

- **Smart Preview**: Truncates non-selected files to essential parts only
  - If inactive, only the selected files are included in the prompt
- **Include File Tree**: Adds a schematic of your project's file structure (recommended)
- **Include Project Info**: Includes on top general project information (from `PROJECT.md` or a similar project file)
- **Documentation Format**: Switches between XML tags and Markdown for file content formatting

### Step 6: Generate and Copy

1. **Click** your chosen prompt button (e.g., "Coder")
2. The prompt appears in the **"Generated Prompt"** area
3. **Automatic copy**: The prompt is automatically copied to your clipboard

## Example Workflow

Let's walk through creating a prompt for a new feature:

1. **Select files**: `userController.ts`, `userService.ts`, `userTypes.ts`
2. **Task description**: "Add a new API endpoint `/users/active` that returns only users active in the last 30 days"
3. **Choose prompt**: Click "Coder" for implementation-focused prompt
4. **Generated prompt**: Comprehensive prompt with file contents and clear instructions
5. **Copy to AI**: Paste into ChatGPT, Claude, or your preferred AI assistant

## Prompt Types in Detail

### Autoselect Workflow

Perfect when you're not sure which files to include or when you feel lazy (which if you are like me I assume it's most of the time):

1. **Describe your task** without selecting specific files
2. **Click "Autoselect"** to generate a file selection prompt
   - Ensure "Smart Preview" is active, so that the prompt includes code snippets
3. **Paste into AI** to get file recommendations
4. **Apply AI Output** to automatically select suggested files
5. **Generate** a follow-up prompt with the selected files

### Query Workflow

Great for understanding existing code:

1. **Ask specific questions** in the task description
2. **Select** (or _Autoselect_) files you want to understand or may be needed to answer your query
3. **Use "Query"** prompt for analysis-focused output
4. **Get explanations** without code modifications
   - You can ask the AI assistant for a summary of your conversation (possibly to reuse in Athanor for your next prompt)

### Architect Workflow

Ideal for complex features:

1. **Describe the overall feature** you want to build
   - Again, Select or _Autoselect_ relevant files
2. **Use "Architect"** to get a step-by-step plan
3. **Receive commit-by-commit** breakdown
4. **Use individual commits** as context for follow-up "Coder" prompts
   - You can select individual commits from the Task Context area
   - You can also just proceed with your AI assistant, asking it to implement one commit at a time ("Go on with Commit 2", ...)

## Tips for Better Prompts

1. **Be specific**: Vague descriptions lead to generic responses
2. **Provide context**: Include relevant background information
3. **Set expectations**: Mention coding style, patterns, or constraints
4. **Use examples**: If you have preferences, include examples
5. **Iterate**: Start with a simple prompt and refine based on results

Next, learn how to apply the AI's response back to your project!

---
id: applying-changes
title: Applying AI-Generated Changes
sidebar_position: 5
---

# 4. Applying AI-Generated Changes

Learn how to safely review and apply AI-generated code changes to your project using Athanor's built-in diff viewer and selective application system.

:::warning Essential Prerequisite: Use Version Control!
Before you begin applying AI-generated changes (or making any significant modifications to your codebase), it is **HIGHLY DISCOURAGED** to proceed without having a version control system (like Git) in place and your project committed to it.

**Why is this crucial?**

- **Safety Net**: Version control allows you to create snapshots (commits) of your project. If Athanor (or any tool) introduces an undesirable change, you can easily revert your entire project to a previous, working state.
- **Experimentation**: Knowing you can undo changes encourages safer experimentation with AI-generated code.
- **Tracking**: It provides a clear history of what was changed, when, and by what means.

**If you haven't already, please:**

1.  Initialize a Git repository in your project (`git init` or create a new GitHub repository and clone it locally).
2.  Commit your current work (`git add .` followed by `git commit -m "Initial commit before using Athanor"`).
3.  Commit frequently as you make changes.

Not using version control while applying automated code modifications can lead to irreversible data loss or project corruption. **Proceed with caution if you choose to ignore this advice.**
:::

## The Apply Changes Workflow

![Apply Changes Interface](/img/tutorial/athanor_snapshot_apply_changes.png)
_'Apply Changes' panel: Review and accept/reject proposed file changes displayed in the diff view_

### Step 1: Copy AI Response

After receiving a response from your AI assistant:

1. **Copy** the relevant AI response to your clipboard
2. Make sure to include any XML-formatted commands in the response

:::warning Important Note on AI Response Formatting

AI chat interfaces can **sometimes** display XML responses with formatting issues, as Markdown delimiters (like ` ``` `) might be misinterpreted by the chat's visualizer. This can make the XML appear broken or incomplete.

This is a common occurrence. **Ensure you copy the _full_ AI response** from the chat interface, not just a partially displayed or seemingly broken snippet, to ensure Athanor can correctly parse the commands.
:::

### Step 2: Apply AI Output

In Athanor, look for the **"Apply AI Output" button**:

- Located in the **header of the right panel** (next to tab names)
- **Becomes active** when Athanor detects valid commands in your clipboard
- **Click** to process the clipboard content. If Athanor detects file operations in the clipboard, it will open the "Apply Changes" tab. Other Athanor commands might update Athanor's state, such as selecting files or changing the visualized task.

### Step 3: Review in Apply Changes Tab

If the AI response includes commands to modify files, Athanor automatically switches to the **"Apply Changes" tab**. Here you'll see:

- **List of proposed operations**: `CREATE`, `UPDATE_FULL`, `UPDATE_DIFF`, `DELETE`
- **File-by-file breakdown**: Each proposed change listed separately
- **Diff viewer**: Visual comparison showing before/after changes
- **Accept/Reject buttons**: Individual control over each change

## Types of File Operations

### `CREATE` Operations

- **Purpose**: Add new files to your project
- **Display**: Shows the full content of the new file
- **Review**: Check if the file location and content are appropriate

### `UPDATE_FULL` Operations

- **Purpose**: Replace entire file contents
- **Display**: Highlighted sections showing additions/deletions
- **Use case**: When major refactoring affects most of the file

### `UPDATE_DIFF` Operations

- **Purpose**: Apply specific changes within a file
- **Display**: Highlighted sections showing additions/deletions
- **Use case**: Targeted modifications, bug fixes, small feature additions

### `DELETE` Operations

- **Purpose**: Remove files from your project
- **Display**: Shows which file will be deleted
- **Caution**: Review carefully before accepting deletions

## Understanding the Diff Viewer

The diff viewer uses standard conventions:

- **Green lines**: New content being added
- **Red lines**: Existing content being removed
- **Context lines**: Unchanged content for reference
- **Line numbers**: Help you locate changes in your files

## Making Decisions: Accept or Reject

For each proposed change:

### Accept a Change

- **Click "Accept"** if the change looks correct and beneficial
- The change will be applied to your local file when you finalize
- Accepted changes turn green in the list

### Reject a Change

- **Click "Reject"** if the change is unwanted or incorrect
- The change will be discarded and not applied
- Rejected changes turn red in the list

### Review Criteria

Consider these factors when reviewing:

1. **Correctness**: Does the code look syntactically correct?
2. **Logic**: Does the implementation match your requirements?
3. **Style**: Does it follow your project's coding conventions?
4. **Scope**: Is the change appropriately targeted?
5. **Side effects**: Could this change break other parts of your code?

## Example AI Response Format

Athanor's prompts ask AI assistants to return responses in a format such as:

```xml
<ath command="apply changes">
  <file>
    <file_message>Add new endpoint to UserController</file_message>
    <file_operation>UPDATE_DIFF</file_operation>
    <file_path>src/controllers/userController.ts</file_path>
    <file_code><![CDATA[
<<<<<<< SEARCH
// Existing code to search for
=======
// New code to replace the search block with
>>>>>>> REPLACE
    ]]></file_code>
  </file>
  <file>
    <file_message>Create new function in UserService</file_message>
    <file_operation>CREATE</file_operation>
    <file_path>src/services/userService.ts</file_path>
    <file_code><![CDATA[
// Full content of the new file
    ]]></file_code>
  </file>
</ath>
```

## Best Practices

### Before Applying Changes

1. **Read through** all proposed changes
2. **Understand** what each change accomplishes
3. **Check** that file paths are correct
4. **Verify** the changes align with your original request

### During Review

1. **Take your time** - don't rush through changes
2. **Test critical changes** mentally before accepting
3. **Look for** potential conflicts with existing code
4. **Consider** the impact on other team members

### After Applying

1. **Test your application** to ensure everything works
2. **Run any tests** to catch potential regressions
3. **Commit changes** to version control with descriptive messages
4. **Document** any important changes for your team

## Troubleshooting

### No Changes Detected

If Athanor doesn't detect changes in your clipboard:

- Ensure you copied the entire AI response
- Check that the response includes `<ath command="apply changes">` tags
- Check that the XML is well-formed (e.g., AI assistants occasionally forget to close a `</file>` or `</ath>` tag)
- Remind the AI to use the XML format instructions

### Failed Application

If the AI's changes don't match your current file state, the **Log Display** will inform you.
This might be due to different reasons:

- The file may have been modified since generating the prompt
- Most often for `UPDATE_DIFF`, the AI failed to exactly match the correct patterns for SEARCH/REPLACE

You will be given the chance to copy the _failed diffs_ and paste them back into the AI assistant.

If this still doesn't work, try from scratch or reduce the scope of the request.

:::danger Critical Recovery: Reverting Changes with Git
If, after applying changes, your codebase is broken, features stop working, or you encounter inexplicable issues, the safest course of action is to revert to your last known good state using version control.

<details>
<summary>Recovery Instructions with Git</summary>

**Assuming you are using Git and have committed your work (as strongly recommended):**

1.  **Check your status**:
    Open your terminal in the project directory and run:

    ```bash
    git status
    ```

    This shows modified/new files.

2.  **Discard all uncommitted changes (to revert to your last commit)**:

    - **For tracked files** (files Git already knows about):

      ```bash
      git reset --hard HEAD
      ```

      **Warning**: This discards all uncommitted changes to tracked files.

    - **For untracked new files/directories** (e.g., created by Athanor):
      ```bash
      git clean -fd
      ```
      **EXTREME WARNING**: This **permanently deletes** new files/directories not yet committed. Always use with caution. Consider `git clean -nd` (dry run) first to see what would be deleted.

    Typically, run `git reset --hard HEAD` first, then `git clean -fd` if new, unwanted files were created.

**Further details on `git clean -fd`**:
The command `git clean -fd` is used to remove untracked files from your working directory.

- `-f` (or `--force`): This flag is required because Git wants to ensure you don't accidentally delete files. Without it, `git clean` will not remove anything.
- `-d`: This tells Git to also remove untracked directories. Without `-d`, only untracked files would be removed.
- **Dry Run**: Before running `git clean -fd`, it's often a good idea to do a "dry run" with `git clean -nd`. This will show you a list of files and directories that _would be_ removed, without actually deleting them, allowing you to double-check.

**If you accidentally committed problematic changes**:
If the problematic changes were already committed:

1.  **Find the commit hash**: Use `git log` to view recent commits. Identify the hash of the commit you want to undo.
    ```bash
    git log
    ```
2.  **Option A: Revert the commit (safer for shared history)**
    This creates a _new_ commit that undoes the changes from the problematic commit. Your project history is preserved.
    ```bash
    git revert <commit-hash>
    ```
3.  **Option B: Reset to a previous commit (alters history - use with caution)**
    This removes the problematic commit(s) from your branch history. **Be very careful with this if you've already pushed these commits to a shared repository**, as it can cause issues for collaborators.
    To remove the very last commit:
    ```bash
    git reset --hard HEAD~1
    ```
    To go back further, e.g., 3 commits: `git reset --hard HEAD~3`.

</details>

Having a solid version control workflow is your best defense against irreversible errors.
:::

## Safety Features

Athanor includes several safety mechanisms:

- **Preview before apply**: No changes are made until you explicitly accept them
- **Individual control**: Accept or reject each change separately
- **No automatic overwrites**: You always maintain control
- **Local changes only**: Changes are applied to your local files, not remote repositories

Ready to explore more advanced features? Let's look at preset tasks next!

---
id: preset-tasks
title: Preset Tasks
sidebar_position: 6
---

# 5. Preset Tasks

Preset tasks provide quick access to common development workflows. Instead of writing task descriptions from scratch, use these pre-defined templates to jumpstart your AI interactions.

## What Are Preset Tasks?

Preset tasks are pre-written task descriptions that target common development scenarios. They automatically populate the "Task Description" area with specific instructions optimized for particular types of work.

## Available Preset Tasks

The Action Panel features several **preset task buttons**:

### AI Summary

- **Purpose**: Generate comprehensive summaries of selected code
- **Use case**: Understanding unfamiliar codebases, creating documentation
- **Instructions**: Analyzes code structure, purpose, and key functionality

:::info Smart Preview Integration
The AI Summary task is designed to instruct the AI to place the generated summary at the very beginning of each relevant source code file (e.g., as a leading comment block). This placement is crucial for optimal use with Athanor's "Smart Preview" feature, which displays the initial lines of a file. Having the summary at the top ensures it provides immediate context when using Smart Preview.
:::

### Refactor Code

- **Purpose**: Improve code quality and structure
- **Use case**: Modernizing legacy code, applying best practices
- **Instructions**: Focuses on maintainability, readability, and performance

### Unit Tests

- **Purpose**: Generate comprehensive test coverage
- **Use case**: Adding tests to existing code, test-driven development
- **Instructions**: Creates thorough test cases with edge case coverage

### PR Changelog

- **Purpose**: Generate release notes and change summaries
- **Use case**: Documenting changes for pull requests or releases
- **Instructions**: Analyzes differences and creates user-friendly summaries

## How to Use Preset Tasks

### Basic Workflow

1. **Select files** in the File Explorer that you want the task to apply to
2. **Click** the desired preset task button (e.g., "AI Summary")
3. **Review** the auto-populated task description
4. **Modify** the description if needed for your specific requirements
5. **Generate prompt** using an appropriate prompt template (usually "Coder" or "Writer")

### Example: Using AI Summary

1. **Select** `userService.ts`, `userController.ts`, and `userTypes.ts`
2. **Click** "AI Summary" preset task
3. **Task description populates** with instructions for the AI, including placing the summary at the start of the files.
4. **Click** "Coder" prompt to generate documentation-focused prompt.
5. **Copy to AI** which will provide an AI-generated summary at the beginning of each file, ready for Athanor's Smart Preview feature.

### Example: Using Refactor Code

1. **Select** files containing legacy or problematic code (one file at a time is often best)
2. **Click** "Refactor Code" preset task
3. **Task description populates** with refactoring instructions
4. **Add context** if you have specific refactoring goals
5. **Use "Coder"** prompt for implementation-focused output

### Example: Using PR Changelog

Generate Pull Request descriptions and Changelog entries from commit messages.

1.  **Paste commit messages** into the **Context field**.
    - You can use a command like this to get changes since the last commit in `main`:
    ```bash
    git log --oneline --no-merges $(git merge-base HEAD main)..HEAD
    ```
2.  **Click** the "PR Changelog" preset task button in the Action Panel.
3.  **Copy the generated prompt** to your preferred AI assistant (e.g., ChatGPT, Claude, Gemini, etc.).
4.  **Use the AI's response** (PR description and changelog text) for platforms such as GitHub and release notes.

## Editing Preset Tasks

You can modify the auto-populated task descriptions to better fit your needs:

### Adding Specificity

After clicking a preset task, edit the description to:

- Target specific functions or classes
- Focus on particular aspects (performance, security, etc.)
- Include project-specific requirements
- Add context about coding standards or patterns

### Combining with Context

Use the **Context field** to provide additional information:

- Specific coding style guidelines
- Performance requirements
- Compatibility constraints
- Integration requirements

## Tips for Better Results

### File Selection Strategy

- **Include related files**: Dependencies, interfaces, types
- **Add context files**: README, configuration files
- **Consider scope**: Don't over-select for focused tasks

### Task Description Enhancement

- **Be specific**: Add details about your particular requirements
- **Include constraints**: Mention limitations or requirements
- **Set expectations**: Specify the type of output you want

## Troubleshooting Common Issues

### Generic Responses

If AI responses are too generic:

- Add more specific context to the task description
- Include examples of what you're looking for
- Select more relevant files for context

### Inappropriate Suggestions

If suggestions don't fit your project:

- Modify the preset task description
- Add project-specific requirements
- Include coding style or pattern examples

### Incomplete Coverage

If the AI misses important aspects:

- Break the task into smaller, more focused requests
- Use multiple preset tasks for comprehensive coverage
- Provide additional context about missed areas

Ready to explore more advanced features? Let's look at other useful Athanor capabilities!

---
id: other-features
title: Other Features
sidebar_position: 7
---

# 6. Other Features

Beyond its core functionalities, Athanor offers several features to enhance your workflow and productivity. This section highlights key additional capabilities, with a focus on Direct API Integration.

## Direct API Integration (Experimental)

Athanor provides an **optional direct API integration** for users who wish to streamline their interaction with AI models, bypassing the manual copy-paste steps for certain operations that would not particularly benefit from a chat interface (such as **Autoselect** prompts).

### Purpose

- **Automate AI interactions**: Directly send prompts and receive responses within Athanor.
- **Streamline workflows**: Useful for quick queries or repetitive tasks (such as **Autoselect**).
- **Bypass manual copy-paste**: For users with API access, this can speed up certain tasks.

### Setup Requirements

1.  Navigate to the **Settings tab** within Athanor.
2.  Configure your **API keys** for supported AI providers.
3.  Select your preferred default models and parameters.
4.  Test the connection to ensure it's working correctly.

### Supported Providers

Athanor aims to support popular AI models. Current integrations include:

- **OpenAI**: Models like GPT-4.1 and o4-mini.
- **Anthropic**: Claude 3.x and 4 series.
- **Google**: Gemini models.
  _(Provider list may be updated in future versions)._

### Using API Integration

1.  Generate your prompt in Athanor as usual.
2.  If configured, the **"Send via API"** button will appear below the Generated Prompt area together with a model selector.
3.  Click "Send via API" to send the prompt directly to the selected AI provider and model.
4.  After processing, the AI's response will automatically appear in Athanor.
5.  You can then use Athanor's tools to apply changes or utilize the response.

### Important Considerations

- **API Costs**: Direct API usage will incur costs based on your AI provider's pricing.
- **Free Tiers**: Some providers (e.g., Google) offer a free tier with powerful models (e.g., Gemini 2.5 Flash), which are particularly suitable choices.
- **Rate Limits**: Be mindful of API rate limits imposed by providers.
- **Context Window Limitations**: APIs have token limits; ensure your prompts fit.
- **Data Privacy**: Sending data to third-party APIs has privacy implications. Consider the sensitivity of your project files, especially if on a "free" tier which will use the data for model training.
- **Experimental Feature**: This functionality is experimental and may evolve.

## Project Information File

A Project Information File is a dedicated document within your project (or a standard one like `PROJECT.MD` or `README.MD`) that serves as a centralized source of high-level context for AI assistants. Its primary purpose is to provide consistent, foundational knowledge about your project, ensuring that the AI has a better understanding of its goals, constraints, and conventions.

### Why Use a Project Information File?

- **Consistent AI Context**: Ensures that every prompt can be augmented with the same core project details, leading to more consistent AI behavior.
- **Reduced Prompt Repetition**: Avoids the need to repeat common instructions or project details in every individual prompt.
- **Improved AI Accuracy**: Helps the AI generate more relevant and accurate responses, code, or documentation by grounding it in the project's specifics.
- **Onboarding for AI**: Acts like an "onboarding document" for the AI, quickly bringing it up to speed on what your project is about.

### What to Include in Your Project Information File

The content can be tailored to your project's needs, but common elements include:

- **Project Overview**: A brief description of the project, its purpose, and its main objectives.
- **Technology Stack**: Key programming languages, frameworks, libraries, and tools used.
- **Architectural Principles**: High-level architectural patterns or decisions.
- **Coding Conventions/Style Guides**: Specific rules or preferences for code style (e.g., "Always use functional components in React," "Ensure all Python functions have docstrings").
- **Key Data Structures**: Descriptions of important data models or formats.
- **"Dos and Don'ts" for the AI**: Specific instructions for the AI (e.g., "Do not use deprecated library X," "Prefer solutions that are easily testable").
- **Domain-Specific Terminology**: Explanations of any jargon or concepts unique to the project's domain.

### How Athanor Utilizes It

Athanor facilitates the use of such a file through its "Include Project Info" setting (a toggle in the main panel). When enabled:

1.  **File Selection**: You can specify the path to your Project Information File in Athanor's settings.
2.  **Automatic Detection**: If no file is explicitly set, Athanor can search for common candidates like `PROJECT.md` or `README.md` in your project's root directory.
3.  **Prompt Augmentation**: Athanor will then automatically include the content of this file within the prompts sent to the AI, providing it with the rich context you've prepared.

Ensuring the Project Information File is comprehensive and kept up-to-date can significantly enhance the quality and relevance of AI assisted outputs in your workflow.

## Other Key Enhancements

Athanor includes several other features designed to make your development process smoother:

### Efficient UI and Help

- **Contextual Tooltips**: Hover over buttons, controls, and UI elements for immediate, concise explanations of their functions. This provides help without cluttering the interface.
- **Multi-Tab Task Management**: Work on multiple tasks simultaneously. Each tab maintains its own task description and context, allowing for parallel development and better organization.

### Advanced File Handling

- **Drag and Drop**: Easily reference files by dragging them from the File Explorer into the Task Description or Context fields.
- **Dynamic File Explorer**: The file tree automatically updates with file system changes (additions, deletions, modifications). Right-click options allow for quick actions like adding files to `.athignore`.

### Customization and Control

- **Configuration Toggles**: Tailor Athanor's behavior with settings like:
  - **Smart Preview**: If active, non-selected files in prompts are truncated to their initial parts, reducing size while maintaining context. If inactive, only selected files are included in prompts.
  - **Include File Tree**: Option to include the project structure in prompts for better AI understanding.
  - **Include Project Info**: The project info file is included in the prompt to give context to the AI assistant about the current project.
  - **Documentation Format**: Switch between XML tags and Markdown for AI-generated changes, optimizing for different AI models.

### Workflow Efficiency

- **Performance Tips**:
  - Select only relevant files for your prompts.
  - Utilize `.athignore` to exclude unnecessary files and folders.
  - Close unused task tabs to conserve resources.
- **Keyboard Shortcuts**: Use standard shortcuts (e.g., Ctrl/Cmd + C, Ctrl/Cmd + V) for common actions.
- **Troubleshooting & Support**:
  - Check tooltips for guidance.
  - Review messages in the log panel for errors or clues.
  - For bugs or feature requests, visit Athanor's GitHub Issues page. For questions, use GitHub Discussions.

Ready to learn about customizing Athanor with your own templates? Let's explore advanced customization options!

---
id: customizing-templates
title: Customizing Prompts and Tasks
sidebar_position: 8
---

# 7. Customizing Prompts and Tasks

Athanor allows you to create custom prompt and task templates to tailor the application to your specific workflow needs. These templates can supplement or override the default ones provided with Athanor.

## Athanor's Prompt and Task Designers

Click on the **"Custom Prompts & Tasks Help"** button near the Preset Prompts and Tasks area to open a window which offers assistance on creating prompts.

In particular, Athanor provides two designer prompts that you can copy into an AI assistant to help you write effective custom prompts and tasks.

We provide below additional information to create custom prompts and tasks.

## Template Storage Locations

Custom templates are stored in XML files in two possible locations:

### 1. Global User Templates

Available across all projects:

- **Windows**: `%APPDATA%\athanor\prompts\`
- **macOS**: `~/Library/Application Support/athanor/prompts/`
- **Linux**: `~/.config/athanor/prompts/`

### 2. Project-Specific Templates

Only available in the current project:

- **Location**: `.ath_materials/prompts/` within your project directory

Both directories are automatically created when Athanor starts up if they don't already exist.

Both directories can be accessed through links in the "Custom Prompts & Tasks Help" window.

## Template Override Priority

When templates with the same `order` exist in multiple locations, they follow this priority:

**Project-Specific > Global User > Default Application**

This means:

- A project-specific template will override a global user template with the same `order`
- A global user template will override a default application template with the same `order`
- Templates with unique `order`s from all sources will appear together in the UI

## Creating Custom Templates

Create a new file in either the global or project-specific `prompts` folder using this naming convention:

- **Prompt templates**: `prompt_[name].xml`
- **Task templates**: `task_[name].xml`

### XML File Structure

Custom templates follow the same XML structure as the default templates. Here's the basic structure:

#### Prompt Template Structure

```xml
> <-- REMOVE THIS SECTION
> Each Athanor prompt is enclosed in `ath_prompt` XML tags, which includes one or more `ath_prompt_variant`.
> The `ath_prompt` and `ath_prompt_variant` tags have attributes:
> - `id`: Unique identifier
> - `label`: Display name in the UI
> - `tooltip`: Hover text description
> - `order` (only `ath_prompt`): Numeric value for sorting (lower numbers appear first; used for overriding)
> - `icon`(only `ath_prompt`): Lucide React icon name (e.g., "Search", "Code", "Zap")
>
> The file needs to be named `prompt_[name].xml` and placed in either the project
> or global `prompts` folder.
> REMOVE THIS SECTION -->

<ath_prompt
    id="example_explanation"
    order="99"
    label="Prompt Example"
    icon="HelpCircle"
    tooltip="This prompt explains the structure of Athanor prompt files.">

    <ath_prompt_variant
        id="default"
        label="Default Explanation"
        tooltip="Explains the standard components of an Athanor prompt.">
<project>
# Documentation `{{project_name}}`

{{project_info}}
<file_contents>
{{file_contents}}
</file_contents>

{{file_tree}}{{codebase_legend}}
</project>

<system_prompt>
> <-- WRITE YOUR SYSTEM PROMPT HERE
> This `system_prompt` block sets the stage for the AI assistant.
> It usually contains:
> 1. Role Definition: Assigns a role to the AI (e.g., "You are an expert AI assistant and software engineer.").
> 2. Core Goal: Describes the primary purpose of this type of prompt (e.g., "Perform detailed planning for new features.").
> 3. High-Level Instructions: General guidelines or procedures the AI should follow.
> 4. Constraints or Important Notes: Any overarching rules or critical points.
> WRITE YOUR SYSTEM PROMPT HERE -->
</system_prompt>

<current_task>
<task_description>
{{task_description}}{{task_context}}
</task_description>

> <-- WRITE TASK-SPECIFIC INSTRUCTIONS HERE
> This section following `task_description` provides detailed instructions for the AI on how to process the task and format its response. It's the core logic of the prompt template.
> - Thinking Process: Often encourages the AI to "think step-by-step" or "first write down thoughts."
> - Output Structure: Specifies the exact format of the AI's response. For Athanor, this is typically one or more XML blocks.
> - Key XML Tags: Details the required Athanor-specific XML tags and their attributes (e.g., `<ath command="task">`, `<ath command="select">`, `<ath command="apply changes">`).
> - Content Guidelines: Instructions on what information to include within those XML tags (e.g., rewritten task description, analysis, implementation plan, file lists, code changes).
> - Formatting Rules: Specifics about whitespace, character encoding, or CDATA usage if applicable.
>
> Look at other prompt examples in [Athanor's prompts folder](https://github.com/lacerbi/athanor/tree/main/resources/prompts).
> WRITE TASK-SPECIFIC INSTRUCTIONS HERE -->
</current_task>

> <-- ADDITIONAL EXPLANATION (REMOVE THIS SECTION)
>
> ## Key Components Explained:
>
> An Athanor Prompt file defines the entire interaction structure with the AI, including system prompts, context injection, and AI response formatting.
>
> ### 1. `<ath_prompt>` Element:
> The root element for a prompt definition.
> -   `id="example_explanation"`: A unique machine-readable identifier for this prompt.
> -   `order="99"`: A number determining its position in the UI list of preset prompts. Lower numbers appear first. This can also be used for overriding default prompts if a custom prompt has the same order as a default one.
> -   `label="Prompt Example"`: The human-readable name displayed in the Athanor UI.
> -   `icon="HelpCircle"`: Specifies a Lucide React icon to be displayed next to the label.
> -   `tooltip="This prompt explains the structure of Athanor prompt files."`: Text that appears when a user hovers over this prompt button in the UI.
>
> ### 2. `<ath_prompt_variant>` Element:
> A prompt can have one or more variants, allowing for different instructions or system prompts for the same basic purpose.
> -   `id="default"`: A unique ID for this specific variant of the parent prompt.
> -   `label="Default Explanation"`: The human-readable name for this variant (e.g., accessible via a right-click context menu on the prompt button).
> -   `tooltip="Explains the standard components of an Athanor prompt."`: Hover text for this specific variant.
>
> ### 3. `<project>` Block:
> This block is where Athanor injects project-specific context. It typically includes:
> -   `{{project_name}}`: The name of the current project.
> -   `{{project_info}}`: General information about the project.
> -   `{{file_contents}}`: The content of selected files.
> -   `{{file_tree}}`: A textual representation of the project's directory structure.
> -   `{{codebase_legend}}`: Legend for symbols in file tree/contents.
> For most projects, the default `<project>` block provided above should be fine as is.
>
> ### 4. `<system_prompt>` Block:
> This block defines the AI's role, core goals, high-level instructions, and constraints. It sets the overall behavior for the AI when this prompt is used.
>
> ### 5. `<current_task>` Block:
> This block contains the user's specific request and detailed instructions for the AI.
> -   `<task_description>`: Athanor injects the user's task here using `{{task_description}}` and optional `{{task_context}}`.
> -   The subsequent content within `<current_task>` provides detailed instructions on how the AI should process the task, structure its thinking, and format its response, often specifying Athanor-specific XML output.
>
> ADDITIONAL EXPLANATION (REMOVE THIS SECTION) -->

</ath_prompt_variant>

> <-- REMOVE THIS SECTION
> You can add other `ath_prompt_variant` sections here and below.
> These can be selected by right-clicking on the prompt button.
> REMOVE THIS SECTION -->

</ath_prompt>
```

#### Task Template Structure

```xml
> <-- REMOVE THIS SECTION
> Each Athanor task template is enclosed in `ath_task` XML tags, which includes one or more `ath_task_variant`.
> Athanor task templates are used to pre-fill the "Task Description" field in the UI.
> This pre-filled description is then typically used by an `ath_prompt` (like "Coder" or "Writer")
> when it incorporates the `{{task_description}}` placeholder.
>
> The `ath_task` and `ath_task_variant` tags have attributes:
> - `id`: Unique identifier for the task or variant.
> - `label`: Display name in the UI.
> - `tooltip`: Hover text description.
> - `order` (only `ath_task`): Numeric value for sorting (lower numbers appear first; used for overriding).
> - `icon` (only `ath_task`): Lucide React icon name (e.g., "FileText", "Scissors", "TestTube2").
> - `requires` (only `ath_task`, optional): Condition for the task to be active. Common value is "selected" if the task requires files to be selected in the File Explorer.
>
> The file needs to be named `task_[name].xml` and placed in either the project
> or global `prompts` folder.
> REMOVE THIS SECTION -->

<ath_task
    id="example_task_explanation"
    order="99"
    label="Task Example"
    icon="HelpCircle"
    tooltip="This task template explains the structure of Athanor task files (.xml)."
    requires="selected">

<ath_task_variant
    id="default"
    label="Default Explanation"
    tooltip="Explains the standard components of an Athanor task template.">
> <-- WRITE YOUR TASK HERE
> # Purpose of an Athanor Task Template
>
> This content, when this "Task Example" is selected in Athanor's UI, will pre-fill the "Task Description" text area.
> Athanor task templates (`.xml` files like this one) serve to provide pre-defined, structured instructions for common operations you might want an AI to perform.
>
> Unlike an `ath_prompt` file, which defines the *entire interaction structure with the AI* (including system prompts, context injection, and AI response formatting), an `ath_task` file primarily focuses on generating the *specific instructions for a particular task*.
> This generated text then usually populates the `{{task_description}}` variable within an active `ath_prompt`.
>
> For example, if you select files and click the "AI Summary" task, the content of `task_ai_summary.xml` (or its selected variant) is loaded into the "Task Description" field. Then, if you click the "Coder" prompt button, that description is packaged into the "Coder" prompt sent to the AI.
> WRITE YOUR TASK HERE -->

> <-- ADDITIONAL EXPLANATION (REMOVE THIS SECTION)
> ## Key Components Explained:
>
> ### 1. `<ath_task>` Element:
> The root element for a task definition.
> -   `id="example_task_explanation"`: A unique machine-readable identifier for this task.
> -   `order="99"`: A number determining its position in the UI list of tasks. Lower numbers appear first. This can also be used for overriding default tasks if a custom task in user or project settings has the same order as a default one.
> -   `label="Task Example"`: The human-readable name displayed in the Athanor UI.
> -   `icon="HelpCircle"`: Specifies a Lucide React icon to be displayed next to the label.
> -   `tooltip="This task template explains the structure of Athanor task files (.xml)."`: Text that appears when a user hovers over this task in the UI.
> -   `requires="selected"`: An optional attribute. If set to "selected", this task button will only be enabled if one or more files/folders are selected in the File Explorer. Other values might be used for different conditions.
>
> ### 2. `<ath_task_variant>` Element:
> A task can have one or more variants, allowing for different flavors or scopes of the same basic task.
> -   `id="default"`: A unique ID for this specific variant of the parent task.
> -   `label="Default Explanation"`: The human-readable name for this variant (e.g., accessible via a right-click context menu on the task button).
> -   `tooltip="Explains the standard components of an Athanor task template."`: Hover text for this specific variant.
>
> ### 3. Content of `<ath_task_variant>`:
> The text within this tag is the actual template for the task description. It can be plain text or use Markdown for formatting.
> This content often includes placeholders that Athanor will replace at runtime.
>
> Common placeholders you might use in a task template:
> -   `{{selected_files}}`: A list of the currently selected file paths.
> -   `{{selected_files_with_info}}`: A list of selected files with additional information (like line counts).
> -   Other placeholders might be available depending on the Athanor version and specific context.
>
> This current text block you are reading is an example of such content. It describes what the task should achieve and provides detailed instructions or guidelines.
>
> ## How to Use This Task Template Example:
> 1.  Select one or more files in the Athanor File Explorer (because `requires="selected"` is set).
> 2.  Click the "Task Example" button in the "Preset Tasks" section of Athanor's UI.
> 3.  The text you are currently reading (starting from "# Purpose of an Athanor Task Template") will appear in the "Task Description" input field.
> 4.  You can then choose an `ath_prompt` (e.g., "Coder", "Writer", "Query") to take this description, combine it with project context and system instructions, and generate a full prompt for an AI assistant.
>
> ## Best Practices for Creating Task Templates:
> -   **Clarity**: Make the instructions clear and unambiguous for the AI.
> -   **Structure**: Use Markdown (headings, lists, code blocks) to organize the information logically, as seen in the default task templates like `task_ai_summary.xml` or `task_unit_tests.xml`.
> -   **Placeholders**: Utilize relevant placeholders like `{{selected_files}}` to make your task templates dynamic and context-aware.
> -   **Examples**: Provide examples within the task description if it helps clarify complex instructions (see `task_ai_summary.xml` for good examples of this).
> -   **Focused Scope**: Each task should ideally address a well-defined operation.
>
> Look at other task examples in [Athanor's prompts folder](https://github.com/lacerbi/athanor/tree/main/resources/prompts) to see how they are structured for different purposes like generating AI summaries, refactoring code, or creating unit tests.
> Remember that the output of a task template is *input for a prompt template*.
>
> ADDITIONAL EXPLANATION (REMOVE THIS SECTION) -->

</ath_task_variant>

> <-- REMOVE THIS SECTION
> You can add other `ath_task_variant` sections here if you want to provide multiple ways
> to explain task structures or different example task contents.
> These can be selected by right-clicking on the task button in the UI.
> REMOVE THIS SECTION -->

</ath_task>
```

## Key XML Elements

### Required Attributes

#### For Both Prompts and Tasks

- **`id`**: Unique identifier (alphanumeric, hyphens, underscores)
- **`label`**: Display name in the UI
- **`order`**: Numeric value for sorting (lower numbers appear first)
- **`icon`**: Lucide React icon name (e.g., "Search", "Code", "Zap", "Settings")
- **`tooltip`**: Hover text description

#### Task-Specific Attributes

- **`requires`**: Set to "selected" if files must be selected before using this task

### Variants

Each template must have at least one variant:

- **`<ath_prompt_variant>`** for prompt templates
- **`<ath_task_variant>`** for task templates

Each variant has:

- **`id`**: Unique identifier within the template
- **`label`**: Display name in the context menu

## Template Variables

Use these placeholders in your prompt template content:

### Core Variables

- **`{{selected_files}}`**: List and content of selected files
- **`{{task_description}}`**: User's task description
- **`{{file_tree}}`**: Project file structure visualization
- **`{{project_info}}`**: Project information from PROJECT.md or similar

### Advanced Usage

## Default Prompts Folder

See Athanor's default prompts and tasks in [this folder](https://github.com/lacerbi/athanor/tree/main/resources/prompts) as further examples.

## Tips for Creating Effective Templates

### 1. Use Descriptive IDs and Labels

- Choose clear, unique identifiers
- Use labels that immediately convey the template's purpose
- Consider how the template will appear in the UI

### 2. Set Appropriate Order Values

- Use order numbers to control template positioning
- Leave gaps (10, 20, 30) to allow for future insertions
- Override default templates by using their exact order number

### 3. Provide Multiple Variants

- Create different approaches for the same general task
- Consider different output formats or focus areas
- Use descriptive variant labels

### 4. Include Helpful Tooltips

- Write brief but informative descriptions
- Explain when to use each template
- Mention any special requirements or capabilities

### 5. Test Thoroughly

- Try your templates with different file selections
- Test with various task descriptions
- Verify all variables are properly substituted

## Troubleshooting Template Issues

### Template Not Appearing

- Check XML syntax for errors
- Verify file naming convention
- Ensure the file is in the correct directory
- Restart Athanor to reload templates

### Variables Not Substituting

- Check variable spelling and syntax
- Ensure variables are wrapped in double curly braces
- Verify the variable is supported in your template type

### Icon Not Displaying

- Verify the icon name exists in Lucide React
- Check for typos in the icon attribute
- Use a fallback icon like "FileText" if unsure

### Override Not Working

- Ensure order numbers match exactly
- Check that template IDs are identical for overrides
- Verify the template is in the higher-priority location

Ready to see these concepts in action? Let's explore some practical example workflows!

---
id: example-workflows
title: Example Workflows
sidebar_position: 9
---

# 8. Example Workflows

Learn how to apply Athanor's features in real-world scenarios with these step-by-step workflow examples, from simple feature additions to complex system integrations.

## Simple Feature: Dark Mode Toggle

Let's implement a dark mode toggle for a web application.

### Step 1: Define the Task

**Task Description**:

```
Implement a dark mode toggle switch in the settings panel that saves the user's preference to localStorage and applies the theme immediately.
```

### Step 2: Smart File Selection

Instead of manually selecting files, let's use Athanor's intelligence:

1. **Don't select any files initially**
2. **Click "Autoselect"** prompt template
3. **Copy** the generated prompt to your AI assistant
4. **Paste response** back into Athanor
5. **Click "Apply AI Output"** to auto-select relevant files

The AI might suggest files like:

- `components/SettingsPanel.tsx`
- `hooks/useTheme.ts`
- `styles/globals.css`
- `contexts/ThemeContext.tsx`

### Step 3: Implement the Feature

1. **Review** the auto-selected files
2. **Click "Coder"** prompt template
3. **Copy** prompt to AI assistant
4. **Receive** implementation with proper React hooks, CSS variables, and localStorage persistence

### Step 4: Apply Changes

1. **Copy** AI response
2. **Click "Apply AI Output"**
3. **Review** each proposed change in the diff viewer
4. **Accept** changes that look correct
5. **Reject** any unwanted modifications

### Expected Outcome

- New theme toggle component
- Hook for theme management
- CSS variables for dark/light modes
- Persistent user preferences

---

## Complex Feature: Stripe Payment Integration

Let's integrate Stripe for handling monthly user subscriptions with a multi-commit approach.

### Phase 1: Architecture Planning

**Task Description**:

```
Integrate Stripe for handling monthly user subscriptions. This should include:
- Creating subscription plans
- Handling webhooks for payment success/failure
- Updating user subscription status
- Managing billing portal access
- Error handling and user feedback
```

#### Step 1: Get the Architecture Plan

1. **Click "Autoselect"** to identify relevant files
2. **Apply AI Output** to select suggested files
3. **Click "Architect"** prompt template
4. **Copy** to AI assistant for strategic planning

The AI will provide a commit-by-commit breakdown:

**Commit 1**: Setup Stripe SDK and API keys
**Commit 2**: Implement subscription plan management
**Commit 3**: Create checkout session handling
**Commit 4**: Implement webhook endpoint
**Commit 5**: Build user billing portal
**Commit 6**: Add error handling and UI feedback

#### Step 2: Copy Architecture to Context

1. **Copy** the AI's architecture response
2. **Paste** the commit plan into the **Context** field
3. This will be included in subsequent prompts

### Phase 2: Implementation (Commit by Commit)

#### Commit 1: Setup Stripe SDK

1. **Select "Commit 1" from Task Context**:
   ```
   Implement Commit 1: Setup Stripe SDK and API keys.
   Configure environment variables and initialize Stripe client.
   ```
2. **Use existing file selection** (you rarely need to rerun Autoselect)
3. **Click "Coder"** prompt
4. **Apply changes** after review

#### Commit 2: Subscription Plans

1. **Either:**
   - **Continue** in your current AI chat by telling the AI "Continue with Commit 2"; **or**
   - **Select "Commit 2" from Task Context**, click "Coder prompt" and paste in a new chat
   - This choice depends on the complexity and length of the current chat
2. **Review and apply** changes

#### Continue Pattern for Remaining Commits

Repeat the process for each commit:

- Update task context with current commit (or continue in the chat)
- Use "Coder" prompt for implementation
- Apply and test changes
- Move to next commit

### Phase 3: Integration Testing

After completing all commits:

1. **Task Description**:
   ```
   Review the complete Stripe integration implementation and provide:
   - Integration testing checklist
   - Potential security considerations
   - Performance optimization opportunities
   - Error scenarios to test
   ```
2. **Select all modified files**
3. **Use "Query"** prompt for analysis
4. **Follow AI recommendations** for testing

---

## Understanding Existing Code: Authentication Flow

Learn how to use Athanor to understand unfamiliar codebases.

### Step 1: Broad Overview

**Task Description**:

```
Explain the current user authentication flow, including:
- Token generation and validation
- Session management
- Role-based access control
- Security measures implemented
- Which files are primarily involved?
```

#### Process:

1. **Click "Autoselect"** to find auth-related files
2. **Apply AI Output** to select suggested files
3. **Click "Query"** prompt for analysis-focused output
4. **Review** AI's explanation of the authentication system

### Step 2: Deep Dive into Specific Components

Based on the AI's overview, dive deeper on the JWT token validation middleware.

#### Process:

1. **Select** specific middleware files identified in Step 1
2. Use the **copy** action from the File Manager to copy just these files in the existing chat
3. **Ask follow-up questions** in the same AI chat

### Step 3: Document Your Understanding

#### Process:

1. **Ask the AI for a Summary** of your chat
2. **Paste** the summary into the Task Description
3. **Autoselect** all authentication-related files
4. **Use "Writer"** prompt for documentation generation
5. **Apply changes** to create/update documentation files

---

## Best Practices for Workflow Success

### Planning Phase

1. **Start with Autoselect** when unsure about file selection
2. **Use Architect** for complex features requiring multiple steps
3. **Break large tasks** into smaller, manageable commits
4. **Document your plan** in the Context field

### Implementation Phase

1. **Review AI suggestions** carefully before applying
2. **Test incrementally** after each commit
3. **Use version control** to track changes
4. **Ask follow-up questions** when AI responses are unclear
5. **Stay in the chat** if the context is still relevant

### Quality Assurance

1. **Use Query prompts** to verify understanding
2. **Generate tests** for critical functionality
3. **Review security implications** of changes
4. **Document** important decisions and changes

### Team Collaboration

1. **Share custom templates** that work well for your team
2. **Use consistent commit messages** when applying changes
3. **Document workflows** that prove effective
4. **Train team members** on successful patterns

## Troubleshooting Common Workflow Issues

### AI Responses Don't Match Expectations

- **Refine task descriptions** with more specific requirements
- **Add relevant context** about coding standards or patterns
- **Include examples** of desired output format
- **Break complex requests** into smaller parts

### Changes Don't Apply Cleanly

- **Check that files haven't changed** since generating the prompt
- **Regenerate prompts** with current file state
- **Review merge conflicts** carefully
- **Apply changes in smaller batches**

### Workflow Takes Too Long

- **Use preset tasks** for common operations
- **Create custom templates** for repeated workflows
- **Leverage API integration** for simple requests
- **Batch similar operations** together

### Results Lack Project Context

- **Include `PROJECT.md` or documentation** files in selection
- **Add project-specific requirements** to task descriptions
- **Use project-specific custom templates**
- **Provide architectural context** in prompts

Ready to master Athanor? Practice these workflows with your own projects and experiment with creating custom templates that match your team's specific needs!

