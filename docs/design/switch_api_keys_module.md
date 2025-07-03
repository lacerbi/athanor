# GenAI Key Storage Lite

A secure API key storage module for generative AI-based Electron applications using native OS credential stores.

This module leverages Electron's `safeStorage` for OS-level encryption (macOS Keychain, Windows Credential Vault), ensuring that API keys are not stored in plaintext and are not directly exposed to the renderer process.

## Features

- **Secure by Default**: Encrypts keys using native OS credential stores via `electron.safeStorage`.
- **Strict Process Separation**: Plaintext keys are never sent to the renderer process, preventing accidental exposure.
- **On-Demand Decryption**: Keys are decrypted only when needed for an API call and are never cached in plaintext in memory.
- **Simple Integration**: Provides clear, separated components for your application's `main`, `renderer`, and `preload` processes.
- **Built-in Provider Validation**: Includes key format validators for popular AI providers (OpenAI, Anthropic, Gemini, Mistral).

## Installation

```bash
npm install genai-key-storage-lite
# or
yarn add genai-key-storage-lite
```

## Available Exports

This package provides separate exports for each Electron process type to ensure proper bundling:

- **Main process**: `genai-key-storage-lite` (default export)
  - `ApiKeyServiceMain` - Core service for secure key storage
  - `registerSecureApiKeyIpc` - IPC handler registration
  
- **Renderer process**: `genai-key-storage-lite/renderer`
  - `ApiKeyServiceRenderer` - Client-side service for UI
  - `IApiKeyManagerBridge` - TypeScript interface for bridge
  
- **Preload script**: `genai-key-storage-lite/preload`
  - `createApiKeyManagerBridge` - Creates IPC bridge
  
- **Common types**: `genai-key-storage-lite/common`
  - `ApiProvider` - Type union of supported providers
  - `ApiKeyStorageError` - Error class
  - All shared types and interfaces

> **Important**: Always import common types from `/common` to avoid webpack bundling issues with main process code.

## How to Use

Integrating the module into your Electron application involves three steps.

### 1. Main Process Setup (`main.ts`)

In your main Electron process file, initialize `ApiKeyServiceMain` and register the IPC handlers it needs to communicate with the renderer process.

```typescript
// your-electron-app/src/main.ts
import { app, BrowserWindow } from "electron";
import {
  ApiKeyServiceMain,
  registerSecureApiKeyIpc,
} from "genai-key-storage-lite";

// ... other imports

app.whenReady().then(() => {
  // 1. Initialize the main service with the app's user data path.
  //    This is where encrypted keys will be stored on disk.
  const apiKeyService = new ApiKeyServiceMain(app.getPath("userData"));

  // 2. Register the IPC handlers that the renderer will call.
  registerSecureApiKeyIpc(apiKeyService);

  // If you have other main-process services that need to use API keys,
  // you can pass the apiKeyService instance to them.
  // const myLLMService = new LLMServiceMain(apiKeyService);

  createWindow();
  // ... rest of your app startup logic
});
```

### 2. Preload Script Setup (`preload.ts`)

The preload script acts as a secure bridge between the sandboxed renderer process and the Node.js environment of the main process.

```typescript
// your-electron-app/src/preload.ts
import { contextBridge } from "electron";
import { createApiKeyManagerBridge } from "genai-key-storage-lite/preload";

contextBridge.exposeInMainWorld("electronBridge", {
  // Expose the secure API key manager bridge under a namespace
  secureApiKeyManager: createApiKeyManagerBridge(),
  // ... you can expose other APIs here
});
```

To make TypeScript aware of the bridged API in your renderer code, create a type definition file (e.g., `src/renderer.d.ts`) and include it in your `tsconfig.json`:

```typescript
// your-electron-app/src/renderer.d.ts
import type { IApiKeyManagerBridge } from "genai-key-storage-lite/renderer";

declare global {
  interface Window {
    electronBridge: {
      secureApiKeyManager: IApiKeyManagerBridge;
    };
  }
}
```

### 3. Renderer Process Setup & Usage (e.g., in a React Component)

Finally, you can use the `ApiKeyServiceRenderer` in your UI. It must be instantiated with the bridge object you exposed in the preload script.

```typescript
// In a React component or service
import { ApiKeyServiceRenderer } from "genai-key-storage-lite/renderer";
import { ApiKeyStorageError } from "genai-key-storage-lite/common";
import type { ApiProvider } from "genai-key-storage-lite/common";
import React, { useState, useEffect } from "react";

// Instantiate the service by passing the bridged object from the window.
// It's best to do this once and share the instance (e.g., via React Context).
const apiKeyService = new ApiKeyServiceRenderer(
  window.electronBridge.secureApiKeyManager
);

const MySettingsComponent = () => {
  // Store a key
  const handleStoreKey = async (providerId: ApiProvider, key: string) => {
    // Client-side validation for instant feedback
    if (!apiKeyService.validateApiKeyFormat(providerId, key)) {
      alert("Invalid API key format!");
      return;
    }

    try {
      await apiKeyService.storeKey(providerId, key);
      alert(`${providerId} key stored successfully.`);
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        alert(`Failed to store key: ${error.message} (${error.code})`);
      } else {
        alert(`Failed to store key: ${error.message}`);
      }
    }
  };

  // Get display information for a key (does not return the key itself)
  const checkKeyStatus = async (providerId: ApiProvider) => {
    try {
      const displayInfo = await apiKeyService.getApiKeyDisplayInfo(providerId);
      if (displayInfo.isStored) {
        console.log(
          `${providerId} key is stored. Last four chars:`,
          displayInfo.lastFourChars || "N/A"
        );
      } else {
        console.log(`${providerId} key is not stored.`);
      }
    } catch (error) {
      console.error("Failed to get key display info:", error.message);
    }
  };

  // Get all supported provider IDs for UI dropdowns etc.
  const availableProviders = apiKeyService.getAvailableProviders();
};
```

## Advanced Usage

### Using Keys in the Main Process (`withDecryptedKey`)

For scenarios where another main process module in your application needs to use an API key directly (e.g., to interact with a provider's SDK), `ApiKeyServiceMain` provides a secure method `withDecryptedKey`.

This method decrypts the key on-demand and provides it to a callback function, ensuring the plaintext key's scope is strictly limited.

```typescript
// Example usage within another main process service:
// Assume 'apiKeyServiceMain' is the instance of ApiKeyServiceMain from step 1.

async function performLLMOperation(
  providerId: ApiProvider,
  prompt: string
): Promise<string> {
  return apiKeyServiceMain.withDecryptedKey(providerId, async (apiKey) => {
    // Here, 'apiKey' is the plaintext API key for the specified provider.
    // Use it with the provider's SDK directly.
    // const anthropicClient = new Anthropic({ apiKey });
    // const response = await anthropicClient.messages.create({ /* ... */ });
    // return response.content[0].text;

    // Placeholder implementation:
    console.log(
      `Processing "${prompt}" with ${providerId} key ending in ${apiKey.slice(
        -4
      )}`
    );
    return `Processed: ${prompt}`;
  });
}

// Call your function
try {
  const result = await performLLMOperation("anthropic", "Hello, world!");
  console.log("LLM response:", result);
} catch (error) {
  console.error("LLM operation failed:", error.message);
}
```

**Key features of `withDecryptedKey`:**

- **Callback Pattern**: Takes a `providerId` and an asynchronous callback function that receives the decrypted API key.
- **On-Demand Decryption**: The API key is decrypted only when needed.
- **Transient Access**: The plaintext key is **never** cached by `ApiKeyServiceMain`. Its scope is limited to the callback's execution.
- **Main Process Only**: This method is for use **only within Electron's main process**. The key is never sent to the renderer.

<details>
<summary><b>Module Architecture</b></summary>

The module is divided into three main parts, following Electron's process model:

1.  **`src/common/`**: Contains code shared between the main and renderer processes.

    - `types.ts`: Defines core types like `ApiProvider`, IPC channel names, and payload structures.
    - `errors.ts`: Defines `ApiKeyStorageError` for consistent error handling.
    - `providers/`: Contains the `IApiProviderValidator` interface and implementations for specific services (e.g., `OpenAIProvider.ts`). The `ProviderService` manages these validators.

2.  **`src/main/`**: Contains the core logic that runs in Electron's main process.

    - `ApiKeyServiceMain.ts`: The heart of the secure storage system. It handles encryption/decryption using `electron.safeStorage`, persistence of encrypted keys to disk, and format validation.
    - `ipc.ts`: Exports a function `registerSecureApiKeyIpc` that sets up all the IPC handlers to connect the main service with the renderer.

3.  **`src/renderer/`**: Contains the client-side service used by UI components.

    - `ApiKeyServiceRenderer.ts`: Provides a clean, typed API for the UI to interact with the secure storage system via the preload bridge. It does **not** handle plaintext keys directly.

4.  **`src/preload/`**: Contains the bridge logic.
    - `index.ts`: Exports a function `createApiKeyManagerBridge` that creates the object to be exposed to the renderer process via `contextBridge`.

</details>

## Contributing a New API Provider

This package includes validators for several common AI providers. If you wish to add support for a new provider, you'll need to contribute to the package itself. Here's how:

1.  **Define Provider Type**: Add the new provider ID (e.g., `'mynewai'`) to the `ApiProvider` union type in `src/common/types.ts`.

2.  **Create Provider Validator**: Create a new file, e.g., `src/common/providers/MyNewAIProvider.ts`, that implements the `IApiProviderValidator` interface.

    ```typescript
    import { IApiProviderValidator } from "./ProviderInterface";
    import { ApiProvider } from "../types";

    export class MyNewAIProvider implements IApiProviderValidator {
      readonly providerId: ApiProvider = "mynewai";

      // Example: API keys for 'mynewai' must start with 'mna_'
      private readonly validationPattern = /^mna_[a-zA-Z0-9]{16}$/;

      validateApiKey(apiKey: string): boolean {
        return this.validationPattern.test(apiKey);
      }
    }
    ```

3.  **Register Provider**:

    - Export your new provider class in `src/common/providers/index.ts`.
    - In `src/common/providers/ProviderService.ts`, import your new provider and register it within the `registerBuiltInProviders` method.

    ```typescript
    // In ProviderService.ts
    import { MyNewAIProvider } from "./MyNewAIProvider"; // Add import

    // ... inside registerBuiltInProviders method ...
    this.registerProvider(new MyNewAIProvider()); // Add this line
    ```

After making these changes, please submit a pull request to the project repository.

## Security Considerations

- Plaintext API keys are only held in the memory of the main process **transiently** when they are decrypted on-demand for immediate use. They are **not cached** in plaintext.
- The renderer process **never** receives plaintext API keys from storage.
- `safeStorage` relies on OS-level encryption (e.g., Keychain on macOS, Credential Vault on Windows). The security of the stored keys is tied to the security of the user's OS account.
- Encrypted keys are stored on disk in the application's user data directory. Ensure this location is properly secured by OS file permissions.

## License

The code is released under the [MIT license](LICENSE).

