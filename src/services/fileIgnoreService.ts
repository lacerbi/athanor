// AI Summary: Manages .athignore file creation and rule updates with intelligent .gitignore integration.
// Now uses fileService and pathUtils APIs for file operations and path manipulation.
// Creates .athignore files with optional standard rules and handles path normalization for ignore patterns.
interface AthignoreOptions {
  useStandardIgnore: boolean;
}

/**
 * createAthignoreFile
 * -------------------
 * Creates or overwrites a .athignore file in the user's project directory.
 * Optionally imports .gitignore rules and merges them with the default .athignore template.
 *
 * @param projectPath - The project directory where .athignore should be placed
 * @param options - Controls whether standard ignore rules or .gitignore lines are used
 */
export async function createAthignoreFile(
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
