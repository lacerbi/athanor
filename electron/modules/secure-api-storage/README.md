# Secure API Key Storage Module

This module is responsible for securely storing, retrieving, and managing API keys for various AI providers within the Electron application. It leverages Electron's `safeStorage` for OS-level encryption, ensuring that API keys are not stored in plaintext and are not directly exposed to the renderer process.

## Architecture

The module is divided into three main parts, following Electron's process model:

1.  **`common/`**: Contains code shared between the main and renderer processes.

    - `types.ts`: Defines core types like `ApiProvider` (e.g., 'openai', 'anthropic'), IPC channel names (`IPCChannelNames`), and payload/response structures for IPC communication (e.g., `StoreApiKeyPayload`, `InvokeApiCallPayload`, `InvokeApiCallResponse`).
    - `errors.ts`: Defines `ApiKeyStorageError` for consistent error handling across the module.
    - `providers/`:
      - `ProviderInterface.ts`: Defines the `IApiProviderValidator` interface, which each API provider must implement for key format validation.
      - `ProviderService.ts`: Manages instances of API provider validators and provides a centralized way to validate API keys based on provider-specific formats.
      - Individual provider files (e.g., `OpenAIProvider.ts`, `AnthropicProvider.ts`): Implement `IApiProviderValidator` for specific services.

2.  **`main/`**: Contains the core logic that runs in Electron's main process.

    - `ApiKeyServiceMain.ts`: This is the heart of the secure storage system. It handles:
      - Encryption and decryption of API keys using `electron.safeStorage`. Keys are decrypted **on-demand** for immediate use (e.g., when making an API call) and are **not cached** in plaintext in memory.
      - Persistence of encrypted keys to disk (in the app's user data directory, under `secure_api_keys/`). Each key is stored in a separate JSON file named after its provider ID (e.g., `openai.json`), containing the encrypted key and its last four characters for display purposes.
      - Validation of API key formats via `ProviderService` before storage.
      - Loading API key **metadata** (like the last four characters and storage status) on application startup, without decrypting the actual keys.
    - This service is instantiated in `electron/main.ts` and made available to IPC handlers.

3.  **`renderer/`**: Contains the client-side service used by UI components in Electron's renderer process.
    - `ApiKeyServiceRenderer.ts`: Provides a clean, typed API for the UI to interact with the secure storage system. It does **not** handle plaintext keys directly but communicates with `ApiKeyServiceMain` via IPC. Key methods include:
      - `storeKey(providerId, apiKey)`: Sends a key to the main process for secure storage.
      - `deleteKey(providerId)`: Requests deletion of a key in the main process.
      - `invokeApiCall(payload)`: Securely requests the main process to make an API call using a stored key. The renderer sends API call parameters, and the main process performs the call, returning only the response.
      - `isKeyStored(providerId)`: Checks if a key is stored for a given provider.
      - `getStoredProviderIds()`: Retrieves a list of providers for which keys are currently stored.
      - `getApiKeyDisplayInfo(providerId)`: Gets non-sensitive display information about a key (e.g., storage status, last four characters).
      - `getAvailableProviders()`: Lists all API providers supported by the application.
      - `validateApiKeyFormat(providerId, apiKey)`: Performs client-side validation of an API key's format for immediate UI feedback.
    - It uses the `window.electronBridge.secureApiKeyManager` exposed via `electron/preload.ts`.

## IPC Communication

- **`electron/handlers/secureApiKeyIpc.ts`**: Registers IPC handlers (e.g., `IPCChannelNames.SECURE_API_KEY_STORE`, `IPCChannelNames.SECURE_API_INVOKE_CALL`, `IPCChannelNames.SECURE_API_KEY_DELETE`, `IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO`) that receive requests from the renderer process. These handlers delegate the actual work to an instance of `ApiKeyServiceMain`. Note that there is no IPC handler to directly send a plaintext key from main to renderer.
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

2.  Use its methods to manage API keys and invoke API calls:

    ```typescript
    // Store a key
    try {
      await apiKeyService.storeKey('openai', 'sk-yourOpenAiKey');
      console.log('OpenAI key stored successfully.');
    } catch (error) {
      console.error('Failed to store key:', error.message);
    }

    // Invoke an API call securely (key is handled in the main process)
    try {
      const payload = {
        providerId: 'openai',
        requestPath: '/v1/chat/completions',
        requestMethod: 'POST',
        requestBody: {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello!' }],
        },
      };
      const response = await apiKeyService.invokeApiCall(payload);
      if (response.success) {
        console.log('API call successful:', response.data);
      } else {
        console.error(
          'API call failed:',
          response.error,
          'Status:',
          response.statusCode
        );
      }
    } catch (error) {
      console.error('Error invoking API call:', error.message);
    }

    // Get display information for a key (does not return the key itself)
    try {
      const displayInfo = await apiKeyService.getApiKeyDisplayInfo('openai');
      if (displayInfo.isStored) {
        console.log(
          'OpenAI key is stored. Last four chars:',
          displayInfo.lastFourChars || 'N/A'
        );
      } else {
        console.log('OpenAI key is not stored.');
      }
    } catch (error) {
      console.error('Failed to get key display info:', error.message);
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

Direct interaction with `ApiKeyServiceMain` is typically managed by `electron/handlers/secureApiKeyIpc.ts` and initialized in `electron/main.ts`. If you need to extend functionality related to API key storage directly in the main process (e.g., new internal logic not exposed via IPC), you would modify or use `ApiKeyServiceMain`.

## Adding a New API Provider

To add support for a new API provider (e.g., "MyNewAI"):

1.  **Define Provider Type**: Add the new provider ID to the `ApiProvider` union type in `electron/modules/secure-api-storage/common/types.ts`:

    ```typescript
    export type ApiProvider =
      | 'openai'
      | 'anthropic'
      | 'gemini'
      | 'mistral'
      | 'mynewai'; // Added new provider
    ```

2.  **Create Provider Validator**: Create a new file, e.g., `electron/modules/secure-api-storage/common/providers/MyNewAIProvider.ts`:

    ```typescript
    import { IApiProviderValidator } from './ProviderInterface';
    import { ApiProvider } from '../types';

    export class MyNewAIProvider implements IApiProviderValidator {
      readonly providerId: ApiProvider = 'mynewai';

      // Example: API keys for 'mynewai' must start with 'mna_' and be 20 chars long
      private readonly validationPattern = /^mna_[a-zA-Z0-9]{16}$/;

      validateApiKey(apiKey: string): boolean {
        return this.validationPattern.test(apiKey);
      }
    }
    ```

3.  **Register Provider**:

    - Export the new provider class in `electron/modules/secure-api-storage/common/providers/index.ts`.
    - Register an instance of your new provider in the `ProviderService` constructor (or its `registerBuiltInProviders` method if it has one) in `electron/modules/secure-api-storage/common/providers/ProviderService.ts`:

      ```typescript
      import { MyNewAIProvider } from './MyNewAIProvider'; // Add import

      // ... inside ProviderService class constructor or init method ...
      this.providers.set('openai', new OpenAIProvider());
      this.providers.set('anthropic', new AnthropicProvider());
      this.providers.set('gemini', new GeminiProvider());
      this.providers.set('mistral', new MistralProvider());
      this.providers.set('mynewai', new MyNewAIProvider()); // Add this line
      ```

4.  **Update UI (if applicable)**: If your application has UI elements that list providers or require provider-specific logic, update them to include "mynewai". `ApiKeyServiceRenderer.getAvailableProviders()` will automatically include it after the above changes and an application restart.

## Security Considerations

- Plaintext API keys are only held in the memory of the main process **transiently** when they are decrypted on-demand from `safeStorage` for immediate use in an API call. They are **not cached** in plaintext.
- The renderer process **never** receives plaintext API keys from storage. Communication always goes through IPC, primarily using the `invokeApiCall` pattern, which ensures keys remain within the main process.
- `safeStorage` relies on OS-level encryption (e.g., Keychain on macOS, Credential Vault on Windows). The security of the stored keys is therefore tied to the security of the user's OS account and environment.
- Encrypted keys are stored on disk in the application's user data directory.
- Ensure that any new IPC channels or main process logic handling API keys maintains these strict security boundaries, particularly the isolation of plaintext keys from the renderer process.
