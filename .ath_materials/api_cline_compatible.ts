export type ApiProvider = 'anthropic' | 'openai' | 'gemini' | 'mistral';

export interface ApiHandlerOptions {
  apiModelId?: string;
  apiKey?: string; // anthropic
  clineApiKey?: string;
  taskId?: string; // Used to identify the task in API requests
  liteLlmBaseUrl?: string;
  liteLlmModelId?: string;
  liteLlmApiKey?: string;
  liteLlmUsePromptCache?: boolean;
  openAiHeaders?: Record<string, string>; // Custom headers for OpenAI requests
  liteLlmModelInfo?: LiteLLMModelInfo;
  anthropicBaseUrl?: string;
  openRouterApiKey?: string;
  openRouterModelId?: string;
  openRouterModelInfo?: ModelInfo;
  openRouterProviderSorting?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  awsUseCrossRegionInference?: boolean;
  awsBedrockUsePromptCache?: boolean;
  awsUseProfile?: boolean;
  awsProfile?: string;
  awsBedrockEndpoint?: string;
  awsBedrockCustomSelected?: boolean;
  awsBedrockCustomModelBaseId?: BedrockModelId;
  vertexProjectId?: string;
  vertexRegion?: string;
  openAiBaseUrl?: string;
  openAiApiKey?: string;
  openAiModelId?: string;
  openAiModelInfo?: OpenAiCompatibleModelInfo;
  ollamaModelId?: string;
  ollamaBaseUrl?: string;
  ollamaApiOptionsCtxNum?: string;
  lmStudioModelId?: string;
  lmStudioBaseUrl?: string;
  geminiApiKey?: string;
  geminiBaseUrl?: string;
  openAiNativeApiKey?: string;
  deepSeekApiKey?: string;
  requestyApiKey?: string;
  requestyModelId?: string;
  requestyModelInfo?: ModelInfo;
  togetherApiKey?: string;
  togetherModelId?: string;
  fireworksApiKey?: string;
  fireworksModelId?: string;
  fireworksModelMaxCompletionTokens?: number;
  fireworksModelMaxTokens?: number;
  qwenApiKey?: string;
  doubaoApiKey?: string;
  mistralApiKey?: string;
  azureApiVersion?: string;
  vsCodeLmModelSelector?: LanguageModelChatSelector;
  qwenApiLine?: string;
  nebiusApiKey?: string;
  asksageApiUrl?: string;
  asksageApiKey?: string;
  xaiApiKey?: string;
  thinkingBudgetTokens?: number;
  reasoningEffort?: string;
  sambanovaApiKey?: string;
  cerebrasApiKey?: string;
  requestTimeoutMs?: number;
  onRetryAttempt?: (
    attempt: number,
    maxRetries: number,
    delay: number,
    error: any
  ) => void;
}

export type ApiConfiguration = ApiHandlerOptions & {
  apiProvider?: ApiProvider;
  favoritedModelIds?: string[];
};

// Models
export interface ModelInfo {
  maxTokens?: number;
  contextWindow?: number;
  supportsImages?: boolean;
  supportsPromptCache: boolean; // this value is hardcoded for now
  inputPrice?: number;
  outputPrice?: number;
  thinkingConfig?: {
    maxBudget?: number; // Max allowed thinking budget tokens
    outputPrice?: number; // Output price per million tokens when budget > 0
  };
  cacheWritesPrice?: number;
  cacheReadsPrice?: number;
  description?: string;
}

export interface OpenAiCompatibleModelInfo extends ModelInfo {
  temperature?: number;
  isR1FormatRequired?: boolean;
}

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models // prices updated 2025-01-02
export type AnthropicModelId = keyof typeof anthropicModels;
export const anthropicDefaultModelId: AnthropicModelId =
  'claude-sonnet-4-20250514';
export const anthropicModels = {
  'claude-sonnet-4-20250514': {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  'claude-opus-4-20250514': {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheWritesPrice: 18.75,
    cacheReadsPrice: 1.5,
  },
  'claude-3-7-sonnet-20250219': {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,

    supportsPromptCache: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  'claude-3-5-sonnet-20241022': {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 3.0, // $3 per million input tokens
    outputPrice: 15.0, // $15 per million output tokens
    cacheWritesPrice: 3.75, // $3.75 per million tokens
    cacheReadsPrice: 0.3, // $0.30 per million tokens
  },
  'claude-3-5-haiku-20241022': {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: false,
    supportsPromptCache: true,
    inputPrice: 0.8,
    outputPrice: 4.0,
    cacheWritesPrice: 1.0,
    cacheReadsPrice: 0.08,
  },
} as const satisfies Record<string, ModelInfo>; // as const assertion makes the object deeply readonly

// Gemini
// https://ai.google.dev/gemini-api/docs/models/gemini
export type GeminiModelId = keyof typeof geminiModels;
export const geminiDefaultModelId: GeminiModelId =
  'gemini-2.5-flash-preview-05-20';
export const geminiModels = {
  'gemini-2.5-pro-preview-05-06': {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 2.5,
    outputPrice: 15,
    cacheReadsPrice: 0.31,
  },
  'gemini-2.5-flash-preview-05-20': {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0.15,
    outputPrice: 0.6,
    thinkingConfig: {
      maxBudget: 24576,
      outputPrice: 3.5,
    },
  },
  'gemini-2.0-flash': {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.1,
    outputPrice: 0.4,
    cacheReadsPrice: 0.025,
    cacheWritesPrice: 1.0,
  },
  'gemini-2.0-flash-lite': {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0.075,
    outputPrice: 0.3,
  },
} as const satisfies Record<string, ModelInfo>;

// OpenAI
// https://openai.com/api/pricing/
export type OpenAiModelId = keyof typeof openAiModels;
export const openAiDefaultModelId: OpenAiModelId = 'gpt-4.1';
export const openAiModels = {
  'o4-mini': {
    maxTokens: 100_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.1,
    outputPrice: 4.4,
    cacheReadsPrice: 0.275,
  },
  'gpt-4.1': {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 2,
    outputPrice: 8,
    cacheReadsPrice: 0.5,
  },
  'gpt-4.1-mini': {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.4,
    outputPrice: 1.6,
    cacheReadsPrice: 0.1,
  },
  'gpt-4.1-nano': {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.1,
    outputPrice: 0.4,
    cacheReadsPrice: 0.025,
  },
} as const satisfies Record<string, ModelInfo>;

// Mistral
// https://docs.mistral.ai/getting-started/models/models_overview/
export type MistralModelId = keyof typeof mistralModels;
export const mistralDefaultModelId: MistralModelId = 'devstral-small-2505';
export const mistralModels = {
  'codestral-2501': {
    maxTokens: 256_000,
    contextWindow: 256_000,
    supportsImages: false,
    supportsPromptCache: false,
    inputPrice: 0.3,
    outputPrice: 0.9,
  },
  'devstral-small-2505': {
    maxTokens: 128_000,
    contextWindow: 131_072,
    supportsImages: false,
    supportsPromptCache: false,
    inputPrice: 0.1,
    outputPrice: 0.3,
  },
} as const satisfies Record<string, ModelInfo>;
