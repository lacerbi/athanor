// AI Summary: Comprehensive unit tests for buildTaskAction covering successful execution, guard clauses,
// error handling, and state management. Tests include proper mocking of dependencies and validation of side effects.
import { buildTaskAction, BuildTaskActionParams } from './buildTaskAction';
import { FileItem } from '../utils/fileTree';
import { TaskData } from '../types/taskTypes';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { buildDynamicPrompt } from '../utils/buildPrompt';
import { useContextStore } from '../stores/contextStore';

// Mock the workbench store
jest.mock('../stores/workbenchStore', () => ({
  useWorkbenchStore: {
    getState: jest.fn(),
  },
}));

// Mock the context store
jest.mock('../stores/contextStore', () => ({
  useContextStore: {
    getState: jest.fn(),
  },
}));

// Mock the buildPrompt utility
jest.mock('../utils/buildPrompt', () => ({
  buildDynamicPrompt: jest.fn(),
}));

// Mock console methods to avoid noise in test output
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock window.fileSystem.getCurrentDirectory
const mockGetCurrentDirectory = jest.fn();
Object.defineProperty(global, 'window', {
  value: {
    fileSystem: {
      getCurrentDirectory: mockGetCurrentDirectory,
    },
  },
  writable: true,
});

describe('buildTaskAction', () => {
  let mockSetIsGeneratingPrompt: jest.Mock;
  let mockResetGeneratingPrompt: jest.Mock;
  let mockSetTabContent: jest.Mock;
  let mockAddLog: jest.Mock;
  let mockSetIsLoading: jest.Mock;
  let mockBuildDynamicPrompt: jest.Mock;
  let mockGetState: jest.Mock;
  let mockGetContextState: jest.Mock;

  let defaultTask: TaskData;
  let defaultRootItems: FileItem[];
  let defaultSelectedItems: Set<string>;
  let defaultParams: BuildTaskActionParams;

  beforeEach(() => {
    // Initialize all mock functions
    mockSetIsGeneratingPrompt = jest.fn();
    mockResetGeneratingPrompt = jest.fn();
    mockSetTabContent = jest.fn();
    mockAddLog = jest.fn();
    mockSetIsLoading = jest.fn();

    // Mock workbench store
    mockGetState = useWorkbenchStore.getState as jest.Mock;
    mockGetState.mockReturnValue({
      tabs: [
        {
          id: 'tab-1',
          name: 'Task 1',
          content: 'existing task description',
          output: '',
          context: 'existing context',
          selectedFiles: [],
        },
      ],
      activeTabIndex: 0,
      setIsGeneratingPrompt: mockSetIsGeneratingPrompt,
      resetGeneratingPrompt: mockResetGeneratingPrompt,
      setTabContent: mockSetTabContent,
    });

    // Mock context store
    mockGetContextState = useContextStore.getState as jest.Mock;
    mockGetContextState.mockReturnValue({
      promptNeighborPaths: new Set<string>(),
    });

    // Mock buildDynamicPrompt
    mockBuildDynamicPrompt = buildDynamicPrompt as jest.Mock;
    mockBuildDynamicPrompt.mockResolvedValue('processed prompt content');

    // Mock getCurrentDirectory
    mockGetCurrentDirectory.mockResolvedValue('/fake/project/dir');

    // Set up default test data
    defaultTask = {
      id: 'test-task',
      label: 'Test Task',
      order: 1,
      variants: [
        {
          id: 'default',
          label: 'Default',
          content: 'Task template content',
        },
      ],
    };

    defaultRootItems = [
      {
        id: '/src/file1.ts',
        name: 'file1.ts',
        type: 'file',
        path: '/src/file1.ts',
        lineCount: 50,
      },
      {
        id: '/src/utils',
        name: 'utils',
        type: 'folder',
        path: '/src/utils',
        children: [
          {
            id: '/src/utils/helper.ts',
            name: 'helper.ts',
            type: 'file',
            path: '/src/utils/helper.ts',
            lineCount: 25,
          },
        ],
      },
    ];

    defaultSelectedItems = new Set(['/src/file1.ts', '/src/utils/helper.ts']);

    defaultParams = {
      task: defaultTask,
      rootItems: defaultRootItems,
      selectedItems: defaultSelectedItems,
      addLog: mockAddLog,
      setIsLoading: mockSetIsLoading,
      currentThresholdLineLength: 200,
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('guard clauses', () => {
    it('should handle empty rootItems array', async () => {
      const params = { ...defaultParams, rootItems: [] };

      await buildTaskAction(params);

      expect(consoleWarnSpy).toHaveBeenCalledWith('No file tree data available');
      expect(mockSetIsLoading).not.toHaveBeenCalled();
      expect(mockSetIsGeneratingPrompt).not.toHaveBeenCalled();
      expect(mockBuildDynamicPrompt).not.toHaveBeenCalled();
    });

    it('should handle task requiring selection with no selected items', async () => {
      const taskWithRequirement = {
        ...defaultTask,
        requires: 'selected' as const,
      };
      const params = {
        ...defaultParams,
        task: taskWithRequirement,
        selectedItems: new Set<string>(),
      };

      await buildTaskAction(params);

      expect(consoleWarnSpy).toHaveBeenCalledWith('No files selected');
      expect(mockSetIsLoading).not.toHaveBeenCalled();
      expect(mockSetIsGeneratingPrompt).not.toHaveBeenCalled();
      expect(mockBuildDynamicPrompt).not.toHaveBeenCalled();
    });

    it('should proceed when task requires selection and items are selected', async () => {
      const taskWithRequirement = {
        ...defaultTask,
        requires: 'selected' as const,
      };
      const params = {
        ...defaultParams,
        task: taskWithRequirement,
      };

      await buildTaskAction(params);

      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockSetIsGeneratingPrompt).toHaveBeenCalledWith(true);
      expect(mockBuildDynamicPrompt).toHaveBeenCalled();
    });

    it('should proceed when task does not require selection regardless of selected items', async () => {
      const params = {
        ...defaultParams,
        selectedItems: new Set<string>(),
      };

      await buildTaskAction(params);

      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockSetIsGeneratingPrompt).toHaveBeenCalledWith(true);
      expect(mockBuildDynamicPrompt).toHaveBeenCalled();
    });
  });

  describe('successful execution', () => {
    it('should execute successful prompt generation flow', async () => {
      const mockProcessedPrompt = 'Successfully processed task prompt';
      mockBuildDynamicPrompt.mockResolvedValue(mockProcessedPrompt);

      await buildTaskAction(defaultParams);

      // Verify loading states are set correctly
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockSetIsGeneratingPrompt).toHaveBeenCalledWith(true);

      // Verify current directory is fetched
      expect(mockGetCurrentDirectory).toHaveBeenCalledTimes(1);

      // Verify buildDynamicPrompt is called with correct parameters
      expect(mockBuildDynamicPrompt).toHaveBeenCalledWith(
        defaultTask,
        defaultTask.variants[0], // default variant
        defaultRootItems,
        Array.from(defaultSelectedItems),
        [], // neighboringFiles
        '/fake/project/dir',
        'existing task description',
        'existing context',
        undefined, // passedFormatTypeOverride
        undefined, // smartPreviewConfigInput
        200 // currentThresholdLineLength
      );

      // Verify task description is updated
      expect(mockSetTabContent).toHaveBeenCalledWith(0, mockProcessedPrompt);

      // Verify success log
      expect(mockAddLog).toHaveBeenCalledWith('Test Task task prompt loaded and processed');

      // Verify loading states are reset in finally block
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(mockSetIsGeneratingPrompt).toHaveBeenCalledWith(false);
      expect(mockResetGeneratingPrompt).not.toHaveBeenCalled();
    });

    it('should handle task with different label correctly', async () => {
      const customTask = {
        ...defaultTask,
        label: 'Custom Refactor Task',
      };
      const params = { ...defaultParams, task: customTask };

      await buildTaskAction(params);

      expect(mockAddLog).toHaveBeenCalledWith('Custom Refactor Task task prompt loaded and processed');
    });

    it('should pass currentThresholdLineLength parameter correctly', async () => {
      const params = { ...defaultParams, currentThresholdLineLength: 150 };

      await buildTaskAction(params);

      expect(mockBuildDynamicPrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.any(Array),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        undefined,
        150 // should use the passed value
      );
    });
  });

  describe('error handling', () => {
    it('should handle task with no variants', async () => {
      const taskWithNoVariants = {
        ...defaultTask,
        variants: [],
      };
      const params = { ...defaultParams, task: taskWithNoVariants };

      await buildTaskAction(params);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing Test Task task:',
        expect.any(Error)
      );
      expect(mockAddLog).toHaveBeenCalledWith('Failed to process Test Task task');
      expect(mockResetGeneratingPrompt).toHaveBeenCalledTimes(1);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('should handle getCurrentDirectory failure', async () => {
      const directoryError = new Error('Failed to get current directory');
      mockGetCurrentDirectory.mockRejectedValue(directoryError);

      await buildTaskAction(defaultParams);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing Test Task task:',
        directoryError
      );
      expect(mockAddLog).toHaveBeenCalledWith('Failed to process Test Task task');
      expect(mockResetGeneratingPrompt).toHaveBeenCalledTimes(1);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('should handle buildDynamicPrompt failure', async () => {
      const promptError = new Error('Failed to build prompt');
      mockBuildDynamicPrompt.mockRejectedValue(promptError);

      await buildTaskAction(defaultParams);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing Test Task task:',
        promptError
      );
      expect(mockAddLog).toHaveBeenCalledWith('Failed to process Test Task task');
      expect(mockResetGeneratingPrompt).toHaveBeenCalledTimes(1);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('should ensure state is reset even when multiple errors occur', async () => {
      const taskWithNoVariants = {
        ...defaultTask,
        variants: [],
      };
      const params = { ...defaultParams, task: taskWithNoVariants };

      // Make setTabContent also throw to test multiple error conditions
      mockSetTabContent.mockImplementation(() => {
        throw new Error('State update failed');
      });

      await buildTaskAction(params);

      // Should still reset loading states despite multiple errors
      expect(mockResetGeneratingPrompt).toHaveBeenCalledTimes(1);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('state management', () => {
    it('should call loading states in correct sequence for successful execution', async () => {
      await buildTaskAction(defaultParams);

      // Verify call order
      const setIsLoadingCalls = mockSetIsLoading.mock.calls;
      const setIsGeneratingPromptCalls = mockSetIsGeneratingPrompt.mock.calls;

      expect(setIsLoadingCalls).toEqual([[true], [false]]);
      expect(setIsGeneratingPromptCalls).toEqual([[true], [false]]);
      expect(mockResetGeneratingPrompt).not.toHaveBeenCalled();
    });

    it('should reset loading states in finally block even on error', async () => {
      mockBuildDynamicPrompt.mockRejectedValue(new Error('Test error'));

      await buildTaskAction(defaultParams);

      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockSetIsGeneratingPrompt).toHaveBeenCalledWith(true);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(mockSetIsGeneratingPrompt).toHaveBeenCalledWith(false);
      expect(mockResetGeneratingPrompt).toHaveBeenCalledTimes(1);
    });

    it('should access workbench store state correctly', async () => {
      await buildTaskAction(defaultParams);

      expect(mockGetState).toHaveBeenCalled();
      expect(mockBuildDynamicPrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.any(Array),
        expect.anything(),
        'existing task description', // from mocked store state
        'existing context', // from mocked store state
        undefined,
        undefined,
        expect.anything()
      );
    });
  });

  describe('function parameters', () => {
    it('should handle different task configurations', async () => {
      const complexTask: TaskData = {
        id: 'complex-task',
        label: 'Complex Task',
        icon: 'gear',
        tooltip: 'A complex task for testing',
        order: 5,
        requires: 'selected',
        variants: [
          {
            id: 'variant1',
            label: 'Variant One',
            tooltip: 'First variant',
            content: 'First variant content',
          },
          {
            id: 'variant2',
            label: 'Variant Two',
            content: 'Second variant content',
          },
        ],
      };

      const params = { ...defaultParams, task: complexTask };

      await buildTaskAction(params);

      expect(mockBuildDynamicPrompt).toHaveBeenCalledWith(
        complexTask,
        complexTask.variants[0], // Should use first variant as default
        expect.anything(),
        expect.anything(),
        expect.any(Array),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        undefined,
        expect.anything()
      );
    });

    it('should handle complex file tree structures', async () => {
      const complexRootItems: FileItem[] = [
        {
          id: '/src',
          name: 'src',
          type: 'folder',
          path: '/src',
          children: [
            {
              id: '/src/components',
              name: 'components',
              type: 'folder',
              path: '/src/components',
              children: [
                {
                  id: '/src/components/Button.tsx',
                  name: 'Button.tsx',
                  type: 'file',
                  path: '/src/components/Button.tsx',
                  lineCount: 100,
                },
              ],
            },
          ],
        },
      ];

      const params = {
        ...defaultParams,
        rootItems: complexRootItems,
        selectedItems: new Set(['/src/components/Button.tsx']),
      };

      await buildTaskAction(params);

      expect(mockBuildDynamicPrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        complexRootItems,
        Array.from(new Set(['/src/components/Button.tsx'])),
        expect.any(Array),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        undefined,
        expect.anything()
      );
    });

    it('should handle empty selectedItems set', async () => {
      const params = {
        ...defaultParams,
        selectedItems: new Set<string>(),
      };

      await buildTaskAction(params);

      expect(mockBuildDynamicPrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        Array.from(new Set<string>()),
        expect.any(Array),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        undefined,
        expect.anything()
      );
    });
  });
});
