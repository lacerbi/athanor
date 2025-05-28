// AI Summary: Comprehensive unit tests for tooltip generation functions in descriptions.ts.
// Tests cover enabled/disabled states, various disable reasons, and edge cases for both task and action tooltips.
import { getTaskTooltip, getActionTooltip } from './descriptions';
import { ActionState } from './types';
import { TaskData } from '../types/taskTypes';

describe('getTaskTooltip', () => {
  const taskWithTooltip: TaskData = {
    id: 'test-task-1',
    label: 'Test Task',
    tooltip: 'Custom tooltip for test task',
    order: 1,
    variants: []
  };

  const taskWithoutTooltip: TaskData = {
    id: 'test-task-2',
    label: 'Another Task',
    order: 2,
    variants: []
  };

  describe('when not disabled', () => {
    it('should return task.tooltip when not disabled and tooltip exists', () => {
      const result = getTaskTooltip(taskWithTooltip, false, null);
      expect(result).toBe('Custom tooltip for test task');
    });

    it('should return task.label when not disabled and tooltip does not exist', () => {
      const result = getTaskTooltip(taskWithoutTooltip, false, null);
      expect(result).toBe('Another Task');
    });

    it('should return task.tooltip when not disabled with tooltip and reason is provided', () => {
      const result = getTaskTooltip(taskWithTooltip, false, 'loading');
      expect(result).toBe('Custom tooltip for test task');
    });

    it('should return task.label when not disabled without tooltip and reason is provided', () => {
      const result = getTaskTooltip(taskWithoutTooltip, false, 'noTask');
      expect(result).toBe('Another Task');
    });
  });

  describe('when disabled', () => {
    it('should return loading message when disabled with reason "loading"', () => {
      const result = getTaskTooltip(taskWithTooltip, true, 'loading');
      expect(result).toBe('Please wait while the current operation completes');
    });

    it('should return no task message when disabled with reason "noTask"', () => {
      const result = getTaskTooltip(taskWithTooltip, true, 'noTask');
      expect(result).toBe('Test Task - Enter a task description to enable');
    });

    it('should return no selection message when disabled with reason "noSelection"', () => {
      const result = getTaskTooltip(taskWithTooltip, true, 'noSelection');
      expect(result).toBe('Test Task - Select one or more files to enable');
    });

    it('should return default message when disabled with null reason', () => {
      const result = getTaskTooltip(taskWithTooltip, true, null);
      expect(result).toBe('Action currently unavailable');
    });

    it('should return default message when disabled with unknown reason', () => {
      const result = getTaskTooltip(taskWithTooltip, true, 'unknownReason' as ActionState);
      expect(result).toBe('Action currently unavailable');
    });

    it('should handle task without tooltip when disabled with noTask reason', () => {
      const result = getTaskTooltip(taskWithoutTooltip, true, 'noTask');
      expect(result).toBe('Another Task - Enter a task description to enable');
    });

    it('should handle task without tooltip when disabled with noSelection reason', () => {
      const result = getTaskTooltip(taskWithoutTooltip, true, 'noSelection');
      expect(result).toBe('Another Task - Select one or more files to enable');
    });
  });
});

describe('getActionTooltip', () => {
  const actionName = 'Generate Prompt';

  describe('when not disabled', () => {
    it('should return the action name when not disabled', () => {
      const result = getActionTooltip(actionName, false, null);
      expect(result).toBe('Generate Prompt');
    });

    it('should return the action name when not disabled with reason provided', () => {
      const result = getActionTooltip(actionName, false, 'loading');
      expect(result).toBe('Generate Prompt');
    });
  });

  describe('when disabled', () => {
    it('should return loading message when disabled with reason "loading"', () => {
      const result = getActionTooltip(actionName, true, 'loading');
      expect(result).toBe('Please wait while the current operation completes');
    });

    it('should return no task message when disabled with reason "noTask"', () => {
      const result = getActionTooltip(actionName, true, 'noTask');
      expect(result).toBe('Generate Prompt - Enter a task description to enable');
    });

    it('should return no selection message when disabled with reason "noSelection"', () => {
      const result = getActionTooltip(actionName, true, 'noSelection');
      expect(result).toBe('Generate Prompt - Select one or more files to enable');
    });

    it('should return default message when disabled with null reason', () => {
      const result = getActionTooltip(actionName, true, null);
      expect(result).toBe('Action currently unavailable');
    });

    it('should return default message when disabled with unknown reason', () => {
      const result = getActionTooltip(actionName, true, 'unknownReason' as ActionState);
      expect(result).toBe('Action currently unavailable');
    });
  });

  describe('edge cases', () => {
    it('should handle empty action name when not disabled', () => {
      const result = getActionTooltip('', false, null);
      expect(result).toBe('');
    });

    it('should handle empty action name when disabled with noTask reason', () => {
      const result = getActionTooltip('', true, 'noTask');
      expect(result).toBe(' - Enter a task description to enable');
    });

    it('should handle empty action name when disabled with noSelection reason', () => {
      const result = getActionTooltip('', true, 'noSelection');
      expect(result).toBe(' - Select one or more files to enable');
    });

    it('should handle action with special characters', () => {
      const specialAction = 'Copy & Paste';
      const result = getActionTooltip(specialAction, true, 'noTask');
      expect(result).toBe('Copy & Paste - Enter a task description to enable');
    });
  });
});
