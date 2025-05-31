> 🚧 **PRE-ALPHA SOFTWARE & TUTORIAL**: 🚧
> Welcome to the Athanor tutorial! Please be aware that Athanor is currently in a **pre-alpha stage**. This means the application is under active development. Features described here may evolve, and you might encounter some rough edges or bugs.
>
> Your feedback is incredibly valuable as we refine both the application and this tutorial. Please report any issues or share your thoughts via [GitHub Issues](https://github.com/lacerbi/athanor/issues) and [GitHub Discussions](https://github.com/lacerbi/athanor/discussions).
>
> Thank you for exploring Athanor!

---

## Getting Started with Athanor 🚀

Athanor is a desktop application designed to help users and developers integrate AI assistants into their workflow. It streamlines creating AI prompts with relevant file context and applying the AI-generated changes back to your project or codebase.

Here's a step-by-step guide on how to use its main features:

---

### 1. Project Setup 📂

When you first launch Athanor, you'll be prompted to **select a project folder**.

- If your project doesn't have an `.athignore` file (Athanor's specific ignore file), a dialog will appear:
  - You can choose to create a **default `.athignore` file**, which includes common rules for files and directories (like `node_modules`, `.git`, etc.).
  - If a `.gitignore` file exists in your project, you'll have the option to **import its rules** into the new `.athignore` file.
- Once the folder is selected and, if necessary, the `.athignore` file is created, Athanor will scan your project files and display them in the **File Explorer** on the left panel.
  - Files and folders listed in `.athignore` will **not** appear in the File Explorer.
- A hidden `.ath_materials` folder is automatically created in your project to store supplementary materials like documentation fragments or project-specific settings.

---

### 2. Navigating the Interface 🗺️

Athanor's interface is primarily divided into:

- **Left Panel**:
  - **File Explorer**: Shows your project's file tree. You can expand/collapse folders, select multiple files/folders, and see line counts for text files. Right-click an item to add it to `.athignore`. The explorer can be refreshed to update if files change on disk.
- **Right Panel**: This area contains several tabs for different functions:
  - **Prompt Studio (Workbench Tab)**: This is where you'll spend most of your time creating and refining prompts.
  - **File Viewer Tab**: Allows you to view the content of selected files.
  - **Apply Changes Tab**: Used to review and apply AI-generated code changes.
  - **Settings Tab**: Manage project-specific and global application settings.
- **Bottom Log Panel**: Displays messages, errors, and clickable events for debugging or re-inspecting actions.

<p align="center">
  <img src="./resources/images/athanor_snapshot.png" alt="Athanor AI Workbench Snapshot" width="750">
  <br>
  <em>Athanor's interface. Left: File explorer. Right: Tabs. Bottom right: Log panel. The current panel is the prompt studio, showing the task management, preset prompts and tasks, and generated prompts areas.</em>
</p>

---

### 3. Prompt Creation & Refinement ✍️

This is one of Athanor's core workflows.

- **Select Files/Folders**: In the File Explorer, check the boxes next to the files and/or folders relevant to your current task. Selecting a folder automatically selects its non-hidden descendants.
- **Write Your Task Description**:
  - Go to the **Prompt Studio** (Workbench tab) in the right panel.
  - In the "Task Description" text area, describe what you want the AI to do (e.g., "implement a new function to sort users by registration date," "refactor the `ApiService.ts` to use async/await," "explain how the authentication middleware works").
  - You can use the optional "Context" field below the task description for ephemeral data, like partial commit messages or specific instructions that shouldn't be part of the main task description but might be useful for the AI.
- **Generate the Prompt**:
  - Above the "Task Description" area, you'll find **Preset Prompts and Tasks** buttons. These are pre-defined templates. Common ones include:
    - **Autoselect**: Asks the AI to suggest which files are relevant to your task.
    - **Query**: For asking questions about the codebase.
    - **Architect**: For planning new features or refactorings, often breaking them into commits.
    - **Coder**: For generating code to implement a feature or change.
    - **Minimal**: Provides only repository information and your task description.
    - **Writer**: For writing or editing text, like documentation.
    - **Meta-prompt**: For creating a detailed prompt from a simpler task description.
  - Clicking one of these buttons (e.g., "Coder") will use the selected files, your task description, and the chosen prompt template to generate a detailed prompt in the "Generated Prompt" text area on the right side of the Action Panel.
  - **Prompt Variants**: Many prompt templates have variants (e.g., "Default", "Full file updates"). You can right-click a prompt button to select a different variant via a context menu. The active variant is used when you left-click the button.
  - **Configuration Toggles**: You can also toggle:
    - **Smart Preview**: If enabled, non-selected files included in the prompt will have their content truncated to essential parts.
    - **Include File Tree**: Toggles whether a visualization of the project's file tree is included in the prompt.
    - **Include Project Info**: Toggles inclusion of general project information (from `PROJECT.md` or similar).
    - **Documentation Format**: Switches between XML tags and Markdown for formatting file contents in the prompt.
- **Copy the Prompt**:
  - Once the prompt is generated in the "Generated Prompt" area, it is automatically copied to the clipboard (you can also click the "Copy" button next to its title).
  - Paste this prompt into your preferred AI assistant (e.g., ChatGPT, Claude, Gemini).

**Example: Asking for a new feature**

1.  Select `userController.ts` and `userService.ts` in the File Explorer.
2.  In the Task Description: "Add a new API endpoint `/users/active` that returns only users active in the last 30 days."
3.  Click the "Coder" prompt button, which will generate a prompt and copy it to the clipboard.
4.  Paste the prompt into your AI chat interface.

---

### 4. Applying AI-Generated Changes ⚙️

This is the second core workflow.

- **Copy AI Response**: After the AI provides a response (usually including file changes in a specific XML-like format), copy the entire response from the AI assistant to your clipboard.
- **Apply AI Output**:
  - In Athanor, look for the **"Apply AI Output" button** (found in the header of the right panel, next to the tab names). This button becomes active when Athanor detects valid commands in your clipboard.
  - Click it. Athanor will parse the clipboard content for custom XML-like commands (e.g., `<ath command="apply changes">...</ath>`).
- **Review Changes**:
  - The application will switch to the **"Apply Changes" tab**.
  - Here, you'll see a list of proposed file operations (CREATE, UPDATE_FULL, UPDATE_DIFF, DELETE).
  - For each file, you can see a **diff view** showing the proposed changes (similar to GitHub diffs).
  - **Accept or Reject**: For each proposed file change, click "Accept" or "Reject".
- **Finalize**: Accepted changes are applied to your local files on disk. Rejected changes are discarded.

<p align="center">
  <img src="./resources/images/athanor_snapshot_apply_changes.png" alt="Athanor AI Workbench Apply Changes Snapshot" width="750">
  <br>
  <em>'Apply Changes' panel. Review and accept/reject proposed file changes displayed in the diff view.</em>
</p>

**Example AI Response Snippet for Athanor:**

```xml
<ath command="apply changes">
  <file>
    <file_message>Add new endpoint to UserController.</file_message>
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
    <file_message>Create new function in UserService.</file_message>
    <file_operation>CREATE</file_operation>
    <file_path>src/services/userService.ts</file_path>
    <file_code><![CDATA[
// Full content of the new file
    ]]></file_code>
  </file>
</ath>
```

---

### 5. Preset Tasks 📝

The Action Panel also features **Preset Tasks** like "AI Summary" or "Refactor Code".

- Select the files you want the task to apply to in the File Explorer.
- Click the desired task button (e.g., "AI Summary").
- This will populate the "Task Description" area with a pre-defined set of instructions for the AI, targeting your selected files.
- You can then proceed to generate a prompt using one of the prompt generator buttons (like "Coder" or "Writer") as described in step 3.

---

### 6. Other Features ✨

- **Tooltips**: Hover over buttons, controls, and UI elements throughout Athanor to get contextual help.
- **Drag and Drop**: You can drag file paths from the File Explorer and drop them into the Task Description or Context text areas.
- **Send via API (Experimental)**: In the "Generated Prompt" area, there's an option to send the prompt directly to an LLM via its API, bypassing the manual copy-paste to a chat interface. This requires setting up API keys in the Settings tab. It's primarily intended for simpler calls, like "Autoselect".

---

### 7. Customizing Prompts and Tasks 🎨

Athanor allows you to create your own custom prompt and task templates to tailor the application to your specific workflow needs. These custom templates can supplement or override the default ones provided with the application.

#### Template Storage Locations

Custom templates are stored in XML files in two possible locations:

1. **Global User Templates**: Available across all projects

   - **Windows**: `%APPDATA%\athanor\prompts\`
   - **macOS**: `~/Library/Application Support/athanor/prompts/`
   - **Linux**: `~/.config/athanor/prompts/`

2. **Project-Specific Templates**: Only available in the current project
   - `.ath_materials/prompts/` within your project directory

Both directories are automatically created when Athanor starts up if they don't already exist.

#### Template Override Priority

When templates with the same `order` exist in multiple locations, they follow this override priority:

**Project-Specific > Global User > Default Application**

This means:

- A project-specific template will override a global user template with the same `order`
- A global user template will override a default application template with the same `order`
- Templates with unique `order`s from all sources will appear together in the UI

#### Creating Custom Templates

##### XML File Structure

Custom templates follow the same XML structure as the [default templates](https://github.com/lacerbi/athanor/tree/dev/resources/prompts).

You can find example templates with additional instructions here:

- [Example prompt](https://github.com/lacerbi/athanor/blob/main/resources/prompts/example_prompt.xml)
- [Example task](https://github.com/lacerbi/athanor/blob/main/resources/prompts/example_task.xml)

##### Key XML Elements

- **Root element**: `<ath_prompt>` for prompts, `<ath_task>` for tasks
- **Required attributes**:
  - `id`: Unique identifier
  - `label`: Display name in the UI
  - `order`: Numeric value for sorting (lower numbers appear first; used for overriding)
  - `icon`: Lucide React icon name (e.g., "Search", "Code", "Zap")
  - `tooltip`: Hover text description
- **Optional attributes**:
  - `requires`: For tasks only, set to "selected" if files must be selected
- **Variants**: Each template must have at least one `<ath_prompt_variant>` or `<ath_task_variant>`

##### Template Variables

You can use these placeholders in your template content:

- `{{selected_files}}`: List of selected files
- `{{task_description}}`: User's task description
- `{{file_tree}}`: Project file structure
- `{{project_info}}`: Project information (if available)

#### Tips for Creating Effective Templates

1. **Use descriptive IDs**: Choose clear, unique identifiers for your templates
2. **Set appropriate order values**: Use order numbers to control where your templates appear
3. **Provide multiple variants**: Create different approaches for the same general task
4. **Include helpful tooltips**: Brief descriptions help users understand when to use each template
5. **Test thoroughly**: Try your templates with different file selections and task descriptions

#### Example Use Cases

- **Team-specific workflows**: Create templates that match your team's coding standards
- **Language-specific prompts**: Specialized templates for different programming languages
- **Documentation templates**: Custom prompts for generating specific types of documentation
- **Testing workflows**: Templates focused on test generation and validation

### 8. Example Workflows

- **Simple Feature**: Add a dark mode toggle to the application.

  1.  Task Description: `"Implement a dark mode toggle switch in the settings panel that saves the user's preference."`
  2.  Select files manually (e.g., `SettingsPanel.tsx`, `themeStore.ts`) or use the **Autoselect** prompt, then **Apply AI Output**.
  3.  Use the **Coder** prompt, then **Apply AI Output**.
  4.  Review and apply changes in the diff viewer.

- **Complex Feature**: Integrate a new payment gateway (e.g., Stripe) for subscriptions.

  1.  Task Description: `"Integrate Stripe for handling monthly user subscriptions. This should include creating subscription plans, handling webhooks for payment success/failure, and updating user subscription status."`
  2.  Use the **Autoselect** prompt to identify relevant files, then **Apply AI Output**.
  3.  Use the **Architect** prompt to break down the integration into manageable steps, denoted as Commits (e.g., Commit 1: Setup Stripe SDK and API keys; Commit 2: Implement plan selection UI; Commit 3: Handle checkout session creation; Commit 4: Implement webhook endpoint). Then **Apply AI Output**.
  4.  Select Commit 1 from the "Context" area just below the Task description and use the **Coder** prompt.
  5.  After each **Coder** response, **Apply AI Output**, review the changes for that step in the diff viewer, and accept/reject.
  6.  If needed, discuss with your AI assistant to fix issues and apply further changes.
  7.  Once the commit is completed, proceed to the next step from the Architect's plan either in the same chat (e.g., "Proceed with Commit 2"), or generating a new **Coder** prompt with "Commit 2" as context.

- **Query Project**: Understand how user authentication is currently handled.
  1.  Task Description: `"Explain the current user authentication flow, including token generation, storage, and validation. Which files are primarily involved?"`
  2.  Use the **Autoselect** prompt to identify potentially relevant auth-related files, then **Apply AI Output**.
  3.  Use the **Query** prompt to ask your question, then review the AI's explanation.
  4.  Continue the discussion in the AI chat if you have follow-up questions based on the AI's response.
