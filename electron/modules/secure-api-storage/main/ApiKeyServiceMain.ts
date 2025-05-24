// AI Summary: Main process service for secure API key storage using electron.safeStorage.
// Handles encryption, file persistence, in-memory storage, and all sensitive key operations.
// Uses OS-level encryption through safeStorage with automatic key loading on startup.

import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ApiProvider, ApiKeyStorageError, ProviderService } from '../common';

/**
 * Main process service for secure API key storage
 * 
 * This service handles all sensitive API key operations in the main process:
 * - Encrypts/decrypts keys using electron.safeStorage (OS-level encryption)
 * - Persists encrypted keys to disk as individual files
 * - Maintains plaintext keys in memory for quick access
 * - Validates API key formats before storage
 * - Automatically loads all stored keys on startup
 * 
 * Security features:
 * - Uses OS keychain/credential store through safeStorage
 * - No master password required - relies on OS authentication
 * - Plaintext keys never leave the main process
 * - Each provider's key stored in separate encrypted file
 */
export class ApiKeyServiceMain {
  private apiKeyStore: Map<ApiProvider, string> = new Map();
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
    
    // Load all existing keys from disk
    this.loadAllKeysFromDisk().catch(error => {
      console.error('Failed to load API keys from disk:', error);
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
      // Encrypt the API key
      const encryptedKey = safeStorage.encryptString(apiKey);
      
      // Save encrypted key to file
      const filePath = this.getFilePath(providerId);
      await fs.promises.writeFile(filePath, encryptedKey);
      
      // Store plaintext in memory for quick access
      this.apiKeyStore.set(providerId, apiKey);
      
      console.log(`API key stored successfully for provider: ${providerId}`);
    } catch (error) {
      throw new ApiKeyStorageError(`Failed to store API key for ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves an API key from memory
   * 
   * @param providerId The provider to get the key for
   * @returns The API key or undefined if not found
   */
  async getKey(providerId: ApiProvider): Promise<string | undefined> {
    return this.apiKeyStore.get(providerId);
  }

  /**
   * Deletes an API key
   * 
   * @param providerId The provider to delete the key for
   */
  async deleteKey(providerId: ApiProvider): Promise<void> {
    try {
      // Remove from memory
      this.apiKeyStore.delete(providerId);
      
      // Delete file if it exists
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
    // Check memory first (fastest)
    if (this.apiKeyStore.has(providerId)) {
      return true;
    }

    // Check file existence as fallback
    try {
      const filePath = this.getFilePath(providerId);
      await fs.promises.access(filePath);
      return true;
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
    return Array.from(this.apiKeyStore.keys());
  }

  /**
   * Loads all API keys from disk on startup
   * 
   * @private
   */
  private async loadAllKeysFromDisk(): Promise<void> {
    try {
      // Read all .key files in storage directory
      const files = await fs.promises.readdir(this.storageDir);
      const keyFiles = files.filter(file => file.endsWith('.key'));

      console.log(`Found ${keyFiles.length} encrypted API key files`);

      for (const keyFile of keyFiles) {
        const providerId = path.basename(keyFile, '.key') as ApiProvider;
        
        // Skip if not a valid provider
        if (!this.providerService.getProvider(providerId)) {
          console.warn(`Skipping unknown provider key file: ${keyFile}`);
          continue;
        }

        try {
          const filePath = path.join(this.storageDir, keyFile);
          const encryptedData = await fs.promises.readFile(filePath);
          
          // Decrypt the key
          const decryptedKey = safeStorage.decryptString(encryptedData);
          
          // Validate the decrypted key
          if (this.providerService.validateApiKey(providerId, decryptedKey)) {
            this.apiKeyStore.set(providerId, decryptedKey);
            console.log(`Loaded API key for provider: ${providerId}`);
          } else {
            console.warn(`Invalid API key format found for provider: ${providerId}, skipping`);
          }
        } catch (error) {
          console.error(`Failed to load API key for provider ${providerId}:`, error);
          // Continue with other keys even if one fails
        }
      }

      console.log(`Successfully loaded ${this.apiKeyStore.size} API keys`);
    } catch (error) {
      // If directory doesn't exist or other errors, just log and continue
      console.warn('Failed to load API keys from disk:', error);
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
   * Gets the file path for a provider's encrypted key
   * 
   * @param providerId The provider ID
   * @returns Full path to the encrypted key file
   * @private
   */
  private getFilePath(providerId: ApiProvider): string {
    return path.join(this.storageDir, `${providerId}.key`);
  }
}
