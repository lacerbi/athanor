// AI Summary: Tests for workbench store including per-tab file selection logic.
// Validates tab management, file selection/deselection, and folder selection behavior.
import { useWorkbenchStore } from './workbenchStore';
import { FileItem } from '../utils/fileTree';

// Mock the fileSelection utils
jest.mock('../utils/fileSelection', () => ({
  getSelectableDescendants: jest.fn(),
}));

import { getSelectableDescendants } from '../utils/fileSelection';

describe('workbenchStore', () => {
  beforeEach(() => {
    // Reset store state before each test, ensuring a clean slate.
    useWorkbenchStore.setState({
      tabs: [
        {
          id: 'tab-1',
          name: 'Task 1',
          content: '',
          output:
            "Welcome to Athanor! ⚗️\n\nI'm here to increase your productivity with AI assistants.\nTo get started:\n\n1. Write your task or question in the text area to the left\n2. Select relevant files from the file explorer\n3. Click one of the prompt generation buttons\n4. Paste the prompt into a AI assistant\n5. Copy the AI response to the clipboard\n6. Apply the AI Output above!\n\nLet's build something great together!",
          context: '',
          selectedFiles: [],
        },
      ],
      activeTabIndex: 0,
      isGeneratingPrompt: false,
      developerActionTrigger: 0,
    });
    jest.clearAllMocks();
  });

  describe('tab management', () => {
    it('should create a new tab with inherited selection', () => {
      // Set some selected files in the current tab
      useWorkbenchStore.getState().setTabContent(0, 'test content');
      // Update state immutably instead of direct mutation
      useWorkbenchStore.setState(state => {
        const newTabs = [...state.tabs];
        newTabs[0] = { ...newTabs[0], selectedFiles: ['file1.ts', 'file2.ts'] };
        return { tabs: newTabs };
      });

      // Create a new tab
      useWorkbenchStore.getState().createTab();

      const { tabs, activeTabIndex } = useWorkbenchStore.getState();
      expect(tabs).toHaveLength(2);
      expect(tabs[1].name).toBe('Task 2');
      expect(tabs[1].selectedFiles).toEqual(['file1.ts', 'file2.ts']);
      expect(activeTabIndex).toBe(1);
    });

    it('should remove tab and adjust active index', () => {
      // Create additional tabs
      useWorkbenchStore.getState().createTab();
      useWorkbenchStore.getState().createTab();

      let state = useWorkbenchStore.getState();
      expect(state.tabs).toHaveLength(3);
      expect(state.activeTabIndex).toBe(2);

      // Remove middle tab
      useWorkbenchStore.getState().removeTab(1);

      const updatedStore = useWorkbenchStore.getState();
      expect(updatedStore.tabs).toHaveLength(2);
      expect(updatedStore.activeTabIndex).toBe(1);
    });

    it('should create new Task 1 when removing last tab', () => {
      // Remove the only tab
      useWorkbenchStore.getState().removeTab(0);

      const updatedStore = useWorkbenchStore.getState();
      expect(updatedStore.tabs).toHaveLength(1);
      expect(updatedStore.tabs[0].name).toBe('Task 1');
      expect(updatedStore.tabs[0].selectedFiles).toEqual([]);
      expect(updatedStore.activeTabIndex).toBe(0);
    });
  });

  describe('file selection management', () => {
    const mockFileTree: FileItem[] = [
      {
        id: '/src',
        name: 'src',
        type: 'folder',
        path: '/project/src',
        children: [
          {
            id: '/src/file1.ts',
            name: 'file1.ts',
            type: 'file',
            path: '/project/src/file1.ts',
            lineCount: 50,
          },
          {
            id: '/src/file2.ts',
            name: 'file2.ts',
            type: 'file',
            path: '/project/src/file2.ts',
            lineCount: 30,
          },
        ],
      },
      {
        id: '/readme.md',
        name: 'readme.md',
        type: 'file',
        path: '/project/readme.md',
        lineCount: 20,
      },
    ];

    it('should toggle file selection correctly', () => {
      // Select a file
      useWorkbenchStore.getState().toggleFileSelection('/readme.md', false, mockFileTree);
      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/readme.md']);

      // Select another file (should be added to beginning)
      useWorkbenchStore.getState().toggleFileSelection('/src/file1.ts', false, mockFileTree);
      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/src/file1.ts', '/readme.md']);

      // Deselect first file
      useWorkbenchStore.getState().toggleFileSelection('/src/file1.ts', false, mockFileTree);
      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/readme.md']);
    });

    it('should select all descendants when selecting a folder', () => {
      const mockGetSelectableDescendants = getSelectableDescendants as jest.MockedFunction<typeof getSelectableDescendants>;
      mockGetSelectableDescendants.mockReturnValue(['/src/file1.ts', '/src/file2.ts']);

      // Select the folder
      useWorkbenchStore.getState().toggleFileSelection('/src', true, mockFileTree);

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/src/file1.ts', '/src/file2.ts']);
      expect(mockGetSelectableDescendants).toHaveBeenCalledWith(mockFileTree[0]);
    });

    it('should deselect all descendants when deselecting a folder with all children selected', () => {
      const mockGetSelectableDescendants = getSelectableDescendants as jest.MockedFunction<typeof getSelectableDescendants>;
      mockGetSelectableDescendants.mockReturnValue(['/src/file1.ts', '/src/file2.ts']);

      // Pre-select all files in the folder
      useWorkbenchStore.setState(state => ({
        tabs: state.tabs.map((t, i) => (i === 0 ? { ...t, selectedFiles: ['/src/file1.ts', '/src/file2.ts'] } : t)),
      }));

      // Deselect the folder
      useWorkbenchStore.getState().toggleFileSelection('/src', true, mockFileTree);

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual([]);
    });

    it('should select remaining descendants when selecting a folder with some children selected', () => {
      const mockGetSelectableDescendants = getSelectableDescendants as jest.MockedFunction<typeof getSelectableDescendants>;
      mockGetSelectableDescendants.mockReturnValue(['/src/file1.ts', '/src/file2.ts']);

      // Pre-select one file
      useWorkbenchStore.setState(state => ({
        tabs: state.tabs.map((t, i) => (i === 0 ? { ...t, selectedFiles: ['/src/file1.ts'] } : t)),
      }));

      // Select the folder
      useWorkbenchStore.getState().toggleFileSelection('/src', true, mockFileTree);

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/src/file2.ts', '/src/file1.ts']);
    });

    it('should handle folder selection when folder item is not found', () => {
      // Try to select a non-existent folder
      useWorkbenchStore.getState().toggleFileSelection('/nonexistent', true, mockFileTree);
      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/nonexistent']);

      // Try to deselect it
      useWorkbenchStore.getState().toggleFileSelection('/nonexistent', true, mockFileTree);
      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual([]);
    });

    it('should remove file from selection', () => {
      // Set up some selected files
      useWorkbenchStore.setState(state => ({
        tabs: state.tabs.map((t, i) => (i === 0 ? { ...t, selectedFiles: ['/src/file1.ts', '/readme.md', '/src/file2.ts'] } : t)),
      }));

      // Remove middle file
      useWorkbenchStore.getState().removeFileFromSelection('/readme.md');

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/src/file1.ts', '/src/file2.ts']);
    });

    it('should clear all file selections', () => {
      // Set up some selected files
      useWorkbenchStore.setState(state => ({
        tabs: state.tabs.map((t, i) => (i === 0 ? { ...t, selectedFiles: ['/src/file1.ts', '/readme.md', '/src/file2.ts'] } : t)),
      }));

      // Clear selection
      useWorkbenchStore.getState().clearFileSelection();

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual([]);
    });

    it('should reorder file selection', () => {
      // Set up some selected files
      useWorkbenchStore.setState(state => ({
        tabs: state.tabs.map((t, i) => (i === 0 ? { ...t, selectedFiles: ['/src/file1.ts', '/readme.md', '/src/file2.ts'] } : t)),
      }));

      // Move first item to last position
      useWorkbenchStore.getState().reorderFileSelection(0, 2);

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(['/readme.md', '/src/file2.ts', '/src/file1.ts']);
    });

    it('should not reorder when source and destination are the same', () => {
      const originalSelection = ['/src/file1.ts', '/readme.md', '/src/file2.ts'];
      useWorkbenchStore.setState(state => ({
        tabs: state.tabs.map((t, i) => (i === 0 ? { ...t, selectedFiles: [...originalSelection] } : t)),
      }));

      // Try to move item to same position
      useWorkbenchStore.getState().reorderFileSelection(1, 1);

      expect(useWorkbenchStore.getState().tabs[0].selectedFiles).toEqual(originalSelection);
    });
  });

  describe('prompt generation state', () => {
    it('should manage prompt generation state', () => {
      expect(useWorkbenchStore.getState().isGeneratingPrompt).toBe(false);

      useWorkbenchStore.getState().setIsGeneratingPrompt(true);
      expect(useWorkbenchStore.getState().isGeneratingPrompt).toBe(true);

      useWorkbenchStore.getState().resetGeneratingPrompt();
      expect(useWorkbenchStore.getState().isGeneratingPrompt).toBe(false);
    });

    it('should trigger developer action', () => {
      const initialTrigger = useWorkbenchStore.getState().developerActionTrigger;
      expect(useWorkbenchStore.getState().isGeneratingPrompt).toBe(false);

      useWorkbenchStore.getState().triggerDeveloperAction();

      expect(useWorkbenchStore.getState().developerActionTrigger).toBe(initialTrigger + 1);
      expect(useWorkbenchStore.getState().isGeneratingPrompt).toBe(true);
    });
  });
});
