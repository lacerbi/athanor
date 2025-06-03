// AI Summary: Handles initial project setup dialog when .athignore is missing.
// Manages checkbox states for standard rules and gitignore integration.
import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface ProjectCreationDialogProps {
  isOpen: boolean;
  // Called when user cancels the dialog - should reset dialog state without re-triggering folder selection
  onClose: () => void;
  onCreateProject: (useStandardIgnore: boolean, importGitignore: boolean) => Promise<void>;
  gitignoreExists: boolean;
  folderName: string;
}

const ProjectCreationDialog: React.FC<ProjectCreationDialogProps> = ({
  folderName,
  isOpen,
  onClose,
  onCreateProject,
  gitignoreExists,
}) => {
  const [useStandardIgnore, setUseStandardIgnore] = useState(true);
  const [importGitignore, setImportGitignore] = useState(gitignoreExists);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setImportGitignore(gitignoreExists);
  }, [gitignoreExists]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      await onCreateProject(useStandardIgnore, importGitignore);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Create Athanor Project in &quot;{folderName}&quot;
        </h2>
        
        <div className="bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 dark:border-blue-500/70 p-4 mb-4">
          <div className="font-medium text-gray-900 dark:text-blue-200">Project Configuration</div>
          <div className="text-sm text-gray-600 dark:text-blue-300/80">
            Configure how Athanor should handle file ignoring in this project.
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="useStandardIgnore"
              checked={useStandardIgnore}
              onChange={(e) => setUseStandardIgnore(e.target.checked)}
              className="mt-1 accent-blue-500 dark:accent-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
            />
            <div className="flex items-center">
              <label
                htmlFor="useStandardIgnore"
                className="text-sm font-medium leading-none text-gray-900 dark:text-gray-200"
              >
                Include default .athignore
              </label>
              <span title="Include a default set of ignore rules for common files and directories like node_modules, .git, etc.">
                <HelpCircle 
                  className="h-4 w-4 ml-1 text-gray-400 dark:text-gray-500 cursor-help"
                />
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="importGitignore"
              checked={importGitignore}
              onChange={(e) => setImportGitignore(e.target.checked)}
              disabled={!gitignoreExists}
              className="mt-1 accent-blue-500 dark:accent-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            />
            <div className="flex items-center">
              <label
                htmlFor="importGitignore"
                className={`text-sm font-medium leading-none ${!gitignoreExists ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-200'}`}
              >
                Import .gitignore options
              </label>
              <span title={gitignoreExists ? "Import ignore rules from the existing .gitignore file" : "No .gitignore file found in this folder"}>
                <HelpCircle 
                  className="h-4 w-4 ml-1 text-gray-400 dark:text-gray-500 cursor-help"
                />
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 dark:disabled:bg-blue-600/50 transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreationDialog;
