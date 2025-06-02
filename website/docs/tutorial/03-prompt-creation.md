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
