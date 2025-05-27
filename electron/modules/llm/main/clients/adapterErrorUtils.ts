// AI Summary: Centralized error mapping utility for LLM client adapters.
// Maps common HTTP status codes and network errors to standardized AdapterErrorCode and errorType.
// Reduces duplication across OpenAI, Anthropic and other provider adapters.

import { ADAPTER_ERROR_CODES, type AdapterErrorCode } from './types';

/**
 * Mapped error details returned by the utility function
 */
export interface MappedErrorDetails {
  errorCode: AdapterErrorCode;
  errorMessage: string;
  errorType: string;
  status?: number;
}

/**
 * Maps common error patterns to standardized error codes and types
 * 
 * This utility handles:
 * - Common HTTP status codes (401, 402, 404, 429, 4xx, 5xx)
 * - Network connection errors (ENOTFOUND, ECONNREFUSED, timeouts)
 * - Generic JavaScript errors
 * 
 * Individual adapters can further refine the mappings for provider-specific cases,
 * particularly for 400 errors where message content determines the specific error type.
 * 
 * @param error - The error object from the provider SDK or network layer
 * @param providerMessageOverride - Optional override for the error message (e.g., from provider SDK)
 * @returns Mapped error details with standardized codes and types
 */
export function getCommonMappedErrorDetails(
  error: any,
  providerMessageOverride?: string
): MappedErrorDetails {
  let errorCode: AdapterErrorCode = ADAPTER_ERROR_CODES.UNKNOWN_ERROR;
  let errorMessage = providerMessageOverride || error?.message || 'Unknown error occurred';
  let errorType = 'server_error';
  let status: number | undefined;

  // Handle API errors with HTTP status codes
  if (error && typeof error.status === 'number') {
    const httpStatus = error.status;
    status = httpStatus;
    errorMessage = providerMessageOverride || error.message || `HTTP ${httpStatus} error`;

    // Map common HTTP status codes
    // TypeScript knows httpStatus is defined here due to the typeof check above
    switch (httpStatus) {
      case 400:
        // Default mapping for 400 errors - adapters should refine based on message content
        errorCode = ADAPTER_ERROR_CODES.PROVIDER_ERROR;
        errorType = 'invalid_request_error';
        break;
      case 401:
        errorCode = ADAPTER_ERROR_CODES.INVALID_API_KEY;
        errorType = 'authentication_error';
        break;
      case 402:
        errorCode = ADAPTER_ERROR_CODES.INSUFFICIENT_CREDITS;
        errorType = 'rate_limit_error';
        break;
      case 404:
        errorCode = ADAPTER_ERROR_CODES.MODEL_NOT_FOUND;
        errorType = 'invalid_request_error';
        break;
      case 429:
        errorCode = ADAPTER_ERROR_CODES.RATE_LIMIT_EXCEEDED;
        errorType = 'rate_limit_error';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = ADAPTER_ERROR_CODES.PROVIDER_ERROR;
        errorType = 'server_error';
        break;
      default:
        if (httpStatus >= 400 && httpStatus < 500) {
          errorCode = ADAPTER_ERROR_CODES.PROVIDER_ERROR;
          errorType = 'invalid_request_error';
        } else if (httpStatus >= 500) {
          errorCode = ADAPTER_ERROR_CODES.PROVIDER_ERROR;
          errorType = 'server_error';
        } else {
          errorCode = ADAPTER_ERROR_CODES.PROVIDER_ERROR;
          errorType = 'server_error';
        }
    }
  }
  // Handle network connection errors
  else if (error && (
    error.code === 'ENOTFOUND' || 
    error.code === 'ECONNREFUSED' || 
    error.code === 'ETIMEDOUT' ||
    error.name === 'ConnectTimeoutError' ||
    (error.type && error.type.includes('timeout'))
  )) {
    errorCode = ADAPTER_ERROR_CODES.NETWORK_ERROR;
    errorType = 'connection_error';
    errorMessage = providerMessageOverride || error.message || 'Network connection failed';
  }
  // Handle generic JavaScript errors
  else if (error instanceof Error) {
    errorMessage = providerMessageOverride || error.message || 'Client error occurred';
    errorCode = ADAPTER_ERROR_CODES.UNKNOWN_ERROR;
    errorType = 'client_error';
  }
  // Handle unknown error types
  else {
    errorMessage = providerMessageOverride || 'Unknown error occurred';
    errorCode = ADAPTER_ERROR_CODES.UNKNOWN_ERROR;
    errorType = 'server_error';
  }

  return {
    errorCode,
    errorMessage,
    errorType,
    status
  };
}
