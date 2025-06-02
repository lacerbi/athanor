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
