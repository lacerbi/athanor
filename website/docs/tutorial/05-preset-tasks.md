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
