// AI Summary: Handles tab navigation UI and logic with conditional content rendering.
// Provides consistent tab styling and active state management.
import React, { useState, useEffect } from 'react';
import { CircleSlashed, CircleDashed, GitCompare } from 'lucide-react';
import CommandButton from './CommandButton';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { useLogStore } from '../stores/logStore';
import { useSettingsStore } from '../stores/settingsStore';

export type TabType = 'workbench' | 'viewer' | 'review' | 'settings' | 'cli';

interface AthanorTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isCliAvailable: boolean;
}

const AthanorTabs: React.FC<AthanorTabsProps> = ({
  activeTab,
  onTabChange,
  isCliAvailable,
}) => {
  const { addLog } = useLogStore();
  const { setOperations, clearOperations, diffMode, setDiffMode } =
    useApplyChangesStore();
  const { applicationSettings } = useSettingsStore();

  // Determine if experimental features should be shown
  const showExperimentalFeatures = applicationSettings?.enableExperimentalFeatures ?? false;

  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'workbench'
              ? 'bg-gray-200 dark:bg-gray-700 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onTabChange('workbench')}
          title="Create and refine AI prompts using selected files and task templates"
        >
          Prompt Studio
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'viewer'
              ? 'bg-gray-200 dark:bg-gray-700 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onTabChange('viewer')}
          title="View and preview selected files with syntax highlighting"
        >
          File Viewer
        </button>
        <button
          className={`px-4 py-2 rounded flex items-center ${
            activeTab === 'review'
              ? 'bg-gray-200 dark:bg-gray-700 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onTabChange('review')}
          title="Review and apply AI-generated code changes or view uncommitted Git changes"
          data-test-id="review-tab-button"
        >
          <GitCompare className="w-4 h-4 mr-2" />
          Review
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'settings'
              ? 'bg-gray-200 dark:bg-gray-700 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onTabChange('settings')}
          title="Manage your project-specific and application-wide preferences"
        >
          Settings
        </button>
        {isCliAvailable && (
          <button
            className={`px-4 py-2 rounded ${
              activeTab === 'cli'
                ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => onTabChange('cli')}
            title="Open an integrated command-line terminal"
          >
            CLI
          </button>
        )}
      </div>
      <div className="flex items-center">
        {showExperimentalFeatures && (
          <button
            className={`p-2 rounded mr-2 ${
              diffMode === 'strict'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            onClick={() =>
              setDiffMode(diffMode === 'strict' ? 'fuzzy' : 'strict')
            }
            title={`Diff Mode: ${
              diffMode === 'strict'
                ? 'Strict (Exact Match Only)'
                : 'Fuzzy (Fallback to Fuzzy Matching - EXPERIMENTAL)'
            }`}
          >
            {diffMode === 'strict' ? (
              <CircleSlashed className="w-5 h-5" />
            ) : (
              <CircleDashed className="w-5 h-5" />
            )}
          </button>
        )}
        <CommandButton
          addLog={addLog}
          setOperations={setOperations}
          clearOperations={clearOperations}
          setActiveTab={onTabChange}
        />
      </div>
    </div>
  );
};

export default AthanorTabs;
