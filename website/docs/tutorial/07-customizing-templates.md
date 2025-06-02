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
