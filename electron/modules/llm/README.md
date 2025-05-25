# LLM Integration Module

This module is responsible for integrating Large Language Model (LLM) capabilities into the Athanor application. It handles communication with various LLM providers, manages request configurations and settings, and provides a standardized interface for both main and renderer processes.

## Overview

The LLM module allows Athanor to:
- Fetch lists of supported LLM providers and their models.
- Send chat-based requests to different LLM providers.
- Apply provider-specific and model-specific settings (e.g., temperature, max tokens).
- Handle API responses and errors in a consistent manner.
- Securely utilize API keys managed by the `secure-api-storage` module.

## Architecture

The module is structured across Electron's main and renderer processes, with shared components:

1.  **`common/`**:
    * `types.ts`: Defines core TypeScript types used across the module, including:
        * `ApiProviderId`: Identifiers for LLM providers (e.g., 'openai', 'anthropic').
        * `LLMMessageRole`, `LLMMessage`: Structures for conversation messages.
        * `LLMSettings`: Configurable parameters for LLM requests.
        * `LLMChatRequest`, `LLMResponse`, `LLMFailureResponse`: Standardized request and response formats.
        * `ProviderInfo`, `ModelInfo`: Structures for provider and model metadata.
        * `LLM_IPC_CHANNELS`: Constants for IPC communication channel names.

2.  **`main/`**: Contains the core backend logic running in Electron's main process.
    * `LLMServiceMain.ts`: The central service in the main process. It orchestrates LLM operations by:
        * Managing instances of LLM client adapters.
        * Integrating with `ApiKeyServiceMain` (from the `secure-api-storage` module) to securely access API keys.
        * Validating requests, applying default and user-defined settings.
        * Routing requests to the appropriate client adapter.
    * `clients/`: Directory for provider-specific client adapters.
        * `types.ts`: Defines the `ILLMClientAdapter` interface that all provider adapters must implement, and `AdapterErrorCode` for standardized error codes. It also defines `InternalLLMChatRequest` which ensures settings are always present.
        * `OpenAIClientAdapter.ts`, `AnthropicClientAdapter.ts`, etc.: Implementations of `ILLMClientAdapter` for specific LLM providers (e.g., OpenAI, Anthropic). They handle API-specific request formatting, response parsing, and error mapping.
        * `MockClientAdapter.ts`: A mock adapter for testing and development without making real API calls.
        * `adapterErrorUtils.ts`: A utility function `getCommonMappedErrorDetails` to map common HTTP and network errors to standardized `AdapterErrorCode` and `LLMError` fields.
    * `config.ts`: Contains crucial configuration for the LLM module:
        * `ADAPTER_CONSTRUCTORS`: A mapping from `ApiProviderId` to client adapter constructor classes, enabling dynamic registration of adapters in `LLMServiceMain`.
        * `ADAPTER_CONFIGS`: Optional configurations for each adapter (e.g., custom base URLs).
        * `DEFAULT_LLM_SETTINGS`: Global default settings for LLM requests.
        * `PROVIDER_DEFAULT_SETTINGS`: Overrides for default settings on a per-provider basis.
        * `MODEL_DEFAULT_SETTINGS`: Overrides for default settings on a per-model basis (highest precedence).
        * `SUPPORTED_PROVIDERS`: An array of `ProviderInfo` objects detailing supported LLM providers.
        * `SUPPORTED_MODELS`: An array of `ModelInfo` objects detailing supported models, their capabilities, pricing (example), and default configurations.
        * Helper functions like `getProviderById`, `getModelById`, `getDefaultSettingsForModel`, `validateLLMSettings`.

3.  **`renderer/`**: Contains the client-side service used by UI components in Electron's renderer process.
    * `LLMServiceRenderer.ts`: Provides a typed API for UI components to interact with the LLM system. It communicates with `LLMServiceMain` via IPC. Key methods include:
        * `getProviders()`: Fetches available LLM providers.
        * `getModels(providerId)`: Fetches models for a specific provider.
        * `sendMessage(request)`: Sends an LLM chat request to the main process.

## Key Components and Responsibilities

-   **`LLMServiceMain`**:
    * Central hub for all LLM operations in the main process.
    * Dynamically instantiates and manages client adapters based on `config.ts`.
    * Securely retrieves API keys using `ApiKeyServiceMain.withDecryptedKey` before passing them to adapters.
    * Applies a hierarchy of settings: global defaults -> provider defaults -> model defaults -> request-specific settings.
    * Validates incoming `LLMChatRequest` objects.
-   **`LLMServiceRenderer`**:
    * Acts as the primary interface for the renderer process (UI) to access LLM functionalities.
    * Uses `ipcRenderer.invoke` to send requests to the main process and receive responses.
    * Abstracts IPC complexity from UI components.
-   **`ILLMClientAdapter` (and its implementations)**:
    * Defines the contract for interacting with a specific LLM provider.
    * Implementations (e.g., `OpenAIClientAdapter`, `AnthropicClientAdapter`) handle the unique aspects of each provider's API:
        * Request formatting (e.g., message structures, system prompt placement).
        * Authentication (using the provided API key).
        * API calls.
        * Response parsing into the standard `LLMResponse` format.
        * Error mapping into the standard `LLMFailureResponse` format, often using `adapterErrorUtils.ts` and `ADAPTER_ERROR_CODES`.
    * A `MockClientAdapter` is available for testing purposes.
-   **`config.ts`**:
    * The single source of truth for supported providers, models, their configurations, and default operational parameters.
    * Enables easy addition or modification of LLM providers and models.
    * Supports dynamic registration of client adapters through `ADAPTER_CONSTRUCTORS` and `ADAPTER_CONFIGS`, making the system extensible.
-   **`common/types.ts`**:
    * Ensures type safety and consistency for data structures exchanged between processes and within different parts of the module.
    * Defines `LLM_IPC_CHANNELS` for reliable IPC communication.
-   **`adapterErrorUtils.ts`**:
    * Promotes consistent error reporting from different client adapters by providing a common mapping for network and HTTP status code errors.

## IPC Communication

-   IPC channels are defined in `electron/modules/llm/common/types.ts` under `LLM_IPC_CHANNELS`.
-   The `LLMServiceRenderer` uses `ipcRenderer.invoke` with these channel names to send requests to the main process.
-   In the main process, corresponding IPC handlers (expected to be defined in `electron/handlers/llmIpc.ts`) receive these requests. These handlers then delegate the work to an instance of `LLMServiceMain`.
-   Responses (`LLMResponse` or `LLMFailureResponse`) are returned via the `invoke` promise.

**Example IPC Channels:**
* `LLM_IPC_CHANNELS.GET_PROVIDERS`: To fetch `ProviderInfo[]`.
* `LLM_IPC_CHANNELS.GET_MODELS`: To fetch `ModelInfo[]` for a given `providerId`.
* `LLM_IPC_CHANNELS.SEND_MESSAGE`: To send an `LLMChatRequest` and receive `LLMResponse | LLMFailureResponse`.

## Configuration

The LLM module's behavior is heavily driven by `electron/modules/llm/main/config.ts`:

-   **Settings Hierarchy**:
    1.  **Global Defaults**: `DEFAULT_LLM_SETTINGS` (e.g., `temperature: 0.7, maxTokens: 2048`).
    2.  **Provider Defaults**: `PROVIDER_DEFAULT_SETTINGS` (e.g., Anthropic might have different default `maxTokens`).
    3.  **Model Defaults**: `MODEL_DEFAULT_SETTINGS` (e.g., `gpt-4o-mini` might have a specific `maxTokens` and `temperature` different from other OpenAI models).
    4.  **Request Settings**: Settings provided in the `LLMChatRequest.settings` object override all defaults.
-   **Providers and Models**:
    * `SUPPORTED_PROVIDERS`: Array defining all usable LLM providers (ID, name).
    * `SUPPORTED_MODELS`: Array defining specific models for each provider, including their ID, name, context window size, pricing hints, and other notes.
-   **Adapter Configuration**:
    * `ADAPTER_CONSTRUCTORS`: Maps provider IDs to their client adapter classes.
    * `ADAPTER_CONFIGS`: Allows passing constructor arguments to adapters, like custom base URLs which can be sourced from environment variables (e.g., `process.env.OPENAI_API_BASE_URL`).
-   **Validation**: `validateLLMSettings` function helps ensure that settings values are within acceptable ranges.

## How to Use

### From the Renderer Process (UI)

1.  Import and instantiate `LLMServiceRenderer`:
    ```typescript
    // Typically in a React component, hook, or UI service
    import { LLMServiceRenderer } from 'electron/modules/llm/renderer/LLMServiceRenderer';
    import type { LLMChatRequest, ApiProviderId } from 'electron/modules/llm/common/types';

    const llmService = new LLMServiceRenderer();
    ```

2.  Use its methods:
    ```typescript
    // Get available providers
    async function fetchProviders() {
      const providers = await llmService.getProviders();
      console.log('Available LLM Providers:', providers);
      // Update UI state with providers
    }

    // Get models for a specific provider
    async function fetchModels(providerId: ApiProviderId) {
      const models = await llmService.getModels(providerId);
      console.log(`Models for ${providerId}:`, models);
      // Update UI state with models
    }

    // Send a chat message
    async function askLLM(request: LLMChatRequest) {
      const response = await llmService.sendMessage(request);
      if (response.object === 'chat.completion') {
        console.log('LLM Success Response:', response.choices[0].message.content);
      } else { // LLMFailureResponse
        console.error('LLM Error Response:', response.error.message, response.error.code);
      }
    }

    // Example usage:
    const chatRequest: LLMChatRequest = {
      providerId: 'openai',
      modelId: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Translate "hello" to French.' }],
      settings: { temperature: 0.5 }
    };
    askLLM(chatRequest);
    ```

### Main Process Integration (e.g., with ApiKeyServiceMain)

`LLMServiceMain` is designed to be used primarily via IPC calls from the renderer. Its direct interaction with other main process services, especially `ApiKeyServiceMain`, is crucial for its operation.

When `LLMServiceMain.sendMessage` is called, it internally uses the `ApiKeyServiceMain` instance (passed during its construction) to securely retrieve the necessary API key:

```typescript
// Simplified snippet from LLMServiceMain.ts
// this.apiKeyService is an instance of ApiKeyServiceMain

// ... inside sendMessage method ...
const result = await this.apiKeyService.withDecryptedKey(
  request.providerId,
  async (decryptedApiKey: string) => {
    // decryptedApiKey is the plaintext API key for request.providerId
    // This key is then passed to the appropriate clientAdapter
    return await clientAdapter.sendMessage(internalRequest, decryptedApiKey);
  }
);
// ...
````

This pattern ensures that plaintext API keys are only handled within the main process, decrypted on-demand, used immediately by the client adapter, and not stored or exposed unnecessarily.

## Adding a New LLM Provider

To add support for a new LLM provider (e.g., "MyNewAIProvider"):

1.  **Update Common Types (if provider ID is new to the system)**:

      * If "mynewaprovider" is a completely new `ApiProviderId` not yet known by the `secure-api-storage` module, you'll need to add it there first. See `electron/modules/secure-api-storage/README.md` for instructions on adding a new provider (which includes updating its `ApiProvider` type and adding a validator).
      * Ensure the `ApiProviderId` type in `electron/modules/llm/common/types.ts` also includes your new provider ID if it's not implicitly shared or if there are llm-specific considerations. (Usually, `ApiProviderId` from `secure-api-storage` is reused).

2.  **Implement Client Adapter**:

      * Create a new adapter class in `electron/modules/llm/main/clients/MyNewAIProviderClientAdapter.ts`.
      * This class must implement the `ILLMClientAdapter` interface from `electron/modules/llm/main/clients/types.ts`.
      * Implement `sendMessage`, and optionally `validateApiKey` and `getAdapterInfo`.
      * Use the provider's SDK or make HTTP requests directly.
      * Map provider-specific responses and errors to `LLMResponse` / `LLMFailureResponse`, utilizing `adapterErrorUtils.ts` and `ADAPTER_ERROR_CODES` where appropriate.

3.  **Update `config.ts` (`electron/modules/llm/main/config.ts`)**:

      * **Register Adapter Constructor**: Add your new adapter to `ADAPTER_CONSTRUCTORS`:
        ```typescript
        import { MyNewAIProviderClientAdapter } from './clients/MyNewAIProviderClientAdapter';
        // ...
        export const ADAPTER_CONSTRUCTORS: Partial<Record<ApiProviderId, new () => ILLMClientAdapter>> = {
          'openai': OpenAIClientAdapter,
          'anthropic': AnthropicClientAdapter,
          'mynewaprovider': MyNewAIProviderClientAdapter, // Add this
          // ...
        };
        ```
      * **Adapter Configuration (Optional)**: If your adapter needs specific constructor arguments (like a base URL), add an entry to `ADAPTER_CONFIGS`:
        ```typescript
        export const ADAPTER_CONFIGS: Partial<Record<ApiProviderId, { baseURL?: string }>> = {
          'openai': { baseURL: process.env.OPENAI_API_BASE_URL || undefined },
          'mynewaprovider': { baseURL: process.env.MYNEWAI_API_BASE_URL || '[https://api.mynew.ai/v1](https://api.mynew.ai/v1)' },
          // ...
        };
        ```
      * **Add Provider Info**: Add an entry to `SUPPORTED_PROVIDERS`:
        ```typescript
        export const SUPPORTED_PROVIDERS: ProviderInfo[] = [
          // ... existing providers ...
          { id: 'mynewaprovider', name: 'MyNewAI Provider' },
        ];
        ```
      * **Add Model Info**: Add one or more entries to `SUPPORTED_MODELS` for the models offered by this provider:
        ```typescript
        export const SUPPORTED_MODELS: ModelInfo[] = [
          // ... existing models ...
          {
            id: 'mynewai-model-x',
            name: 'MyNewAI Model X',
            providerId: 'mynewaprovider',
            contextWindow: 16000,
            // ... other properties like pricing, notes, supportsSystemMessage
          },
        ];
        ```
      * **Provider/Model Default Settings (Optional)**: If this provider or its models have specific default settings that differ from global defaults, add entries to `PROVIDER_DEFAULT_SETTINGS` and/or `MODEL_DEFAULT_SETTINGS`.

4.  **Restart and Test**: After these changes, restart the Electron application. The new provider and its models should be available via `LLMServiceRenderer.getProviders()` and `LLMServiceRenderer.getModels()`, and `LLMServiceRenderer.sendMessage()` should route requests to your new adapter.

## Error Handling

  - The module uses standardized error responses: `LLMFailureResponse` for failed operations.
  - `LLMFailureResponse.error` contains:
      * `message`: Human-readable error message.
      * `code`: A string error code. For adapter-level errors, this often comes from `ADAPTER_ERROR_CODES` (e.g., `INVALID_API_KEY`, `RATE_LIMIT_EXCEEDED`). For other errors, it might be `VALIDATION_ERROR`, `IPC_ERROR`, etc.
      * `type`: A category for the error (e.g., `authentication_error`, `invalid_request_error`, `server_error`).
      * `providerError` (optional): The original error object from the provider's SDK or HTTP client.
  - `getCommonMappedErrorDetails` in `adapterErrorUtils.ts` helps standardize common network/HTTP errors. Client adapters can further refine error details based on provider-specific error responses.

## Dependencies

  - **`secure-api-storage` module**: This is a critical dependency. The LLM module relies entirely on `secure-api-storage` (specifically `ApiKeyServiceMain`) for the secure storage, retrieval, and management of API keys. LLM client adapters receive plaintext API keys only transiently via the `withDecryptedKey` callback mechanism.
  - **Electron IPC**: For communication between renderer and main processes.
  - **External LLM SDKs**: Client adapters may depend on official SDKs from LLM providers (e.g., `@openai/openai-node`, `@anthropic-ai/sdk`).

This comprehensive setup allows Athanor to flexibly integrate with various LLMs while maintaining a clear separation of concerns and security for API key handling.
