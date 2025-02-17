// AI Summary: Manages .athignore file creation and rule updates with intelligent .gitignore integration.
// Creates new .athignore files with optional standard rules and .gitignore imports, avoiding duplicates.
// Provides addToIgnore() for adding paths with wildcard support and 'ignoreAll' pattern generation.
// Integrates with main process via window.fileSystem for file operations and rule management.
interface AthignoreOptions {
  useStandardIgnore: boolean;
  importGitignore: boolean;
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
    const defaultAthignorePath = await window.fileSystem.getResourcesPath();
    const defaultContent = (await window.fileSystem.readFile(
      await window.fileSystem.joinPaths(
        defaultAthignorePath,
        'files/default_athignore'
      ),
      { encoding: 'utf8' }
    )) as string;

    let finalContent = '';

    // If using standard ignore rules, use the entire default content
    if (options.useStandardIgnore) {
      finalContent = defaultContent;
    } else {
      // Extract only the initial comment header (everything up to first blank line)
      finalContent = defaultContent.split(/\n\s*\n/)[0] + '\n\n';
    }

    // If importing from .gitignore and it exists, add those patterns
    if (options.importGitignore) {
      const gitignorePath = await window.fileSystem.joinPaths(
        projectPath,
        '.gitignore'
      );
      const exists = await window.fileSystem.fileExists(gitignorePath);

      if (exists) {
        const gitignoreContent = (await window.fileSystem.readFile(
          gitignorePath,
          {
            encoding: 'utf8',
          }
        )) as string;

        // Get lines from .gitignore
        const gitignoreLines = gitignoreContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line);

        // Get existing lines from default content if standard ignore is used
        const existingLines = options.useStandardIgnore
          ? defaultContent.split('\n').map((line) => line.trim())
          : [];

        // Filter out duplicates
        const uniqueGitignoreLines = gitignoreLines.filter(
          (line) => !existingLines.includes(line)
        );

        if (uniqueGitignoreLines.length > 0) {
          // Add .gitignore section header
          finalContent +=
            '\n###############################################################################\n';
          finalContent += '# IMPORTED FROM .gitignore\n';
          finalContent +=
            '# These files were imported from .gitignore at creation.\n';
          finalContent +=
            '# These are NOT updated automatically if .gitignore is later changed.\n';
          finalContent +=
            '###############################################################################\n\n';

          // Add unique lines
          finalContent += uniqueGitignoreLines.join('\n') + '\n';
        }
      }
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
    await window.fileSystem.writeFile('.athignore', finalContent);
  } catch (error) {
    console.error('Error creating .athignore:', error);
    throw error;
  }
}

/**
 * addToIgnore
 * -----------
 * Pass-through call to the main process for adding a file/folder path to .athignore.
 * Uses advanced logic in the main process (ignoreRulesManager) to handle wildcard patterns,
 * and optionally sets an ignoreAll flag for ignoring all items with the same name.
 *
 * @param itemPath - Absolute or relative path to be ignored
 * @param ignoreAll - Whether to ignore all items by that name
 */
export async function addToIgnore(
  itemPath: string,
  ignoreAll: boolean = false
): Promise<boolean> {
  try {
    return await window.fileSystem.addToIgnore(itemPath, ignoreAll);
  } catch (error) {
    console.error(`Error adding path to ignore: ${itemPath}`, error);
    throw error;
  }
}
