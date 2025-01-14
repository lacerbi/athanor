// AI Summary: Updates task description in workbench store based on command content.
// Validates task content and provides logging feedback on success or failure.
import { useWorkbenchStore } from '../stores/workbenchStore';

export interface TaskCommandParams {
  content: string;
  addLog: (message: string) => void;
}

export async function executeTaskCommand({
  content,
  addLog,
}: TaskCommandParams): Promise<boolean> {
  const workbenchStore = useWorkbenchStore.getState();
  const taskContent = content.trim();

  if (!taskContent) {
    addLog('Task command contains no content');
    return false;
  }

  workbenchStore.resetTaskDescription(taskContent);
  addLog('Updated task description from command');
  return true;
}
