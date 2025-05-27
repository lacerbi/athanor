## Getting Started with Athanor 🚀

Athanor is a desktop application designed to help developers integrate AI coding assistants into their local workflow. It streamlines creating AI prompts with relevant code context and applying the AI-generated changes back to your codebase.

Here's a step-by-step guide on how to use its main features:

---

### 1. Project Setup 📂

When you first launch Athanor, you'll be prompted to **select a project folder**.

- If your project doesn't have an `.athignore` file (Athanor's specific ignore file), a dialog will appear:
  - You can choose to create a **default `.athignore` file**, which includes common rules for files and directories (like `node_modules`, `.git`, etc.).
  - If a `.gitignore` file exists in your project, you'll have the option to **import its rules** into the new `.athignore` file.
- Once the folder is selected and, if necessary, the `.athignore` file is created, Athanor will scan your project files and display them in the **File Explorer** on the left panel.
- A hidden `.ath_materials` folder is automatically created in your project to store supplementary materials like documentation fragments or project-specific settings.

---

### 2. Navigating the Interface 🗺️

Athanor's interface is primarily divided into:

- **Left Panel**:
  - **File Explorer**: Shows your project's file tree. You can expand/collapse folders, select multiple files/folders, and see line counts for text files. Right-click an item to add it to `.athignore`. The explorer automatically updates if files change on disk.
- **Right Panel**: This area contains several tabs for different functions:
  - **Prompt Studio (Workbench Tab)**: This is where you'll spend most of your time creating and refining prompts.
  - **File Viewer Tab**: Allows you to view the content of selected files.
  - **Apply Changes Tab**: Used to review and apply AI-generated code changes.
  - **Settings Tab**: Manage project-specific and global application settings.
- **Bottom Log Panel**: Displays messages, errors, and clickable events for debugging or re-inspecting actions.

---

### 3. Prompt Creation & Refinement ✍️

This is one of Athanor's core workflows.

- **Select Files/Folders**: In the File Explorer, check the boxes next to the files and/or folders relevant to your current coding task. Selecting a folder automatically selects its non-hidden descendants.
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
  - Clicking one ofthese buttons (e.g., "Coder") will use the selected files, your task description, and the chosen prompt template to generate a detailed prompt in the "Generated Prompt" text area on the right side of the Action Panel.
  - **Prompt Variants**: Many prompt templates have variants (e.g., "Default", "Full file updates"). You can right-click a prompt button to select a different variant via a context menu. The active variant is used when you left-click the button.
  - **Configuration Toggles**: You can also toggle:
    - **Smart Preview**: If enabled, non-selected files included in the prompt will have their content truncated to essential parts.
    - **Include File Tree**: Toggles whether a visualization of the project's file tree is included in the prompt.
    - **Include Project Info**: Toggles inclusion of general project information (from `PROJECT.md` or similar).
    - **Documentation Format**: Switches between XML tags and Markdown for formatting file contents in the prompt.
- **Copy the Prompt**:
  - Once the prompt is generated in the "Generated Prompt" area, click the "Copy" button next to its title.
  - Paste this prompt into your preferred AI assistant (e.g., ChatGPT, Claude, Bard).

**Example: Asking for a new feature**

1.  Select `userController.ts` and `userService.ts` in the File Explorer.
2.  In the Task Description: "Add a new API endpoint `/users/active` that returns only users active in the last 30 days."
3.  Click the "Coder" prompt button.
4.  Copy the generated prompt and paste it into your AI chat interface.

---

### 4. Applying AI-Generated Changes ⚙️

This is the second core workflow.

- **Copy AI Response**: After the AI provides a response (usually including code changes in a specific XML-like format), copy the entire response from the AI assistant to your clipboard.
- **Apply AI Output**:
  - In Athanor, look for the **"Apply AI Output" button** (often found in the header of the right panel, next to the tab names). This button becomes active when Athanor detects valid commands in your clipboard.
  - Click it. Athanor will parse the clipboard content for custom XML-like commands (e.g., `<ath command="apply changes">...</ath>`).
- **Review Changes**:
  - The application will switch to the **"Apply Changes" tab**.
  - Here, you'll see a list of proposed file operations (CREATE, UPDATE_FULL, UPDATE_DIFF, DELETE).
  - For each file, you can see a **diff view** showing the proposed changes (similar to GitHub diffs).
  - **Accept or Reject**: For each proposed change, click "Accept" or "Reject".
- **Finalize**: Accepted changes are applied to your local files on disk. Rejected changes are discarded.

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
