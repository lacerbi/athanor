### **Project Goal: Create the Standalone `genai-lite` Package**

Our goal is to create a powerful, reusable Node.js library called **`genai-lite`**. This library will provide a simple and consistent way to interact with various Generative AI models. The first version will focus on Large Language Models (LLMs), but we will design it so that we can easily add support for other models—like image generation—in the future.

The primary task is to extract the existing LLM code from our existing Electron application (called "Athanor") and remove its dependency on Electron-specific features, particularly the way it handles API key storage.

---

### **Phase 1: Create and Structure the New Package**

We'll start by setting up the new project and organizing the code for future growth.

**Step 1.1: Set Up the Project Directory**

Create a new folder for our package (completely separate from the Athanor project).

```bash
mkdir genai-lite
cd genai-lite
npm init -y
```

Next, create a `tsconfig.json` file. This is a standard configuration for a modern Node.js library written in TypeScript.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Finally, create our source directory: `mkdir src`.

**Step 1.2: Copy and Restructure the Source Files**

To keep our code organized for future features, we will place all the LLM-related logic into its own dedicated folder.

1.  In the new `genai-lite` project, create a new directory: `mkdir src/llm`.
2.  From the Athanor project, copy the contents of `electron/modules/llm/common/` into your new `genai-lite/src/llm/` folder.
3.  From the Athanor project, copy the contents of `electron/modules/llm/main/` into your new `genai-lite/src/llm/` folder as well.

Your new project structure should now look like this, with all the original code nested inside `src/llm/`:

```
genai-lite/
├── src/
│   └── llm/
│       ├── clients/
│       ├── common/  <-- You can merge this into the main llm folder
│       └── main/    <-- And merge this too
├── package.json
└── tsconfig.json
```

**Clean up the structure:** Move the files from `src/llm/common/` and `src/llm/main/` directly into `src/llm/`, then delete the now-empty `common` and `main` subfolders.

**Step 1.3: Update Dependencies**

Edit your new `genai-lite/package.json` file. Change the name to `genai-lite` and add the necessary dependencies for the LLM features.

```json
// package.json
{
  "name": "genai-lite",
  "version": "1.0.0",
  "description": "A lightweight, portable toolkit for interacting with various Generative AI APIs.",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "@google/genai": "^1.0.1",
    "openai": "^4.103.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "typescript": "^5.3.3"
  }
}
```

Run `npm install` in the `genai-lite` directory to download these packages.

---

### **Phase 2: Refactor for Portability and Extensibility**

Here, we'll make the code truly independent.

**Step 2.1: Create a Central `ApiKeyProvider` Type**

The key to our new design is a generic function that can fetch an API key. This allows the library to not care _how_ the key is stored. Create a new file `src/types.ts` (at the top level of `src/`) for this central type definition.

```typescript
// src/types.ts
export type ApiKeyProvider = (providerId: string) => Promise<string | null>;
```

**Step 2.2: Refactor the `LLMService`**

1.  Rename `src/llm/LLMServiceMain.ts` to `src/llm/LLMService.ts`.
2.  Open the newly renamed `LLMService.ts` and apply these changes:
    - **Remove Electron code:** Delete any `import` statements related to `genai-key-storage-lite`.
    - **Import the new type:** At the top, add `import type { ApiKeyProvider } from '../types';`.
    - **Update the constructor:** Change the constructor to accept our new `ApiKeyProvider` function.
    - **Update `sendMessage`:** Modify the `sendMessage` method to use the `getApiKey` function to retrieve the key before making an API call.

Here are the specific parts of `src/llm/LLMService.ts` to change:

```typescript
// src/llm/LLMService.ts

import type { ApiKeyProvider } from '../types'; // New import
// ... other imports

export class LLMService {
  private getApiKey: ApiKeyProvider; // Changed
  private clientAdapters: Map<ApiProviderId, ILLMClientAdapter>;

  constructor(getApiKey: ApiKeyProvider) {
    // Changed
    this.getApiKey = getApiKey; // Changed
    this.clientAdapters = new Map();
    // ... the rest of the constructor that registers adapters is unchanged
  }

  // ... (getProviders, getModels, etc. methods are unchanged)

  async sendMessage(
    request: LLMChatRequest
  ): Promise<LLMResponse | LLMFailureResponse> {
    // ... all of the initial request validation logic is unchanged ...

    try {
      // This is the new, portable way to fetch the key
      const apiKey = await this.getApiKey(request.providerId);
      if (!apiKey) {
        throw new Error(
          `API key for provider '${request.providerId}' could not be retrieved.`
        );
      }

      const clientAdapter = this.getClientAdapter(request.providerId);
      // We pass the fetched key to the specific client adapter
      return clientAdapter.sendMessage(internalRequest, apiKey);
    } catch (error) {
      // ... the main error handling block is unchanged ...
      console.error('Error in LLMService.sendMessage:', error);
      return {
        /* return a standard failure response object */
      };
    }
  }
}
```

**Step 2.3: Create the Main `index.ts` Entrypoint**

Create `src/index.ts` to serve as the public API for our `genai-lite` package. It will export everything a user needs to get started.

```typescript
// src/index.ts

// --- Core Types ---
export type { ApiKeyProvider } from './types';

// --- LLM Service ---
export { LLMService } from './llm/LLMService';
export * from './llm/common/types'; // Export all LLM request/response types
```

You now have a fully self-contained and portable module for LLM interactions. Run `npm run build` from the root of `genai-lite` to compile the TypeScript into JavaScript in the `dist` folder.

---

### **Phase 3: Provide Standard Key Providers and Documentation**

To make the library exceptionally easy to use, we'll include some pre-built `ApiKeyProvider` functions and write a clear `README.md`.

**Step 3.1: Create Standard Providers**

Create a new top-level directory: `mkdir src/providers`. Inside, create a file named `fromEnvironment.ts`.

```typescript
// src/providers/fromEnvironment.ts
import type { ApiKeyProvider } from '../types';

/**
 * Creates an ApiKeyProvider that sources keys from system environment variables.
 * It looks for variables in the format: PROVIDERID_API_KEY (e.g., OPENAI_API_KEY).
 * This is a secure and standard practice for server-side applications.
 */
export const fromEnvironment: ApiKeyProvider = async (providerId: string) => {
  const envVarName = `${providerId.toUpperCase()}_API_KEY`;
  return process.env[envVarName] || null;
};
```

Now, update `src/index.ts` to export this handy provider function:

```typescript
// src/index.ts
// ... (other exports)

// --- API Key Providers ---
export { fromEnvironment } from './providers/fromEnvironment';
```

**Step 3.2: Write the `README.md` File**

Create a `README.md` file in the root of the `genai-lite` project. This is the most important step for making your library usable.

- **Introduction:** Explain that `genai-lite` is a library for simplifying interactions with Generative AI APIs. State that the first version focuses on LLMs but is designed for future expansion.

- **Installation:** Include the `npm install genai-lite` command.

- **Basic Usage:** Show a simple, complete example using the `fromEnvironment` provider.

  ```markdown
  import { LLMService, fromEnvironment } from 'genai-lite';

  // The library is initialized with a function that provides API keys.
  // 'fromEnvironment' is a built-in helper for this.
  const llmService = new LLMService(fromEnvironment);

  async function main() {
  const response = await llmService.sendMessage({
  providerId: 'openai',
  modelId: 'gpt-4.1-mini',
  messages: [{ role: 'user', content: 'What is the capital of Italy?' }],
  });
  console.log(response);
  }
  ```

- **Usage in an Electron App:** Provide a clear, copy-pasteable example showing how to create a custom provider that integrates with `genai-key-storage-lite`. This is the solution to our original problem.

  ```markdown
  // In your Electron app's main.ts
  import { app } from 'electron';
  import { ApiKeyServiceMain } from 'genai-key-storage-lite';
  import { LLMService, ApiKeyProvider } from 'genai-lite';

  // 1. Initialize Electron's secure key storage service
  const apiKeyService = new ApiKeyServiceMain(app.getPath("userData"));

  // 2. Create a custom ApiKeyProvider that uses the secure storage
  const getApiKeyFromElectron: ApiKeyProvider = async (providerId) => {
  try {
  return await apiKeyService.withDecryptedKey(providerId, async (key) => key);
  } catch {
  // Key not found or another error occurred
  return null;
  }
  };

  // 3. Initialize the genai-lite service with our custom provider
  const llmService = new LLMService(getApiKeyFromElectron);
  ```

---

### **Phase 4: Integrate `genai-lite` Back into Athanor**

The final step is to update the original Athanor application to use our new, powerful library.

1.  **Delete Old Code:** In the Athanor project, delete the entire `electron/modules/llm` directory.
2.  **Add Local Dependency:** In Athanor's root `package.json`, add a "local file" dependency that points to your new package. This allows you to test without publishing to npm.
    ```json
    "dependencies": {
      "genai-lite": "file:../genai-lite",
      // ... other Athanor dependencies
    }
    ```
    Then, run `npm install` inside the Athanor project directory.
3.  **Update `electron/main.ts`:** Refactor the main Athanor file to import and initialize `LLMService` from `genai-lite`, using the exact pattern described in the new README.
4.  **Update `electron/handlers/llmIpc.ts`:** The IPC handler will no longer import from a local module. It will import `llmService` from `main.ts` and call its methods. The internal logic of the IPC handler functions will remain almost identical.

By following these steps, you will have successfully created a clean, portable, and extensible generative AI library, significantly improving the architecture and reusability of the original code.

---

# genai-lite

A lightweight, portable Node.js/TypeScript library providing a unified interface for interacting with multiple Generative AI providers (OpenAI, Anthropic, Google Gemini, Mistral, and more).

## Features

- 🔌 **Unified API** - Single interface for multiple AI providers
- 🔐 **Flexible API Key Management** - Bring your own key storage solution
- 📦 **Zero Electron Dependencies** - Works in any Node.js environment
- 🎯 **TypeScript First** - Full type safety and IntelliSense support
- ⚡ **Lightweight** - Minimal dependencies, focused functionality
- 🛡️ **Provider Normalization** - Consistent responses across different AI APIs

## Installation

```bash
npm install genai-lite
```

## Quick Start

```typescript
import { LLMService, fromEnvironment } from 'genai-lite';

// Create service with environment variable API key provider
const llmService = new LLMService(fromEnvironment);

// Send a message to OpenAI
const response = await llmService.sendMessage({
  providerId: 'openai',
  modelId: 'gpt-4.1-mini',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, how are you?' },
  ],
});

if (response.object === 'chat.completion') {
  console.log(response.choices[0].message.content);
} else {
  console.error('Error:', response.error.message);
}
```

## API Key Management

genai-lite uses a flexible API key provider pattern. You can use the built-in environment variable provider or create your own:

### Environment Variables (Built-in)

```typescript
import { fromEnvironment } from 'genai-lite';

// Expects environment variables like:
// OPENAI_API_KEY=sk-...
// ANTHROPIC_API_KEY=sk-ant-...
// GEMINI_API_KEY=...

const llmService = new LLMService(fromEnvironment);
```

### Custom API Key Provider

```typescript
import { ApiKeyProvider, LLMService } from 'genai-lite';

// Create your own provider
const myKeyProvider: ApiKeyProvider = async (providerId: string) => {
  // Fetch from your secure storage, vault, etc.
  const key = await mySecureStorage.getKey(providerId);
  return key || null;
};

const llmService = new LLMService(myKeyProvider);
```

## Supported Providers & Models

**Note:** Model IDs include version dates for precise model selection. Always use the exact model ID as shown below.

### Anthropic (Claude)

- **Claude 4** (Latest generation):
  - `claude-sonnet-4-20250514` - Balanced performance model
  - `claude-opus-4-20250514` - Most powerful for complex tasks
- **Claude 3.7**: `claude-3-7-sonnet-20250219` - Advanced reasoning
- **Claude 3.5**:
  - `claude-3-5-sonnet-20241022` - Best balance of speed and intelligence
  - `claude-3-5-haiku-20241022` - Fast and cost-effective

### Google Gemini

- **Gemini 2.5** (Latest generation):
  - `gemini-2.5-pro` - Most advanced multimodal capabilities
  - `gemini-2.5-flash` - Fast with large context window
  - `gemini-2.5-flash-lite-preview-06-17` - Most cost-effective
- **Gemini 2.0**:
  - `gemini-2.0-flash` - High performance multimodal
  - `gemini-2.0-flash-lite` - Lightweight version

### OpenAI

- **o4 series**: `o4-mini` - Advanced reasoning model
- **GPT-4.1 series**:
  - `gpt-4.1` - Latest GPT-4 with enhanced capabilities
  - `gpt-4.1-mini` - Cost-effective for most tasks
  - `gpt-4.1-nano` - Ultra-efficient version

### Mistral

> **Note:** The official Mistral adapter is under development. Requests made to Mistral models will currently be handled by a mock adapter for API compatibility testing.

- `codestral-2501` - Specialized for code generation
- `devstral-small-2505` - Compact development-focused model

## Advanced Usage

### Custom Settings

```typescript
const response = await llmService.sendMessage({
  providerId: 'anthropic',
  modelId: 'claude-3-5-haiku-20241022',
  messages: [{ role: 'user', content: 'Write a haiku' }],
  settings: {
    temperature: 0.7,
    maxTokens: 100,
    topP: 0.9,
    stopSequences: ['\n\n'],
  },
});
```

### Provider Information

```typescript
// Get list of supported providers
const providers = await llmService.getProviders();

// Get models for a specific provider
const models = await llmService.getModels('anthropic');
```

### Error Handling

```typescript
const response = await llmService.sendMessage({
  providerId: 'openai',
  modelId: 'gpt-4.1-mini',
  messages: [{ role: 'user', content: 'Hello' }],
});

if (response.object === 'error') {
  switch (response.error.type) {
    case 'authentication_error':
      console.error('Invalid API key');
      break;
    case 'rate_limit_error':
      console.error('Rate limit exceeded');
      break;
    case 'validation_error':
      console.error('Invalid request:', response.error.message);
      break;
    default:
      console.error('Error:', response.error.message);
  }
}
```

## Using with Electron

`genai-lite` is designed to work seamlessly within an Electron application's main process, especially when paired with a secure storage solution like `genai-key-storage-lite`.

This is the recommended pattern for both new Electron apps and for migrating from older, integrated versions.

### Example with `genai-key-storage-lite`

Here’s how to create a custom `ApiKeyProvider` that uses `genai-key-storage-lite` to securely retrieve API keys.

```typescript
// In your Electron app's main process (e.g., main.ts)
import { app } from 'electron';
import { ApiKeyServiceMain } from 'genai-key-storage-lite';
import { LLMService, type ApiKeyProvider } from 'genai-lite';

// 1. Initialize Electron's secure key storage service
const apiKeyService = new ApiKeyServiceMain(app.getPath('userData'));

// 2. Create a custom ApiKeyProvider that uses the secure storage
const electronKeyProvider: ApiKeyProvider = async (providerId) => {
  try {
    // Use withDecryptedKey to securely access the key only when needed.
    // The key is passed to the callback and its result is returned.
    return await apiKeyService.withDecryptedKey(providerId, async (key) => key);
  } catch {
    // If key is not found or decryption fails, return null.
    // LLMService will handle this as an authentication error.
    return null;
  }
};

// 3. Initialize the genai-lite service with our custom provider
const llmService = new LLMService(electronKeyProvider);

// Now you can use llmService anywhere in your main process.
```

## TypeScript Support

genai-lite is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  LLMChatRequest,
  LLMResponse,
  LLMFailureResponse,
  LLMSettings,
  ApiKeyProvider,
} from 'genai-lite';
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests (when available)
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

Originally developed as part of the Athanor project, genai-lite has been extracted and made standalone to benefit the wider developer community.
