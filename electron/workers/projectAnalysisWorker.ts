import { parentPort, workerData } from 'worker_threads';
import { FileService } from '../services/FileService';
import { ProjectGraphService } from '../services/ProjectGraphService';
import { GitService } from '../services/GitService';

if (!parentPort) {
  throw new Error('This script must be run as a worker thread.');
}

(async () => {
  try {
    const { baseDir } = workerData;
    if (!baseDir) {
      throw new Error('baseDir not provided in workerData');
    }

    console.log(`[Worker] Starting project analysis for: ${baseDir}`);

    const fileService = new FileService();
    const gitService = new GitService(baseDir);
    const projectGraphService = new ProjectGraphService(fileService, gitService);

    await fileService.setBaseDir(baseDir);

    await projectGraphService.analyzeProject();

    const graphData = projectGraphService.getGraphData();

    parentPort?.postMessage({ success: true, data: graphData });
    console.log('[Worker] Project analysis complete. Sent data to main thread.');
  } catch (error) {
    console.error('[Worker] Error during project analysis:', error);
    // Make sure error is serializable
    const errorMessage = error instanceof Error ? error.message : String(error);
    parentPort?.postMessage({ success: false, error: errorMessage });
  }
})();
