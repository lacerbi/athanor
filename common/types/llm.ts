// common/types/llm.ts
/**
 * IPC channel names for LLM operations
 */
export const LLM_IPC_CHANNELS = {
  GET_PROVIDERS: 'llm:get-providers',
  GET_MODELS: 'llm:get-models',
  SEND_MESSAGE: 'llm:send-message',
  IS_KEY_AVAILABLE: 'llm:is-key-available',
  GET_PRESETS: 'llm:get-presets',
} as const;

/**
 * Type for LLM IPC channel names
 */
export type LLMIPCChannelName =
  (typeof LLM_IPC_CHANNELS)[keyof typeof LLM_IPC_CHANNELS];