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
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">
          Create Athanor Project in &quot;{folderName}&quot;
        </h2>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div className="font-medium">Project Configuration</div>
          <div className="text-sm text-gray-600">
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
              className="mt-1"
            />
            <div className="flex items-center">
              <label
                htmlFor="useStandardIgnore"
                className="text-sm font-medium leading-none"
              >
                Include default .athignore
              </label>
              <span title="Include a default set of ignore rules for common files and directories like node_modules, .git, etc.">
                <HelpCircle 
                  className="h-4 w-4 ml-1 text-gray-400 cursor-help"
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
              className="mt-1"
            />
            <div className="flex items-center">
              <label
                htmlFor="importGitignore"
                className={`text-sm font-medium leading-none ${!gitignoreExists ? 'text-gray-400' : ''}`}
              >
                Import .gitignore options
              </label>
              <span title={gitignoreExists ? "Import ignore rules from the existing .gitignore file" : "No .gitignore file found in this folder"}>
                <HelpCircle 
                  className="h-4 w-4 ml-1 text-gray-400 cursor-help"
                />
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreationDialog;
