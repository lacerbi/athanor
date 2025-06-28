// AI Summary: Manages .athignore file creation and rule updates with intelligent .gitignore integration.
// Now uses fileService and pathUtils APIs for file operations and path manipulation.
// Creates .athignore files with optional standard rules and handles path normalization for ignore patterns.
interface AthignoreOptions {
  useStandardIgnore: boolean;
  augmentGitignore?: boolean;
}

/**
 * initializeProjectFiles
 * ----------------------
 * Initializes project configuration files including .athignore and optionally .gitignore.
 * Creates or overwrites a .athignore file in the user's project directory.
 * Optionally creates a new .gitignore file or appends Athanor-specific rules to an existing one.
 *
 * @param projectPath - The project directory where files should be created
 * @param options - Controls file creation behavior:
 *   - useStandardIgnore: Whether to include standard ignore rules in .athignore
 *   - augmentGitignore: Whether to create/augment .gitignore with Athanor-specific rules
 */
export async function initializeProjectFiles(
  projectPath: string,
  options: AthignoreOptions
): Promise<void> {
  try {
    // Read the default athignore content
    const defaultAthignorePath = await window.fileService.getResourcesPath();
    const defaultContentPath = await window.pathUtils.join(
      defaultAthignorePath,
      'files/default_athignore'
    );
    
    const defaultContent = await window.fileService.read(
      await window.pathUtils.relative(defaultContentPath),
      { encoding: 'utf8' }
    ) as string;

    let finalContent = '';

    // If using standard ignore rules, use the entire default content
    if (options.useStandardIgnore) {
      finalContent = defaultContent;
    } else {
      // Extract only the initial comment header (everything up to first blank line)
      finalContent = defaultContent.split(/\n\s*\n/)[0] + '\n\n';
    }

    // Always add the project files section at the end
    finalContent +=
      '\n###############################################################################\n';
    finalContent += '# PROJECT FILES\n';
    finalContent +=
      '# Add below specific files and folders you want to ignore.\n';
    finalContent +=
      '###############################################################################\n';

    // Write the .athignore file
    await window.fileService.write('.athignore', finalContent);

    // Handle .gitignore augmentation if requested
    if (options.augmentGitignore) {
      try {
        // Get path to the gitignore extras file
        const gitignoreExtrasPath = await window.pathUtils.join(
          defaultAthignorePath,
          'files/default_gitignore_extras'
        );
        
        // Read the gitignore extras content
        const gitignoreExtrasContent = await window.fileService.read(
          await window.pathUtils.relative(gitignoreExtrasPath),
          { encoding: 'utf8' }
        ) as string;

        // Check if .gitignore already exists
        const gitignoreExists = await window.fileService.exists('.gitignore');
        
        let gitignoreContent = '';
        
        if (gitignoreExists) {
          // Read existing .gitignore content
          const existingContent = await window.fileService.read('.gitignore', { encoding: 'utf8' }) as string;
          // Append new rules with proper spacing
          gitignoreContent = existingContent + '\n\n' + gitignoreExtrasContent;
        } else {
          // Create new .gitignore with just the extras content
          gitignoreContent = gitignoreExtrasContent;
        }
        
        // Write the final .gitignore content
        await window.fileService.write('.gitignore', gitignoreContent);
        
      } catch (gitignoreError) {
        console.error('Error handling .gitignore:', gitignoreError);
        throw new Error(`Failed to create/update .gitignore: ${gitignoreError}`);
      }
    }
  } catch (error) {
    console.error('Error creating .athignore:', error);
    throw error;
  }
}

/**
 * addToIgnore
 * -----------
 * Pass-through call to add a file/folder path to .athignore.
 * Uses advanced logic to handle wildcard patterns, and optionally
 * sets an ignoreAll flag for ignoring all items with the same name.
 *
 * @param itemPath - Path to be ignored
 * @param ignoreAll - Whether to ignore all items by that name
 */
export async function addToIgnore(
  itemPath: string,
  ignoreAll: boolean = false
): Promise<boolean> {
  try {
    return await window.fileService.addToIgnore(itemPath, ignoreAll);
  } catch (error) {
    console.error(`Error adding path to ignore: ${itemPath}`, error);
    throw error;
  }
}
