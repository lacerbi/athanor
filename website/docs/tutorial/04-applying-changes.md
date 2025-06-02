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
