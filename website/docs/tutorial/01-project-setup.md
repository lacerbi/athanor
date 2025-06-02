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

After selecting your folder, Athanor may present you with configuration options:

### Creating `.athignore`

If your project doesn't have an `.athignore` file (Athanor's specific ignore file), a dialog will appear with options:

- **Create default `.athignore` file**: Includes common rules for files and directories like:

  - `node_modules/`
  - `.git/`
  - `.DS_Store`
  - `*.log`
  - Build artifacts and temporary files

- **Importing from `.gitignore`**: If a `.gitignore` file exists in your project, you'll have the option to **import its rules** into the new `.athignore` file. This helps maintain consistency with your existing project exclusions.

:::info What is an `.athignore` file?
The `.athignore` file is specific to Athanor and plays a crucial role in managing your project's visibility within the application. It tells Athanor which files and folders to exclude from Athanor's File Explorer and from being considered during prompt generation.

Key characteristics:

- **Primary Ignore File**: It's the main way Athanor filters project content.
- **Gitignore-like Syntax**: It uses rules similar to `.gitignore` for pattern matching (e.g., `node_modules/`, `*.log`, `build/`). Advanced wildcard matching is supported.
- **Purpose**: To keep your Athanor workspace clean and focused by hiding irrelevant files, build artifacts, or sensitive directories, ensuring that only relevant content is included in AI prompts.

**If a file or folder located in your project does not show in Athanor's file manager, it is likely because of an `.athignore` rule.** This is normally a desired behavior, but there might be rare cases where you want to see a usually ignored file–edit the `.athignore` as appropriate.

:::

## Project Scanning

Once the folder is selected and the `.athignore` file is configured:

1. Athanor will scan your project files
2. Files and folders listed in `.athignore` will **not** appear in the File Explorer
3. The file tree will be displayed in the **File Explorer** on the left panel

## Supplementary Materials

Athanor automatically creates a hidden `.ath_materials` folder in your project to store:

- Documentation fragments
- Project-specific settings
- Custom prompt templates (if you create any)
- Other supplementary materials

This folder helps keep Athanor-specific files organized without cluttering your main project.

## Next Steps

With your project configured, you're ready to explore Athanor's interface and start creating your first AI prompts!
