// AI Summary: Command handler for creating agent tasks.
// Parses file_name and task_content from an XML block, writes the content to a file in the .ath_materials directory,
// and logs a clickable success message that copies an instruction to the clipboard.
import { extractTagContent } from '../utils/extractTagContent';
import { copyToClipboard } from '../actions';

export interface AgentTaskCommandParams {
  content: string;
  addLog: (
    message: string | { message: string; onClick: () => Promise<void> }
  ) => void;
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

    const instruction = `Review and execute the instructions in ${displayPath}`;
    addLog({
      message: `Agent task created: ${displayPath}. Click to copy instruction.`,
      onClick: async () => {
        await copyToClipboard({
          content: instruction,
          addLog: (msg: string) => addLog(msg),
        });
      },
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`Error executing "agent task" command: ${errorMessage}`);
    console.error('Agent Task execution failed:', error);
    return false;
  }
}
