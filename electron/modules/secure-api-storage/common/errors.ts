// AI Summary: Custom error class for secure API key storage exceptions.
// Provides meaningful error messages for storage, validation, and encryption failures.

/**
 * Custom error class for API key storage operations
 * 
 * This error class is used throughout the secure API key storage module to provide
 * consistent, user-friendly error messages for various failure scenarios including:
 * - API key validation failures
 * - Storage/retrieval errors
 * - Encryption/decryption failures
 * - File system operation errors
 * 
 * These errors are designed to be displayed directly to users when appropriate.
 */
export class ApiKeyStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyStorageError";
  }
}
