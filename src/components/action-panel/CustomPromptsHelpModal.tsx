// AI Summary: Modal component providing help and guidance for creating custom prompt and task templates.
// Includes tutorial links, folder access buttons, and explanatory content for template customization.
import React, { useState } from 'react';
import { X, ExternalLink, Folder, Globe, FileText } from 'lucide-react';

interface CustomPromptsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomPromptsHelpModal: React.FC<CustomPromptsHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState<{
    tutorial: boolean;
    projectFolder: boolean;
    globalFolder: boolean;
  }>({
    tutorial: false,
    projectFolder: false,
    globalFolder: false,
  });

  if (!isOpen) return null;

  const handleTutorialClick = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, tutorial: true }));
      await window.electronBridge.appShell.openExternalURL(
        'https://github.com/lacerbi/athanor/blob/main/TUTORIAL.md#7-customizing-prompts-and-tasks-'
      );
    } catch (error) {
      console.error('Failed to open tutorial URL:', error);
    } finally {
      setIsLoading((prev) => ({ ...prev, tutorial: false }));
    }
  };

  const handleProjectFolderClick = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, projectFolder: true }));
      const projectPromptsPath =
        await window.electronBridge.appShell.getProjectPromptsPath();
      await window.electronBridge.appShell.openPath(projectPromptsPath);
    } catch (error) {
      console.error('Failed to open project prompts folder:', error);
    } finally {
      setIsLoading((prev) => ({ ...prev, projectFolder: false }));
    }
  };

  const handleGlobalFolderClick = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, globalFolder: true }));
      const globalPromptsPath =
        await window.electronBridge.appShell.getGlobalPromptsPath();
      await window.electronBridge.appShell.openPath(globalPromptsPath);
    } catch (error) {
      console.error('Failed to open global prompts folder:', error);
    } finally {
      setIsLoading((prev) => ({ ...prev, globalFolder: false }));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Custom Prompts & Tasks Help
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Introduction */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Create Your Own Templates
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You can add your own custom prompt and task templates to Athanor.
              These XML files allow you to tailor AI interactions to your
              specific needs and workflows, supplementing or overriding the
              default templates.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Custom templates can be stored globally (available across all
              projects) or project-specifically (only for the current project).
            </p>
          </div>

          {/* Tutorial Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
            <h4 className="text-md font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Detailed Instructions
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              For comprehensive guidance on template structure, XML format,
              available variables, and examples, please refer to the official
              tutorial.
            </p>
            <button
              onClick={handleTutorialClick}
              disabled={isLoading.tutorial}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {isLoading.tutorial ? 'Opening...' : 'View Tutorial on GitHub'}
            </button>
          </div>

          {/* Folders Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Template Storage Locations
            </h4>

            {/* Project-Specific Folder */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Folder className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">
                    Project-Specific Templates
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Templates stored here are only available in the current
                    project. Perfect for project-specific workflows or team
                    standards.
                  </p>
                  <button
                    onClick={handleProjectFolderClick}
                    disabled={isLoading.projectFolder}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded transition-colors"
                  >
                    <Folder className="w-4 h-4" />
                    {isLoading.projectFolder
                      ? 'Opening...'
                      : 'Open Project Prompts Folder'}
                  </button>
                </div>
              </div>
            </div>

            {/* Global User Folder */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">
                    Global User Templates
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Templates stored here are available across all your Athanor
                    projects. Ideal for personal workflows and commonly used
                    patterns.
                  </p>
                  <button
                    onClick={handleGlobalFolderClick}
                    disabled={isLoading.globalFolder}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    {isLoading.globalFolder
                      ? 'Opening...'
                      : 'Open Global Prompts Folder'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Quick Tips
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>
                • Templates with the same{' '}
                <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-xs">
                  order
                </code>{' '}
                value will override defaults
              </li>
              <li>
                • Project-specific templates take priority over global ones
              </li>
              <li>
                • Use descriptive IDs and clear tooltips for better usability
              </li>
              <li>
                • Refresh the file manager after adding new templates to see
                them in the UI
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPromptsHelpModal;
