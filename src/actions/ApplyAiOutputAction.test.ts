/**
 * @jest-environment jsdom
 */
// AI Summary: Comprehensive unit tests for ApplyAiOutputAction covering both processAiResponseContent and applyAiOutput functions.
// Tests include command parsing, execution scenarios, error handling, and clipboard operations with proper mocking.
import { processAiResponseContent, applyAiOutput } from './ApplyAiOutputAction';
import * as commands from '../commands';
import { useApplyChangesStore } from '../stores/applyChangesStore';
import { FileOperation } from '../types/global';

// Mock the commands module
jest.mock('../commands', () => ({
  parseCommand: jest.fn(),
  executeSelectCommand: jest.fn(),
  executeTaskCommand: jest.fn(),
  executeApplyChangesCommand: jest.fn(),
  COMMAND_TYPES: {
    SELECT: 'select',
    TASK: 'task',
    APPLY_CHANGES: 'apply changes',
  },
}));

// Mock the applyChangesStore
jest.mock('../stores/applyChangesStore', () => ({
  useApplyChangesStore: {
    getState: jest.fn(),
  },
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    readText: jest.fn(),
  },
  writable: true,
});

// Mock console.error to avoid noise in test output
const consoleErrorSpy = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {});

describe('ApplyAiOutputAction', () => {
  let mockAddLog: jest.Mock;
  let mockSetOperations: jest.Mock;
  let mockClearOperations: jest.Mock;
  let mockSetActiveTab: jest.Mock;
  let mockParams: {
    addLog: jest.Mock;
    setOperations: jest.Mock;
    clearOperations: jest.Mock;
    setActiveTab?: jest.Mock;
  };

  beforeEach(() => {
    mockAddLog = jest.fn();
    mockSetOperations = jest.fn();
    mockClearOperations = jest.fn();
    mockSetActiveTab = jest.fn();
    mockParams = {
      addLog: mockAddLog,
      setOperations: mockSetOperations,
      clearOperations: mockClearOperations,
      setActiveTab: mockSetActiveTab,
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Set default mock return values
    (commands.executeSelectCommand as jest.Mock).mockResolvedValue(true);
    (commands.executeTaskCommand as jest.Mock).mockResolvedValue(true);
    (commands.executeApplyChangesCommand as jest.Mock).mockResolvedValue(true);
    (useApplyChangesStore.getState as jest.Mock).mockReturnValue({
      diffMode: 'strict',
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('processAiResponseContent', () => {
    it('should log message when no valid commands are found', async () => {
      (commands.parseCommand as jest.Mock).mockReturnValue(null);

      await processAiResponseContent('some content', mockParams);

      expect(mockAddLog).toHaveBeenCalledWith(
        'No valid commands found in AI response'
      );
      expect(commands.executeSelectCommand).not.toHaveBeenCalled();
      expect(commands.executeTaskCommand).not.toHaveBeenCalled();
      expect(commands.executeApplyChangesCommand).not.toHaveBeenCalled();
    });

    it('should handle empty commands array', async () => {
      (commands.parseCommand as jest.Mock).mockReturnValue([]);

      await processAiResponseContent('some content', mockParams);

      expect(mockAddLog).toHaveBeenCalledWith(
        'No valid commands found in AI response'
      );
    });

    it('should execute SELECT command successfully', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.SELECT,
        content: 'file1.ts file2.ts',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeSelectCommand as jest.Mock).mockResolvedValue(true);

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeSelectCommand).toHaveBeenCalledWith({
        content: 'file1.ts file2.ts',
        addLog: mockAddLog,
      });
      expect(mockAddLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute')
      );
    });

    it('should handle SELECT command failure', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.SELECT,
        content: 'file1.ts',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeSelectCommand as jest.Mock).mockResolvedValue(false);

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeSelectCommand).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(
        'Failed to execute select command'
      );
    });

    it('should execute TASK command successfully', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.TASK,
        content: 'Update the documentation',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeTaskCommand as jest.Mock).mockResolvedValue(true);

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeTaskCommand).toHaveBeenCalledWith({
        content: 'Update the documentation',
        addLog: mockAddLog,
      });
      expect(mockAddLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute')
      );
    });

    it('should handle TASK command failure', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.TASK,
        content: 'task content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeTaskCommand as jest.Mock).mockResolvedValue(false);

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeTaskCommand).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith('Failed to execute task command');
    });

    it('should execute APPLY_CHANGES command successfully with diffMode', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.APPLY_CHANGES,
        content: 'file content',
        fullContent: 'full xml content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeApplyChangesCommand as jest.Mock).mockResolvedValue(
        true
      );
      (useApplyChangesStore.getState as jest.Mock).mockReturnValue({
        diffMode: 'fuzzy',
      });

      await processAiResponseContent('ai content', mockParams);

      expect(useApplyChangesStore.getState).toHaveBeenCalled();
      expect(commands.executeApplyChangesCommand).toHaveBeenCalledWith({
        content: 'file content',
        fullContent: 'full xml content',
        addLog: mockAddLog,
        setOperations: mockSetOperations,
        clearOperations: mockClearOperations,
        setActiveTab: mockSetActiveTab,
        diffMode: 'fuzzy',
      });
      expect(mockAddLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute')
      );
    });

    it('should handle APPLY_CHANGES command failure', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.APPLY_CHANGES,
        content: 'content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeApplyChangesCommand as jest.Mock).mockResolvedValue(
        false
      );

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeApplyChangesCommand).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(
        'Failed to execute apply changes command'
      );
    });

    it('should handle unknown command type', async () => {
      const mockCommand = {
        type: 'UNKNOWN_COMMAND',
        content: 'some content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);

      await processAiResponseContent('ai content', mockParams);

      expect(mockAddLog).toHaveBeenCalledWith(
        'Unknown command type: UNKNOWN_COMMAND'
      );
      expect(commands.executeSelectCommand).not.toHaveBeenCalled();
      expect(commands.executeTaskCommand).not.toHaveBeenCalled();
      expect(commands.executeApplyChangesCommand).not.toHaveBeenCalled();
    });

    it('should process multiple commands sequentially', async () => {
      const mockCommands = [
        { type: commands.COMMAND_TYPES.SELECT, content: 'select content' },
        { type: commands.COMMAND_TYPES.TASK, content: 'task content' },
        {
          type: commands.COMMAND_TYPES.APPLY_CHANGES,
          content: 'apply content',
          fullContent: 'full content',
        },
      ];
      (commands.parseCommand as jest.Mock).mockReturnValue(mockCommands);

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeSelectCommand).toHaveBeenCalledWith({
        content: 'select content',
        addLog: mockAddLog,
      });
      expect(commands.executeTaskCommand).toHaveBeenCalledWith({
        content: 'task content',
        addLog: mockAddLog,
      });
      expect(commands.executeApplyChangesCommand).toHaveBeenCalledWith({
        content: 'apply content',
        fullContent: 'full content',
        addLog: mockAddLog,
        setOperations: mockSetOperations,
        clearOperations: mockClearOperations,
        setActiveTab: mockSetActiveTab,
        diffMode: 'strict',
      });
    });

    it('should handle mixed success and failure commands', async () => {
      const mockCommands = [
        { type: commands.COMMAND_TYPES.SELECT, content: 'select content' },
        { type: commands.COMMAND_TYPES.TASK, content: 'task content' },
      ];
      (commands.parseCommand as jest.Mock).mockReturnValue(mockCommands);
      (commands.executeSelectCommand as jest.Mock).mockResolvedValue(true);
      (commands.executeTaskCommand as jest.Mock).mockResolvedValue(false);

      await processAiResponseContent('ai content', mockParams);

      expect(commands.executeSelectCommand).toHaveBeenCalled();
      expect(commands.executeTaskCommand).toHaveBeenCalled();
      expect(mockAddLog).not.toHaveBeenCalledWith(
        'Failed to execute select command'
      );
      expect(mockAddLog).toHaveBeenCalledWith('Failed to execute task command');
    });

    it('should handle error during command parsing', async () => {
      const parseError = new Error('Parse error');
      (commands.parseCommand as jest.Mock).mockImplementation(() => {
        throw parseError;
      });

      await processAiResponseContent('ai content', mockParams);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to process AI content:',
        parseError
      );
      expect(mockAddLog).toHaveBeenCalledWith(
        'Failed to process AI content: Parse error'
      );
    });

    it('should handle error thrown by command execution', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.SELECT,
        content: 'select content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      const executionError = new Error('Execution error');
      (commands.executeSelectCommand as jest.Mock).mockImplementation(() => {
        throw executionError;
      });

      await processAiResponseContent('ai content', mockParams);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to process AI content:',
        executionError
      );
      expect(mockAddLog).toHaveBeenCalledWith(
        'Failed to process AI content: Execution error'
      );
    });

    it('should handle params without setActiveTab', async () => {
      const paramsWithoutSetActiveTab = {
        addLog: mockAddLog,
        setOperations: mockSetOperations,
        clearOperations: mockClearOperations,
      };
      const mockCommand = {
        type: commands.COMMAND_TYPES.APPLY_CHANGES,
        content: 'content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);

      await processAiResponseContent('ai content', paramsWithoutSetActiveTab);

      expect(commands.executeApplyChangesCommand).toHaveBeenCalledWith({
        content: 'content',
        fullContent: undefined,
        addLog: mockAddLog,
        setOperations: mockSetOperations,
        clearOperations: mockClearOperations,
        setActiveTab: undefined,
        diffMode: 'strict',
      });
    });

    it('should handle non-Error objects thrown during execution', async () => {
      const mockCommand = {
        type: commands.COMMAND_TYPES.SELECT,
        content: 'select content',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);
      (commands.executeSelectCommand as jest.Mock).mockImplementation(() => {
        throw 'String error';
      });

      await processAiResponseContent('ai content', mockParams);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to process AI content:',
        'String error'
      );
      expect(mockAddLog).toHaveBeenCalledWith(
        'Failed to process AI content: String error'
      );
    });
  });

  describe('applyAiOutput', () => {
    it('should read clipboard content and process it', async () => {
      const clipboardContent = '<ath command="select">file1.ts</ath>';
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        clipboardContent
      );
      const mockCommand = {
        type: commands.COMMAND_TYPES.SELECT,
        content: 'file1.ts',
      };
      (commands.parseCommand as jest.Mock).mockReturnValue([mockCommand]);

      await applyAiOutput(mockParams);

      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(commands.parseCommand).toHaveBeenCalledWith(clipboardContent);
      expect(commands.executeSelectCommand).toHaveBeenCalledWith({
        content: 'file1.ts',
        addLog: mockAddLog,
      });
    });

    it('should handle clipboard read failure', async () => {
      const clipboardError = new Error('Clipboard access denied');
      (navigator.clipboard.readText as jest.Mock).mockRejectedValue(
        clipboardError
      );

      await applyAiOutput(mockParams);

      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to read clipboard:',
        clipboardError
      );
      expect(mockAddLog).toHaveBeenCalledWith(
        'Failed to read clipboard content'
      );
      expect(commands.parseCommand).not.toHaveBeenCalled();
    });

    it('should pass through all params to processAiResponseContent', async () => {
      const clipboardContent = 'clipboard content';
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        clipboardContent
      );
      (commands.parseCommand as jest.Mock).mockReturnValue(null); // No commands to keep test simple

      await applyAiOutput(mockParams);

      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(commands.parseCommand).toHaveBeenCalledWith(clipboardContent);
      expect(mockAddLog).toHaveBeenCalledWith(
        'No valid commands found in AI response'
      );
    });

    it('should handle complex AI content from clipboard', async () => {
      const complexContent = `
        <ath command="select">file1.ts file2.ts</ath>
        <ath command="task">Refactor these files</ath>
        <ath command="apply changes">
          <file>...</file>
        </ath>
      `;
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        complexContent
      );
      const mockCommands = [
        { type: commands.COMMAND_TYPES.SELECT, content: 'file1.ts file2.ts' },
        { type: commands.COMMAND_TYPES.TASK, content: 'Refactor these files' },
        { type: commands.COMMAND_TYPES.APPLY_CHANGES, content: 'file content' },
      ];
      (commands.parseCommand as jest.Mock).mockReturnValue(mockCommands);

      await applyAiOutput(mockParams);

      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(commands.parseCommand).toHaveBeenCalledWith(complexContent);
      expect(commands.executeSelectCommand).toHaveBeenCalled();
      expect(commands.executeTaskCommand).toHaveBeenCalled();
      expect(commands.executeApplyChangesCommand).toHaveBeenCalled();
    });
  });
});
