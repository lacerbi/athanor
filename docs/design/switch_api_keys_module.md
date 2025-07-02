### **Part 1: The Goal & High-Level Concept**

Our goal is to create a new, reusable npm package named `genai-key-storage-lite`. This package will have one job: to securely store and manage API keys within any Electron application.

It will use the host operating system's native credential storage (like macOS Keychain or Windows Credential Vault) via Electron's `safeStorage` API. This means it will be an **Electron-specific module**; it will not work in a standard Node.js or web browser environment.

The package will provide three distinct parts for the three parts of an Electron app:

1.  **Main Process Logic**: The core service that handles encryption and file I/O.
2.  **Renderer Process Logic**: A client-side "accessor" for the UI to safely interact with the main service.
3.  **Preload Script Logic**: The secure "bridge" that connects the renderer and the main process.

#### Porting from Athanor

We will start from a module of an existing project, "Athanor". This module, which was part of Athanor, already contains most of the features we want in `genai-key-storage-lite`. Our goal is to make the package entirely standalone.

---

### **Part 2: New Package Directory Structure**

First, we will create a new, empty directory for our package. Inside, we'll create a `src` folder to hold the code we copy from Athanor. After we're done, the structure of `genai-key-storage-lite` will look like this:

```
genai-key-storage-lite/
├── dist/                     # (Output of the build process, not created manually)
├── src/
│   ├── main/
│   │   ├── ApiKeyServiceMain.ts
│   │   └── ipc.ts
│   ├── renderer/
│   │   └── ApiKeyServiceRenderer.ts
│   ├── preload/
│   │   └── index.ts
│   └── common/
│       ├── providers/
│       │   ├── AnthropicProvider.ts
│       │   ├── GeminiProvider.ts
│       │   ├── index.ts
│       │   ├── MistralProvider.ts
│       │   ├── OpenAIProvider.ts
│       │   ├── ProviderInterface.ts
│       │   └── ProviderService.ts
│       ├── errors.ts
│       ├── index.ts
│       └── types.ts
├── package.json
└── tsconfig.json
```

---

### **Part 3: Source Files to Copy from Athanor**

We will copy the entire `secure-api-storage` module and its corresponding IPC handler from the Athanor project into our new package's `src` directory.

Here is the exact list of files to copy:

1.  **Copy the entire `common` directory:**
    - `electron/modules/secure-api-storage/common/` -\> `genai-key-storage-lite/src/common/`

2.  **Copy the `main` service file:**
    - `electron/modules/secure-api-storage/main/ApiKeyServiceMain.ts` -\> `genai-key-storage-lite/src/main/ApiKeyServiceMain.ts`

3.  **Copy the `renderer` service file:**
    - `electron/modules/secure-api-storage/renderer/ApiKeyServiceRenderer.ts` -\> `genai-key-storage-lite/src/renderer/ApiKeyServiceRenderer.ts`

4.  **Copy the IPC handler file:**
    - `electron/handlers/secureApiKeyIpc.ts` -\> `genai-key-storage-lite/src/main/ipc.ts` _(Note the new location and name)_

---

### **Part 4: Step-by-Step File Modifications**

Now, we will edit the files we just copied to make them work as a standalone package.

#### **Step 4.1: Modify `src/main/ApiKeyServiceMain.ts`**

This file requires very few changes. We just need to adjust its import paths to be local to the new package.

- **Change this line:**
  ```typescript
  import { ApiProvider, ApiKeyStorageError, ProviderService } from '../common';
  ```
- **To this:**
  ```typescript
  import { ApiProvider, ApiKeyStorageError, ProviderService } from '../common';
  ```
  _(Self-correction: The path is already correct relative to its new location inside `src/main/`. No change is actually needed here.)_

This file is essentially ready to go. Its dependencies (`electron`, `fs`, `path`) are core to Node/Electron and will be handled by `peerDependencies` in our `package.json`.

#### **Step 4.2: Modify `src/main/ipc.ts` (formerly `secureApiKeyIpc.ts`)**

This file needs to be refactored from a self-executing function into an exported, pluggable function that any Electron app can use.

- **Original File (`electron/handlers/secureApiKeyIpc.ts`):**

  ```typescript
  import { ipcMain } from 'electron';
  import { ApiKeyServiceMain } from '../modules/secure-api-storage/main';
  // ...

  export function registerSecureApiKeyIpc(apiKeyService: ApiKeyServiceMain) {
    // ... ipcMain.handle calls ...
  }
  ```

- **New File (`src/main/ipc.ts`):** The code is already in an exported function, which is great. We just need to adjust the import paths.

  ```typescript
  // src/main/ipc.ts

  import { ipcMain } from 'electron';
  import type { ApiKeyServiceMain } from './ApiKeyServiceMain'; // Adjusted path
  import {
    IPCChannelNames,
    StoreApiKeyPayload,
    ApiKeyStorageError,
  } from '../common/types'; // Adjusted path

  /**
   * Registers IPC handlers for secure API key operations.
   * This function should be called in the main process of an Electron app.
   *
   * @param apiKeyService An instance of ApiKeyServiceMain.
   */
  export function registerSecureApiKeyIpc(
    apiKeyService: ApiKeyServiceMain
  ): void {
    // ... (The rest of the file content remains the same) ...
  }
  ```

#### **Step 4.3: Create `src/preload/index.ts`**

This is a new file. Its purpose is to contain the logic that Athanor currently has in its `preload.ts` for exposing the API key manager. We will create a clean, exported function to do this.

- **Create a new file `genai-key-storage-lite/src/preload/index.ts` and add this content:**

  ```typescript
  // src/preload/index.ts

  import { ipcRenderer } from 'electron';
  import { IPCChannelNames } from '../common/types';

  /**
   * Creates a bridge object for the secure API key manager.
   * This function should be called in a preload script, and its return
   * value exposed on the window object via contextBridge.
   */
  export function createApiKeyManagerBridge() {
    return {
      storeKey: (providerId: string, apiKey: string) =>
        ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_STORE, {
          providerId,
          apiKey,
        }),

      deleteKey: (providerId: string) =>
        ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_DELETE, providerId),

      isKeyStored: (providerId: string) =>
        ipcRenderer.invoke(
          IPCChannelNames.SECURE_API_KEY_IS_STORED,
          providerId
        ),

      getStoredProviderIds: () =>
        ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS),

      getApiKeyDisplayInfo: (providerId: string) =>
        ipcRenderer.invoke(
          IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO,
          providerId
        ),
    };
  }
  ```

#### **Step 4.4: Modify `src/renderer/ApiKeyServiceRenderer.ts`**

This file needs a small but important change to decouple it from Athanor's specific `window.electronBridge` global object. We will modify its constructor to accept the bridge object as an argument.

- **Original File (`electron/modules/secure-api-storage/renderer/ApiKeyServiceRenderer.ts`):**

  ```typescript
  // ...
  export class ApiKeyServiceRenderer {
    // ...
    private bridge: typeof window.electronBridge.secureApiKeyManager;

    constructor() {
      // ...
      if (!window.electronBridge?.secureApiKeyManager) {
        // ... error
      }
      this.bridge = window.electronBridge.secureApiKeyManager;
    }
    // ...
  }
  ```

- **New File (`src/renderer/ApiKeyServiceRenderer.ts`):**

  ```typescript
  // src/renderer/ApiKeyServiceRenderer.ts

  import { ApiProvider, ApiKeyStorageError, ProviderService } from '../common';

  // Define an interface for the bridge to ensure type safety
  export interface IApiKeyManagerBridge {
    storeKey(providerId: string, apiKey: string): Promise<{ success: boolean }>;
    deleteKey(providerId: string): Promise<{ success: boolean }>;
    isKeyStored(providerId: string): Promise<boolean>;
    getStoredProviderIds(): Promise<ApiProvider[]>;
    getApiKeyDisplayInfo(
      providerId: string
    ): Promise<{ isStored: boolean; lastFourChars?: string }>;
  }

  export class ApiKeyServiceRenderer {
    private providerService: ProviderService;
    private bridge: IApiKeyManagerBridge;

    /**
     * Creates a new ApiKeyServiceRenderer instance.
     * @param bridge The API key manager bridge object exposed from the preload script.
     * @throws ApiKeyStorageError if the bridge is not provided.
     */
    constructor(bridge: IApiKeyManagerBridge) {
      this.providerService = new ProviderService();

      if (!bridge) {
        throw new ApiKeyStorageError(
          'Secure API key bridge is not available. Ensure it is passed to the constructor.'
        );
      }

      this.bridge = bridge;
    }

    // ... (The rest of the file content remains the same) ...
  }
  ```

---

### **Part 5: Creating the `package.json`**

This file defines our new module. Create `genai-key-storage-lite/package.json` with the following content. The `exports` field is critical for allowing users to import from `genai-key-storage-lite/renderer` and `genai-key-storage-lite/preload`.

```json
{
  "name": "genai-key-storage-lite",
  "version": "0.1.0",
  "description": "A secure API key storage module for Electron applications using native OS credential stores.",
  "main": "./dist/main/index.js",
  "types": "./dist/main/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/main/index.js",
      "types": "./dist/main/index.d.ts"
    },
    "./renderer": {
      "import": "./dist/renderer/index.js",
      "types": "./dist/renderer/index.d.ts"
    },
    "./preload": {
      "import": "./dist/preload/index.js",
      "types": "./dist/preload/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "electron": "^25.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "electron": "^25.0.0",
    "typescript": "^5.0.0"
  }
}
```

You will also need a `tsconfig.json` to compile the TypeScript.

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

After creating these files, you would run `npm install` and then `npm run build` from within the `genai-key-storage-lite` directory to generate the `dist` folder.

---

### **Part 6: How Athanor Will Use the New Package**

After publishing the package (or linking it locally), Athanor's code would be simplified.

1.  **Delete the old files:**
    - `electron/modules/secure-api-storage/`
    - `electron/handlers/secureApiKeyIpc.ts`

2.  **Add the new dependency to Athanor's `package.json`:**
    - `"genai-key-storage-lite": "^0.1.1"`

3.  **Modify Athanor's `electron/main.ts`:**

    ```typescript
    // electron/main.ts
    import {
      ApiKeyServiceMain,
      registerSecureApiKeyIpc,
    } from 'genai-key-storage-lite';
    // ...

    app.whenReady().then(async () => {
      // Initialize the service from the new package
      const apiKeyService = new ApiKeyServiceMain(app.getPath('userData'));

      // The LLMService would also need to be initialized here
      const llmService = new LLMServiceMain(apiKeyService);

      // Register IPC handlers from the new package
      registerSecureApiKeyIpc(apiKeyService);

      // The old setupIpcHandlers call would no longer pass the apiKeyService
      // or register the handlers itself.
      // ...
    });
    ```

4.  **Modify Athanor's `electron/preload.ts`:**

    ```typescript
    // electron/preload.ts
    import { contextBridge, ipcRenderer } from 'electron';
    import { createApiKeyManagerBridge } from 'genai-key-storage-lite/preload';

    contextBridge.exposeInMainWorld('electronBridge', {
      // Call the function from our new package to create the bridge object
      secureApiKeyManager: createApiKeyManagerBridge(),
      // ... other Athanor-specific bridges (llmService, etc.)
    });
    ```

5.  **Modify Athanor's `src/components/ApiKeyManagementPane.tsx`:**

    ```typescript
    // src/components/ApiKeyManagementPane.tsx
    import { ApiKeyServiceRenderer } from 'genai-key-storage-lite/renderer';
    // ...

    const ApiKeyManagementPane: React.FC = () => {
      const [apiKeyService, setApiKeyService] =
        useState<ApiKeyServiceRenderer | null>(null);

      useEffect(() => {
        try {
          // Pass the bridged object to the constructor
          const service = new ApiKeyServiceRenderer(
            window.electronBridge.secureApiKeyManager
          );
          setApiKeyService(service);
        } catch (error) {
          console.error('Failed to initialize ApiKeyServiceRenderer:', error);
        }
      }, []);

      // ... rest of the component logic remains the same
    };
    ```

This completes the extraction. The Athanor codebase becomes cleaner, and you now have a reusable, standalone package for handling secure API key storage in any Electron project.

---

# README.md

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

## How to Use

Integrating the module into your Electron application involves three steps.

### 1. Main Process Setup (`main.ts`)

In your main Electron process file, initialize `ApiKeyServiceMain` and register the IPC handlers it needs to communicate with the renderer process.

```typescript
// your-electron-app/src/main.ts
import { app, BrowserWindow } from 'electron';
import {
  ApiKeyServiceMain,
  registerSecureApiKeyIpc,
} from 'genai-key-storage-lite';

// ... other imports

app.whenReady().then(() => {
  // 1. Initialize the main service with the app's user data path.
  //    This is where encrypted keys will be stored on disk.
  const apiKeyService = new ApiKeyServiceMain(app.getPath('userData'));

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
import { contextBridge } from 'electron';
import { createApiKeyManagerBridge } from 'genai-key-storage-lite/preload';

contextBridge.exposeInMainWorld('electronBridge', {
  // Expose the secure API key manager bridge under a namespace
  secureApiKeyManager: createApiKeyManagerBridge(),
  // ... you can expose other APIs here
});
```

To make TypeScript aware of the bridged API in your renderer code, create a type definition file (e.g., `src/renderer.d.ts`) and include it in your `tsconfig.json`:

```typescript
// your-electron-app/src/renderer.d.ts
import type { IApiKeyManagerBridge } from 'genai-key-storage-lite/renderer';

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
import { ApiKeyServiceRenderer } from 'genai-key-storage-lite/renderer';
import type { ApiProvider } from 'genai-key-storage-lite'; // Common types are exported from the root
import React, { useState, useEffect } from 'react';

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
      alert('Invalid API key format!');
      return;
    }

    try {
      await apiKeyService.storeKey(providerId, key);
      alert(`${providerId} key stored successfully.`);
    } catch (error) {
      alert(`Failed to store key: ${error.message}`);
    }
  };

  // Get display information for a key (does not return the key itself)
  const checkKeyStatus = async (providerId: ApiProvider) => {
    try {
      const displayInfo = await apiKeyService.getApiKeyDisplayInfo(providerId);
      if (displayInfo.isStored) {
        console.log(
          `${providerId} key is stored. Last four chars:`,
          displayInfo.lastFourChars || 'N/A'
        );
      } else {
        console.log(`${providerId} key is not stored.`);
      }
    } catch (error) {
      console.error('Failed to get key display info:', error.message);
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
  const result = await performLLMOperation('anthropic', 'Hello, world!');
  console.log('LLM response:', result);
} catch (error) {
  console.error('LLM operation failed:', error.message);
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
    import { IApiProviderValidator } from './ProviderInterface';
    import { ApiProvider } from '../types';

    export class MyNewAIProvider implements IApiProviderValidator {
      readonly providerId: ApiProvider = 'mynewai';

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
    import { MyNewAIProvider } from './MyNewAIProvider'; // Add import

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
