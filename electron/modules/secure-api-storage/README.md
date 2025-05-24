# Secure API Key Storage Module

This module is responsible for securely storing, retrieving, and managing API keys for various AI providers within the Electron application. It leverages Electron's `safeStorage` for OS-level encryption, ensuring that API keys are not stored in plaintext.

## Architecture

The module is divided into three main parts, following Electron's process model:

1.  **`common/`**: Contains code shared between the main and renderer processes.

    - `types.ts`: Defines core types like `ApiProvider` (e.g., 'openai', 'anthropic'), IPC channel names, and payload structures.
    - `errors.ts`: Defines `ApiKeyStorageError` for consistent error handling.
    - `providers/`:
      - `ProviderInterface.ts`: Defines the `IApiProviderValidator` interface, which each API provider must implement for key validation.
      - `ProviderService.ts`: Manages instances of API provider validators and provides a centralized way to validate API keys based on provider-specific formats.
      - Individual provider files (e.g., `OpenAIProvider.ts`, `AnthropicProvider.ts`): Implement `IApiProviderValidator` for specific services.

2.  **`main/`**: Contains the core logic that runs in Electron's main process.

    - `ApiKeyServiceMain.ts`: This is the heart of the secure storage system. It handles:
      - Encryption and decryption of API keys using `electron.safeStorage`.
      - Persistence of encrypted keys to disk (in the app's user data directory, under `secure_api_keys/`).
      - In-memory caching of plaintext keys (only within the main process) for quick access after initial decryption.
      - Validation of API key formats via `ProviderService` before storage.
      - Loading stored keys on application startup.
    - This service is instantiated in `electron/main.ts` and made available to IPC handlers.

3.  **`renderer/`**: Contains the client-side service used by UI components in Electron's renderer process.
    - `ApiKeyServiceRenderer.ts`: Provides a clean, typed API for the UI to interact with the secure storage system. It does **not** handle keys directly but communicates with `ApiKeyServiceMain` via IPC. Key methods include:
      - `storeKey(providerId, apiKey)`
      - `getKey(providerId)`
      - `deleteKey(providerId)`
      - `isKeyStored(providerId)`
      - `getStoredProviderIds()`
      - `getAvailableProviders()` (lists all supported providers)
      - `validateApiKeyFormat(providerId, apiKey)` (for client-side validation feedback)
    - It uses the `window.electronBridge.secureApiKeyManager` exposed via `electron/preload.ts`.

## IPC Communication

- **`electron/handlers/secureApiKeyIpc.ts`**: Registers IPC handlers (e.g., `SECURE_API_KEY_STORE`, `SECURE_API_KEY_GET`) that receive requests from the renderer process. These handlers delegate the actual work to an instance of `ApiKeyServiceMain`.
- **`electron/preload.ts`**: Exposes the `electronBridge.secureApiKeyManager` object to the renderer process. This bridge defines methods that invoke the IPC channels handled by `secureApiKeyIpc.ts`.
- **`src/types/global.d.ts`**: Provides TypeScript definitions for `window.electronBridge.secureApiKeyManager` for type-safe usage in the renderer.

## How to Use

### From the Renderer Process (UI)

1.  Import and instantiate `ApiKeyServiceRenderer`:

    ```typescript
    import { ApiKeyServiceRenderer } from 'electron/modules/secure-api-storage/renderer';
    // Typically in a React component or service
    const apiKeyService = new ApiKeyServiceRenderer();
    ```

2.  Use its methods to manage API keys:

    ```typescript
    // Store a key
    try {
      await apiKeyService.storeKey('openai', 'sk-yourOpenAiKey');
      console.log('OpenAI key stored successfully.');
    } catch (error) {
      console.error('Failed to store key:', error.message);
    }

    // Retrieve a key
    const openaiKey = await apiKeyService.getKey('openai');
    if (openaiKey) {
      console.log('Retrieved OpenAI key.'); // Use it carefully
    }

    // Check if a key is stored
    const hasGeminiKey = await apiKeyService.isKeyStored('gemini');
    console.log('Gemini key stored:', hasGeminiKey);

    // Get all supported provider IDs for UI dropdowns etc.
    const availableProviders = apiKeyService.getAvailableProviders();

    // Validate API key format in the UI before attempting to store
    const isValidFormat = apiKeyService.validateApiKeyFormat(
      'mistral',
      'some-user-input'
    );
    ```

### From the Main Process

Direct interaction with `ApiKeyServiceMain` is typically managed by the `setupIpcHandlers` and `electron/main.ts`. If you need to extend functionality related to API key storage directly in the main process (e.g., new internal logic not exposed via IPC), you would modify or use `ApiKeyServiceMain`.

## Adding a New API Provider

To add support for a new API provider (e.g., "MyNewAI"):

1.  **Define Provider Type**: Add the new provider ID to the `ApiProvider` union type in `electron/modules/secure-api-storage/common/types.ts`:

    ```typescript
    export type ApiProvider =
      | 'openai'
      | 'anthropic'
      | 'gemini'
      | 'mistral'
      | 'mynewai';
    ```

2.  **Create Provider Validator**: Create a new file, e.g., `electron/modules/secure-api-storage/common/providers/MyNewAIProvider.ts`:

    ```typescript
    import { IApiProviderValidator } from './ProviderInterface';
    import { ApiProvider } from '../types';

    export class MyNewAIProvider implements IApiProviderValidator {
      readonly providerId: ApiProvider = 'mynewai';

      private readonly validationPattern = /^mynewai-[A-Za-z0-9-]{10,}$/; // Adjust regex

      validateApiKey(apiKey: string): boolean {
        return this.validationPattern.test(apiKey);
      }
    }
    ```

3.  **Register Provider**:

    - Export the new provider class in `electron/modules/secure-api-storage/common/providers/index.ts`.
    - Register an instance of your new provider in the `ProviderService` constructor or its `registerBuiltInProviders` method (`electron/modules/secure-api-storage/common/providers/ProviderService.ts`):

      ```typescript
      import { MyNewAIProvider } from './MyNewAIProvider'; // Add import

      // ... inside ProviderService class ...
      private registerBuiltInProviders(): void {
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new GeminiProvider());
        this.registerProvider(new MistralProvider());
        this.registerProvider(new MyNewAIProvider()); // Add this line
      }
      ```

4.  **Update UI (if applicable)**: If your application has UI elements that list providers or require provider-specific logic, update them to include "MyNewAI". `ApiKeyServiceRenderer.getAvailableProviders()` will automatically include it.

## Security Considerations

- Plaintext API keys are intended to live only in the memory of the main process after being decrypted from `safeStorage`.
- Renderer process communication always goes through IPC, and keys are not directly exposed to the renderer.
- `safeStorage` relies on OS-level encryption (e.g., Keychain on macOS, Credential Vault on Windows).
- Files are stored encrypted on disk.
- Ensure that any new IPC channels or main process logic handling API keys maintains these security boundaries.
