// AI Summary: Button component for applying AI-generated changes from clipboard.
// Handles command validation, clipboard monitoring, and change application.
// Provides tooltips and disabled states based on command validity.
import React, { useEffect } from 'react';
import { Hammer } from 'lucide-react';
import { useCommandStore } from '../stores/commandStore';
import { getCommandDescription } from '../utils/commandDescriptions';
import { applyAiOutput } from '../actions/ApplyAiOutputAction';

interface CommandButtonProps {
  addLog: (message: string) => void;
  setOperations: (ops: any[]) => void;
  clearOperations: () => void;
  setActiveTab?: (tab: 'workbench' | 'viewer' | 'apply-changes') => void;
}

const CommandButton: React.FC<CommandButtonProps> = ({
  addLog,
  setOperations,
  clearOperations,
  setActiveTab,
}) => {
  const { clipboardContent, hasValidCommands, setClipboardContent } =
    useCommandStore();

  // Check clipboard content periodically
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const content = await navigator.clipboard.readText();
        setClipboardContent(content);
      } catch (error) {
        console.error('Failed to read clipboard:', error);
        setClipboardContent(null);
      }
    };

    void checkClipboard();
    const interval = setInterval(checkClipboard, 1000);
    return () => clearInterval(interval);
  }, [setClipboardContent]);

  const tooltipText = getCommandDescription(clipboardContent);

  return (
    <button
      className={`px-4 py-2 bg-green-500 text-white rounded flex items-center ml-4 ${
        hasValidCommands
          ? 'hover:bg-green-600'
          : 'opacity-50 cursor-not-allowed'
      }`}
      onClick={() =>
        applyAiOutput({
          addLog,
          setOperations,
          clearOperations,
          setActiveTab,
        })
      }
      disabled={!hasValidCommands}
      title={tooltipText}
    >
      <Hammer className="w-4 h-4 mr-2" />
      Apply AI Output
    </button>
  );
};

export default CommandButton;
