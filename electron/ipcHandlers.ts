// AI Summary: Sets up all IPC handlers by importing and initializing modular handler functions.
// Coordinates core, file operation, and file watch handlers for unified IPC communication.
import { setupCoreHandlers } from './handlers/coreHandlers';
import { setupFileOperationHandlers } from './handlers/fileOperationHandlers';
import { setupFileWatchHandlers } from './handlers/fileWatchHandlers';

export function setupIpcHandlers() {
  setupCoreHandlers();
  setupFileOperationHandlers();
  setupFileWatchHandlers();
}
