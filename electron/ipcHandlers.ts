// AI Summary: Sets up all IPC handlers by importing and initializing modular handler functions.
// Coordinates core, file operation, and file watch handlers for unified IPC communication.
// Now accepts and injects FileService instance to all handlers.
import { setupCoreHandlers } from './handlers/coreHandlers';
import { setupFileOperationHandlers } from './handlers/fileOperationHandlers';
import { setupFileWatchHandlers } from './handlers/fileWatchHandlers';
import { FileService } from './services/FileService';

export function setupIpcHandlers(fileService: FileService) {
  setupCoreHandlers(fileService);
  setupFileOperationHandlers(fileService);
  setupFileWatchHandlers(fileService);
}
