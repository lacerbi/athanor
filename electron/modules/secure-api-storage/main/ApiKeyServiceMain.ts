// AI Summary: Main process service for secure API key storage using electron.safeStorage.
// Handles encryption, file persistence, metadata storage, and on-demand key decryption.
// Uses OS-level encryption through safeStorage with automatic metadata loading on startup.

import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ApiProvider, ApiKeyStorageError, ProviderService, InvokeApiCallPayload, InvokeApiCallResponse } from '../common';

/**
 * Metadata stored for each API key without the key itself
 */
interface ApiKeyMetadata {
  lastFourChars: string;
}

/**
 * Main process service for secure API key storage
 * 
 * This service handles all sensitive API key operations in the main process:
 * - Encrypts/decrypts keys using electron.safeStorage (OS-level encryption)
 * - Persists encrypted keys to disk as individual files
 * - Maintains only metadata in memory (no plaintext keys cached)
 * - Validates API key formats before storage
 * - Automatically loads key metadata on startup
 * - Provides on-demand decryption for API operations
 * 
 * Security features:
 * - Uses OS keychain/credential store through safeStorage
 * - No master password required - relies on OS authentication
 * - Plaintext keys never cached in memory
 * - Keys only decrypted on-demand for immediate use
 * - Each provider's key stored in separate encrypted file
 */
export class ApiKeyServiceMain {
  private loadedKeyMetadata: Map<ApiProvider, ApiKeyMetadata> = new Map();
  private storageDir: string;
  private providerService: ProviderService;

  /**
   * Creates a new ApiKeyServiceMain instance
   * 
   * @param userDataPath Path to user data directory (typically app.getPath('userData'))
   */
  constructor(userDataPath: string) {
    this.providerService = new ProviderService();
    this.storageDir = path.join(userDataPath, 'secure_api_keys');
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
    
    // Load metadata for all existing keys from disk
    this.loadAllKeysFromDisk().catch(error => {
      console.error('Failed to load API key metadata from disk:', error);
    });
  }

  /**
   * Stores an API key securely
   * 
   * @param providerId The provider to store the key for
   * @param apiKey The API key to store
   * @throws ApiKeyStorageError if validation fails or encryption is unavailable
   */
  async storeKey(providerId: ApiProvider, apiKey: string): Promise<void> {
    // Validate API key format
    if (!this.providerService.validateApiKey(providerId, apiKey)) {
      throw new ApiKeyStorageError(`Invalid API key format for provider: ${providerId}`);
    }

    // Check if encryption is available
    if (!safeStorage.isEncryptionAvailable()) {
      throw new ApiKeyStorageError('OS-level encryption is not available. Please ensure your system supports secure storage.');
    }

    try {
      // Extract last four characters for display purposes
      const lastFourChars = apiKey.slice(-4);
      
      // Encrypt the API key
      const encryptedBuffer = safeStorage.encryptString(apiKey);
      const encryptedKeyBase64 = encryptedBuffer.toString('base64');
      
      // Create data object to store
      const dataToStore = {
        encryptedKey: encryptedKeyBase64,
        lastFourChars: lastFourChars
      };
      
      // Save data to JSON file
      const filePath = this.getFilePath(providerId);
      await fs.promises.writeFile(filePath, JSON.stringify(dataToStore));
      
      // Update metadata in memory
      this.loadedKeyMetadata.set(providerId, { lastFourChars });
      
      console.log(`API key stored successfully for provider: ${providerId}`);
    } catch (error) {
      throw new ApiKeyStorageError(`Failed to store API key for ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves and decrypts an API key on-demand for internal use
   * 
   * This method is for internal use by the main process only.
   * It reads the encrypted key from disk, decrypts it, and returns it.
   * The decrypted key is not cached and should be used immediately.
   * 
   * @param providerId The provider to get the key for
   * @returns The decrypted API key or null if not found or decryption failed
   * @private
   */
  async _getDecryptedKey(providerId: ApiProvider): Promise<string | null> {
    try {
      const filePath = this.getFilePath(providerId);
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch {
        return null; // File doesn't exist
      }
      
      // Read and parse the JSON file
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      
      // Check if encrypted key exists in the JSON data
      if (!jsonData.encryptedKey) {
        console.warn(`No encrypted key found in file for provider: ${providerId}`);
        return null;
      }
      
      // Check if encryption is available
      if (!safeStorage.isEncryptionAvailable()) {
        console.error('OS-level encryption is not available for decryption');
        return null;
      }
      
      // Decode Base64 to buffer and decrypt
      const encryptedBuffer = Buffer.from(jsonData.encryptedKey, 'base64');
      const decryptedKey = safeStorage.decryptString(encryptedBuffer);
      
      // Validate the decrypted key
      if (!this.providerService.validateApiKey(providerId, decryptedKey)) {
        console.warn(`Invalid API key format found for provider: ${providerId}`);
        return null;
      }
      
      return decryptedKey;
    } catch (error) {
      console.error(`Failed to decrypt API key for provider ${providerId}:`, error);
      return null;
    }
  }

  /**
   * Deletes an API key
   * 
   * @param providerId The provider to delete the key for
   */
  async deleteKey(providerId: ApiProvider): Promise<void> {
    try {
      // Remove from metadata
      this.loadedKeyMetadata.delete(providerId);
      
      // Delete JSON file if it exists
      const filePath = this.getFilePath(providerId);
      try {
        await fs.promises.unlink(filePath);
        console.log(`API key file deleted for provider: ${providerId}`);
      } catch (error) {
        // File might not exist, which is fine
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`Failed to delete API key file for ${providerId}:`, error);
        }
      }
    } catch (error) {
      throw new ApiKeyStorageError(`Failed to delete API key for ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if an API key is stored for a provider
   * 
   * @param providerId The provider to check
   * @returns true if a key is stored, false otherwise
   */
  async isKeyStored(providerId: ApiProvider): Promise<boolean> {
    // Check metadata first (fastest)
    if (this.loadedKeyMetadata.has(providerId)) {
      return true;
    }

    // Check file existence as fallback
    try {
      const filePath = this.getFilePath(providerId);
      await fs.promises.access(filePath);
      
      // If file exists but metadata wasn't loaded, try to load it
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        if (jsonData.lastFourChars) {
          this.loadedKeyMetadata.set(providerId, { lastFourChars: jsonData.lastFourChars });
          return true;
        }
      } catch (parseError) {
        console.warn(`Failed to parse metadata for ${providerId}:`, parseError);
      }
      
      return true; // File exists even if we can't parse metadata
    } catch {
      return false;
    }
  }

  /**
   * Gets all provider IDs that have stored keys
   * 
   * @returns Array of provider IDs with stored keys
   */
  getStoredProviderIds(): ApiProvider[] {
    return Array.from(this.loadedKeyMetadata.keys());
  }

  /**
   * Loads metadata for all API keys from disk on startup
   * 
   * This method only loads metadata (like lastFourChars) without decrypting
   * the actual API keys, improving security and startup performance.
   * 
   * @private
   */
  private async loadAllKeysFromDisk(): Promise<void> {
    try {
      // Read all .json files in storage directory
      const files = await fs.promises.readdir(this.storageDir);
      const keyFiles = files.filter(file => file.endsWith('.json'));

      console.log(`Found ${keyFiles.length} encrypted API key files`);

      for (const keyFile of keyFiles) {
        const providerId = path.basename(keyFile, '.json') as ApiProvider;
        
        // Skip if not a valid provider
        if (!this.providerService.getProvider(providerId)) {
          console.warn(`Skipping unknown provider key file: ${keyFile}`);
          continue;
        }

        try {
          const filePath = path.join(this.storageDir, keyFile);
          const fileContent = await fs.promises.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          
          // Load metadata without decrypting the key
          if (jsonData.lastFourChars) {
            this.loadedKeyMetadata.set(providerId, { 
              lastFourChars: jsonData.lastFourChars 
            });
            console.log(`Loaded metadata for provider: ${providerId}`);
          } else {
            console.warn(`No metadata found in file for provider: ${providerId}`);
          }
        } catch (error) {
          console.error(`Failed to load metadata for provider ${providerId}:`, error);
          // Continue with other keys even if one fails
        }
      }

      console.log(`Successfully loaded metadata for ${this.loadedKeyMetadata.size} API keys`);
    } catch (error) {
      // If directory doesn't exist or other errors, just log and continue
      console.warn('Failed to load API key metadata from disk:', error);
    }
  }

  /**
   * Ensures the storage directory exists
   * 
   * @private
   */
  private ensureStorageDirectory(): void {
    try {
      fs.mkdirSync(this.storageDir, { recursive: true });
    } catch (error) {
      throw new ApiKeyStorageError(`Failed to create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets display information for an API key without decrypting the full key
   * 
   * @param providerId The provider to get display info for
   * @returns Object containing storage status and last four characters if stored
   */
  async getApiKeyDisplayInfo(providerId: ApiProvider): Promise<{ isStored: boolean, lastFourChars?: string }> {
    try {
      // Check metadata first
      const metadata = this.loadedKeyMetadata.get(providerId);
      if (metadata) {
        return {
          isStored: true,
          lastFourChars: metadata.lastFourChars
        };
      }

      // Fallback to reading file if metadata not in memory
      const filePath = this.getFilePath(providerId);
      
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        
        if (jsonData.lastFourChars) {
          // Update metadata for future calls
          this.loadedKeyMetadata.set(providerId, { 
            lastFourChars: jsonData.lastFourChars 
          });
          
          return {
            isStored: true,
            lastFourChars: jsonData.lastFourChars
          };
        } else {
          // File exists but no lastFourChars field
          return { isStored: false };
        }
      } catch (error) {
        // File doesn't exist or can't be parsed
        return { isStored: false };
      }
    } catch (error) {
      throw new ApiKeyStorageError(`Failed to get display info for API key ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invokes an API call using the stored API key for the specified provider
   * 
   * This method handles the secure API call flow:
   * 1. Retrieves and decrypts the API key on-demand
   * 2. Makes the HTTP request (currently mocked for testing)
   * 3. Returns only the API response without exposing the key
   * 
   * @param payload The API call payload containing provider, path, method, and body
   * @returns Promise resolving to the API response or error
   */
  async invokeApiCall(payload: InvokeApiCallPayload): Promise<InvokeApiCallResponse> {
    try {
      // Decrypt the API key on-demand
      const decryptedKey = await this._getDecryptedKey(payload.providerId);
      
      if (!decryptedKey) {
        return {
          success: false,
          error: `API key not found or decryption failed for provider: ${payload.providerId}`
        };
      }

      // Log the API call attempt (without exposing the full key)
      console.log(`Invoking API call for ${payload.providerId}:`);
      console.log(`  Path: ${payload.requestPath}`);
      console.log(`  Method: ${payload.requestMethod}`);
      console.log(`  Key (partial): ${decryptedKey.substring(0, 4)}...${decryptedKey.slice(-4)}`);
      console.log(`  Request body:`, payload.requestBody);
      console.log(`  Request headers:`, payload.requestHeaders);

      // PLACEHOLDER: In a real implementation, this would make an actual HTTP request
      // using a library like axios or Node's built-in https module.
      // Example:
      // const response = await axios({
      //   method: payload.requestMethod.toLowerCase(),
      //   url: `https://api.${payload.providerId}.com${payload.requestPath}`,
      //   headers: {
      //     'Authorization': `Bearer ${decryptedKey}`,
      //     'Content-Type': 'application/json',
      //     ...payload.requestHeaders
      //   },
      //   data: payload.requestBody
      // });
      // return { success: true, data: response.data, statusCode: response.status };

      // Mock successful response for testing
      const mockResponse = {
        success: true,
        data: {
          message: 'API call mocked successfully',
          provider: payload.providerId,
          path: payload.requestPath,
          method: payload.requestMethod,
          receivedBody: payload.requestBody,
          timestamp: new Date().toISOString()
        },
        statusCode: 200
      };

      console.log(`Mock API call completed successfully for ${payload.providerId}`);
      
      // Ensure decryptedKey variable goes out of scope quickly
      return mockResponse;

    } catch (error) {
      console.error(`Error during API call for ${payload.providerId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during API call';
      
      return {
        success: false,
        error: `API call failed: ${errorMessage}`,
        statusCode: 500
      };
    }
  }

  /**
   * Gets the file path for a provider's encrypted key
   * 
   * @param providerId The provider ID
   * @returns Full path to the encrypted key JSON file
   * @private
   */
  private getFilePath(providerId: ApiProvider): string {
    return path.join(this.storageDir, `${providerId}.json`);
  }
}
