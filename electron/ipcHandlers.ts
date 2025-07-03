// AI Summary: Sets up all IPC handlers by importing and initializing modular handler functions.
// Coordinates core, file operation, and file watch handlers for unified IPC communication.
// Now accepts and injects FileService instance to all handlers.
import { ipcMain } from 'electron';
import { mainWindow } from './windowManager';
import { setupCoreHandlers } from './handlers/coreHandlers';
import { setupFileOperationHandlers } from './handlers/fileOperationHandlers';
import { setupFileWatchHandlers } from './handlers/fileWatchHandlers';
import { setupSettingsHandlers } from './handlers/settingsHandlers';
import { registerLlmIpc } from './handlers/llmIpc';
import { setupContextHandlers } from './handlers/contextHandlers';
import { setupShellHandlers } from './handlers/shellHandlers';
import { setupGitHandlers } from './handlers/gitHandlers';
import { FileService } from './services/FileService';
import { SettingsService } from './services/SettingsService';
import { GitService } from './services/GitService';
import { ApiKeyServiceMain } from 'genai-key-storage-lite';
import type { LLMService } from 'genai-lite';
import { RelevanceEngineService } from './services/RelevanceEngineService';
import { ProjectGraphService } from './services/ProjectGraphService';
import { UserActivityService } from './services/UserActivityService';
import { ShellService } from './services/ShellService';

export function setupIpcHandlers(
  fileService: FileService,
  settingsService: SettingsService,
  apiKeyService: ApiKeyServiceMain,
  llmService: LLMService,
  relevanceEngine: RelevanceEngineService,
  projectGraphService: ProjectGraphService,
  userActivityService: UserActivityService,
  shellService: ShellService,
  gitService: GitService
) {
  setupCoreHandlers(fileService, settingsService);
  setupFileOperationHandlers(fileService);
  setupFileWatchHandlers(fileService);
  setupSettingsHandlers(settingsService);
  registerLlmIpc(llmService, apiKeyService);
  setupContextHandlers(relevanceEngine, settingsService);
  setupShellHandlers(shellService);
  setupGitHandlers(gitService, fileService);
}
