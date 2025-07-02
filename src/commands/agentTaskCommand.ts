import { extractTagContent } from '../utils/extractTagContent';

export interface AgentTaskCommandParams {
  content: string;
  addLog: (message: string) => void;
}

export async function executeAgentTaskCommand({
  content,
  addLog,
}: AgentTaskCommandParams): Promise<boolean> {
  try {
    const fileName = extractTagContent(content, 'file_name');
    const taskContent = extractTagContent(content, 'task_content');

    if (!fileName) {
      addLog('Error: "agent task" command is missing <file_name>.');
      return false;
    }

    if (!taskContent) {
      addLog('Error: "agent task" command is missing <task_content>.');
      return false;
    }

    const materialsDir = await window.fileService.getMaterialsDir();
    const filePath = await window.pathUtils.join(materialsDir, fileName);
    const displayPath = await window.pathUtils.relative(filePath);

    await window.fileService.write(filePath, taskContent);

    addLog(`Successfully wrote agent task to: ${displayPath}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`Error executing "agent task" command: ${errorMessage}`);
    console.error('Agent Task execution failed:', error);
    return false;
  }
}
