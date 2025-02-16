// AI Summary: Provides the createAthignoreFile function for creating the .athignore file,
// optionally importing .gitignore content. Unifies logic for writing default rules
// and merging with user-specified patterns.

export interface AthignoreOptions {
  useStandardIgnore: boolean;
  importGitignore: boolean;
}

/**
 * Create .athignore file in the given projectPath. If useStandardIgnore is true,
 * we include the entire default content. If importGitignore is true, we incorporate
 * any non-duplicate lines from an existing .gitignore.
 */
export async function createAthignoreFile(
  projectPath: string,
  options: AthignoreOptions
): Promise<void> {
  try {
    // Read the default athignore content
    const defaultAthignorePath = await window.fileSystem.getResourcesPath();
    const combinedPath = await window.fileSystem.joinPaths(
      defaultAthignorePath,
      'files/default_athignore'
    );
    const defaultContent = (await window.fileSystem.readFile(combinedPath, {
      encoding: 'utf8',
    })) as string;

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
        const gitignoreContent = (await window.fileSystem.readFile(gitignorePath, {
          encoding: 'utf8',
        })) as string;

        const gitignoreLines = gitignoreContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line);

        // Get existing lines from default content if we used it
        const existingLines = options.useStandardIgnore
          ? defaultContent.split('\n').map((line) => line.trim())
          : [];

        // Filter out duplicates
        const uniqueGitignoreLines = gitignoreLines.filter(
          (line) => !existingLines.includes(line)
        );

        if (uniqueGitignoreLines.length > 0) {
          finalContent += '\n###############################################################################\n';
          finalContent += '# IMPORTED FROM .gitignore\n';
          finalContent += '# These files were imported from .gitignore at creation.\n';
          finalContent += '# These are NOT updated automatically if .gitignore is later changed.\n';
          finalContent += '###############################################################################\n\n';
          finalContent += uniqueGitignoreLines.join('\n') + '\n';
        }
      }
    }

    // Always add the project files section at the end
    finalContent += '\n###############################################################################\n';
    finalContent += '# PROJECT FILES\n';
    finalContent += '# Add below specific files and folders you want to ignore.\n';
    finalContent += '###############################################################################\n';

    // Write the .athignore file
    await window.fileSystem.writeFile('.athignore', finalContent);
  } catch (error) {
    console.error('Error creating .athignore:', error);
    throw error;
  }
}
