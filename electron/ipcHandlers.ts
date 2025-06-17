// AI Summary: Sets up all IPC handlers by importing and initializing modular handler functions.
// Coordinates core, file operation, and file watch handlers for unified IPC communication.
// Now accepts and injects FileService instance to all handlers.
import { ipcMain } from 'electron';
import { mainWindow } from './windowManager';
import { setupCoreHandlers } from './handlers/coreHandlers';
import { setupFileOperationHandlers } from './handlers/fileOperationHandlers';
import { setupFileWatchHandlers } from './handlers/fileWatchHandlers';
import { setupSettingsHandlers } from './handlers/settingsHandlers';
import { registerSecureApiKeyIpc } from './handlers/secureApiKeyIpc';
import { registerLlmIpc } from './handlers/llmIpc';
import { setupContextHandlers } from './handlers/contextHandlers';
import { FileService } from './services/FileService';
import { SettingsService } from './services/SettingsService';
import { ApiKeyServiceMain } from './modules/secure-api-storage/main';
import { LLMServiceMain } from './modules/llm/main/LLMServiceMain';
import { RelevanceEngineService } from './services/RelevanceEngineService';
import { ProjectGraphService } from './services/ProjectGraphService';
import { UserActivityService } from './services/UserActivityService';

export function setupIpcHandlers(
  fileService: FileService,
  settingsService: SettingsService,
  apiKeyService: ApiKeyServiceMain,
  llmService: LLMServiceMain,
  relevanceEngine: RelevanceEngineService,
  projectGraphService: ProjectGraphService,
  userActivityService: UserActivityService
) {
  setupCoreHandlers(fileService, settingsService);
  setupFileOperationHandlers(fileService);
  setupFileWatchHandlers(fileService);
  setupSettingsHandlers(settingsService);
  registerSecureApiKeyIpc(apiKeyService);
  registerLlmIpc(llmService);
  setupContextHandlers(relevanceEngine);
}
