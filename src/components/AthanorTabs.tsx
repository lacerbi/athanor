// AI Summary: Handles tab navigation UI and logic with conditional content rendering.
// Provides consistent tab styling and active state management.
import React from 'react';
import CommandButton from './CommandButton';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { useLogStore } from '../stores/logStore';

export type TabType = 'workbench' | 'viewer' | 'apply-changes';

interface AthanorTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const AthanorTabs: React.FC<AthanorTabsProps> = ({ activeTab, onTabChange }) => {
  const { addLog } = useLogStore();
  const { setOperations, clearOperations } = useApplyChangesStore();

  return (
    <div className="flex-shrink-0 border-b p-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'workbench'
              ? 'bg-gray-200 font-medium'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onTabChange('workbench')}
        >
          Prompt Studio
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'viewer'
              ? 'bg-gray-200 font-medium'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onTabChange('viewer')}
        >
          File Viewer
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'apply-changes'
              ? 'bg-gray-200 font-medium'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onTabChange('apply-changes')}
        >
          Apply Changes
        </button>
      </div>
      <CommandButton
        addLog={addLog}
        setOperations={setOperations}
        clearOperations={clearOperations}
        setActiveTab={onTabChange}
      />
    </div>
  );
};

export default AthanorTabs;
