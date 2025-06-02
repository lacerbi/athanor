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
