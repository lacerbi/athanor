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
    // Reset store state before each test
    useWorkbenchStore.getState().tabs.splice(0);
    useWorkbenchStore.getState().tabs.push({
      id: 'tab-1',
      name: 'Task 1',
      content: '',
      output: 'Welcome to Athanor! ⚗️\n\nI\'m here to increase your productivity with AI assistants.\nTo get started:\n\n1. Write your task or question in the text area to the left\n2. Select relevant files from the file explorer\n3. Click one of the prompt generation buttons\n4. Paste the prompt into a AI assistant\n5. Copy the AI response to the clipboard\n6. Apply the AI Output above!\n\nLet\'s build something great together!',
      context: '',
      selectedFiles: [],
    });
    useWorkbenchStore.setState({ activeTabIndex: 0 });
    jest.clearAllMocks();
  });

  describe('tab management', () => {
    it('should create a new tab with inherited selection', () => {
      const store = useWorkbenchStore.getState();
      
      // Set some selected files in the current tab
      store.setTabContent(0, 'test content');
      store.tabs[0].selectedFiles = ['file1.ts', 'file2.ts'];
      
      // Create a new tab
      store.createTab();
      
      const tabs = useWorkbenchStore.getState().tabs;
      expect(tabs).toHaveLength(2);
      expect(tabs[1].name).toBe('Task 2');
      expect(tabs[1].selectedFiles).toEqual(['file1.ts', 'file2.ts']);
      expect(useWorkbenchStore.getState().activeTabIndex).toBe(1);
    });

    it('should remove tab and adjust active index', () => {
      const store = useWorkbenchStore.getState();
      
      // Create additional tabs
      store.createTab();
      store.createTab();
      
      expect(store.tabs).toHaveLength(3);
      expect(store.activeTabIndex).toBe(2);
      
      // Remove middle tab
      store.removeTab(1);
      
      const updatedStore = useWorkbenchStore.getState();
      expect(updatedStore.tabs).toHaveLength(2);
      expect(updatedStore.activeTabIndex).toBe(1);
    });

    it('should create new Task 1 when removing last tab', () => {
      const store = useWorkbenchStore.getState();
      
      // Remove the only tab
      store.removeTab(0);
      
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
      const store = useWorkbenchStore.getState();
      
      // Select a file
      store.toggleFileSelection('/readme.md', false, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/readme.md']);
      
      // Select another file (should be added to beginning)
      store.toggleFileSelection('/src/file1.ts', false, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/src/file1.ts', '/readme.md']);
      
      // Deselect first file
      store.toggleFileSelection('/src/file1.ts', false, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/readme.md']);
    });

    it('should select all descendants when selecting a folder', () => {
      const mockGetSelectableDescendants = getSelectableDescendants as jest.MockedFunction<typeof getSelectableDescendants>;
      mockGetSelectableDescendants.mockReturnValue(['/src/file1.ts', '/src/file2.ts']);
      
      const store = useWorkbenchStore.getState();
      
      // Select the folder
      store.toggleFileSelection('/src', true, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/src/file1.ts', '/src/file2.ts']);
      expect(mockGetSelectableDescendants).toHaveBeenCalledWith(mockFileTree[0]);
    });

    it('should deselect all descendants when deselecting a folder with all children selected', () => {
      const mockGetSelectableDescendants = getSelectableDescendants as jest.MockedFunction<typeof getSelectableDescendants>;
      mockGetSelectableDescendants.mockReturnValue(['/src/file1.ts', '/src/file2.ts']);
      
      const store = useWorkbenchStore.getState();
      
      // Pre-select all files in the folder
      store.tabs[0].selectedFiles = ['/src/file1.ts', '/src/file2.ts'];
      
      // Deselect the folder
      store.toggleFileSelection('/src', true, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual([]);
    });

    it('should select remaining descendants when selecting a folder with some children selected', () => {
      const mockGetSelectableDescendants = getSelectableDescendants as jest.MockedFunction<typeof getSelectableDescendants>;
      mockGetSelectableDescendants.mockReturnValue(['/src/file1.ts', '/src/file2.ts']);
      
      const store = useWorkbenchStore.getState();
      
      // Pre-select one file
      store.tabs[0].selectedFiles = ['/src/file1.ts'];
      
      // Select the folder
      store.toggleFileSelection('/src', true, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/src/file2.ts', '/src/file1.ts']);
    });

    it('should handle folder selection when folder item is not found', () => {
      const store = useWorkbenchStore.getState();
      
      // Try to select a non-existent folder
      store.toggleFileSelection('/nonexistent', true, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/nonexistent']);
      
      // Try to deselect it
      store.tabs[0].selectedFiles = ['/nonexistent'];
      store.toggleFileSelection('/nonexistent', true, mockFileTree);
      
      expect(store.tabs[0].selectedFiles).toEqual([]);
    });

    it('should remove file from selection', () => {
      const store = useWorkbenchStore.getState();
      
      // Set up some selected files
      store.tabs[0].selectedFiles = ['/src/file1.ts', '/readme.md', '/src/file2.ts'];
      
      // Remove middle file
      store.removeFileFromSelection('/readme.md');
      
      expect(store.tabs[0].selectedFiles).toEqual(['/src/file1.ts', '/src/file2.ts']);
    });

    it('should clear all file selections', () => {
      const store = useWorkbenchStore.getState();
      
      // Set up some selected files
      store.tabs[0].selectedFiles = ['/src/file1.ts', '/readme.md', '/src/file2.ts'];
      
      // Clear selection
      store.clearFileSelection();
      
      expect(store.tabs[0].selectedFiles).toEqual([]);
    });

    it('should reorder file selection', () => {
      const store = useWorkbenchStore.getState();
      
      // Set up some selected files
      store.tabs[0].selectedFiles = ['/src/file1.ts', '/readme.md', '/src/file2.ts'];
      
      // Move first item to last position
      store.reorderFileSelection(0, 2);
      
      expect(store.tabs[0].selectedFiles).toEqual(['/readme.md', '/src/file2.ts', '/src/file1.ts']);
    });

    it('should not reorder when source and destination are the same', () => {
      const store = useWorkbenchStore.getState();
      
      // Set up some selected files
      const originalSelection = ['/src/file1.ts', '/readme.md', '/src/file2.ts'];
      store.tabs[0].selectedFiles = [...originalSelection];
      
      // Try to move item to same position
      store.reorderFileSelection(1, 1);
      
      expect(store.tabs[0].selectedFiles).toEqual(originalSelection);
    });
  });

  describe('legacy compatibility', () => {
    it('should provide legacy getters for active tab content', () => {
      const store = useWorkbenchStore.getState();
      
      store.setTabContent(0, 'test task');
      store.setTabOutput(0, 'test output');
      store.setTabContext(0, 'test context');
      
      expect(store.taskDescription).toBe('test task');
      expect(store.outputContent).toBe('test output');
      expect(store.taskContext).toBe('test context');
    });

    it('should provide legacy setters that update active tab', () => {
      const store = useWorkbenchStore.getState();
      
      store.setTaskDescription('legacy task');
      store.setOutputContent('legacy output');
      store.setTaskContext('legacy context');
      
      expect(store.tabs[0].content).toBe('legacy task');
      expect(store.tabs[0].output).toBe('legacy output');
      expect(store.tabs[0].context).toBe('legacy context');
    });
  });

  describe('prompt generation state', () => {
    it('should manage prompt generation state', () => {
      const store = useWorkbenchStore.getState();
      
      expect(store.isGeneratingPrompt).toBe(false);
      
      store.setIsGeneratingPrompt(true);
      expect(store.isGeneratingPrompt).toBe(true);
      
      store.resetGeneratingPrompt();
      expect(store.isGeneratingPrompt).toBe(false);
    });

    it('should trigger developer action', () => {
      const store = useWorkbenchStore.getState();
      
      const initialTrigger = store.developerActionTrigger;
      expect(store.isGeneratingPrompt).toBe(false);
      
      store.triggerDeveloperAction();
      
      expect(store.developerActionTrigger).toBe(initialTrigger + 1);
      expect(store.isGeneratingPrompt).toBe(true);
    });
  });
});
