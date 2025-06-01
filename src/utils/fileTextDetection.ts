// AI Summary: Provides robust text file detection using Electron's preload API for file system access.
// Handles file reading and analysis through Electron's IPC system with proper error handling.
// Maintains compatibility with existing text detection logic while using Electron's Buffer handling.

import { FILE_SYSTEM } from './constants';

// File detection configuration
const FILE_DETECTION = {
  // Maximum buffer size for MIME type detection (256KB)
  maxBufferSize: 262144,
  // Minimum ratio of printable characters to consider a file as text
  textThreshold: 0.8,
  // ASCII character ranges
  asciiPrintableMin: 32,
  asciiPrintableMax: 126,
  // Whitespace characters to consider as valid text
  whitespaceChars: new Set([9, 10, 13]), // tab, LF, CR
} as const;

// Common text file extensions that don't require MIME verification
export const KNOWN_TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'cfg',
  'conf',
  'config',
  'ini',
  'env',
  'csv',
  'tsv',
  'yml',
  'yaml',
  'json',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'rb',
  'php',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'sh',
  'bash',
  'zsh',
  'log',
  'diff',
  'patch',
]);

// Text MIME types for verification
const TEXT_MIME_PATTERNS = [
  /^text\//,
  /^application\/json/,
  /^application\/xml/,
  /^application\/x-yaml/,
  /^application\/javascript/,
  /^application\/typescript/,
  /^application\/x-httpd-php/,
];

/**
 * Checks if a file extension indicates a text file
 * @param filePath Path to the file
 * @returns boolean indicating if the extension matches known text files
 */
function isTextFileExtension(filePath: string): boolean {
  const extension = filePath.split('.').pop()?.toLowerCase();
  return extension ? KNOWN_TEXT_EXTENSIONS.has(extension) : false;
}

/**
 * Detects if a file is a text file using extension and content analysis
 * @param filePath Path to the file to check
 * @returns Promise<boolean> indicating if the file is a text file
 * @throws Error if file access or analysis fails
 */
export async function isTextFile(filePath: string): Promise<boolean> {
  try {
    // Quick check based on extension
    if (isTextFileExtension(filePath)) {
      return true;
    }

    // Read file buffer through Electron's preload API
    const buffer = await window.fileSystem.readFile(filePath, {
      encoding: null,
    });

    // Ensure we have an ArrayBuffer
    const arrayBuffer =
      buffer instanceof ArrayBuffer
        ? buffer
        : typeof buffer === 'string'
          ? new TextEncoder().encode(buffer).buffer
          : buffer;

    // Convert to Uint8Array for analysis
    const uint8Array = new Uint8Array(arrayBuffer);

    // Analyze only the first portion of the file
    const analysisBuffer = uint8Array.slice(0, FILE_DETECTION.maxBufferSize);

    // Check if file contains mostly printable ASCII characters
    const printableChars = analysisBuffer.filter(
      (byte) =>
        (byte >= FILE_DETECTION.asciiPrintableMin &&
          byte <= FILE_DETECTION.asciiPrintableMax) ||
        FILE_DETECTION.whitespaceChars.has(byte)
    ).length;

    return (
      printableChars / analysisBuffer.length >= FILE_DETECTION.textThreshold
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error analyzing file ${filePath}: ${error.message}`);
    }
    throw new Error(`Unknown error analyzing file ${filePath}`);
  }
}
