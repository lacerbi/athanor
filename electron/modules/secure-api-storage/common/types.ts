// AI Summary: Core type definitions for secure API key storage module.
// Defines API providers, IPC communication structures, and channel names for main/renderer communication.

/**
 * Supported API providers for the secure storage system
 */
export type ApiProvider = 'openai' | 'anthropic' | 'gemini' | 'mistral';

/**
 * Payload structure for storing API keys via IPC
 */
export interface StoreApiKeyPayload {
  providerId: ApiProvider;
  apiKey: string;
}

/**
 * Information about a stored API key (without the key itself)
 */
export interface ApiKeyInfo {
  providerId: ApiProvider;
  isStored: boolean;
  createdAt?: Date;
  lastUsed?: Date;
}

/**
 * IPC channel names for secure API key operations
 */
export const IPCChannelNames = {
  SECURE_API_KEY_STORE: 'secure-api-key:store',
  SECURE_API_KEY_GET: 'secure-api-key:get',
  SECURE_API_KEY_DELETE: 'secure-api-key:delete',
  SECURE_API_KEY_IS_STORED: 'secure-api-key:is-stored',
  SECURE_API_KEY_GET_STORED_PROVIDERS: 'secure-api-key:get-stored-providers',
  SECURE_API_KEY_GET_DISPLAY_INFO: 'secure-api-key:get-display-info'
} as const;

/**
 * Type for IPC channel names
 */
export type IPCChannelName = typeof IPCChannelNames[keyof typeof IPCChannelNames];
