// AI Summary: Provides robust text file detection using both extension and MIME type analysis.
// Integrates with existing file system utilities for consistent path handling and error management.
import { FileTextDetectionError } from '../types/global';
import {
  normalizePath,
  toPlatformPath,
  pathExists,
  getStats,
  handleError,
} from '../../electron/fileSystemManager';
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
const KNOWN_TEXT_EXTENSIONS = new Set([
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
 * Checks if a MIME type indicates a text file
 * @param mimeType MIME type string
 * @returns boolean indicating if the MIME type matches text patterns
 */
function isTextMimeType(mimeType: string): boolean {
  return TEXT_MIME_PATTERNS.some((pattern) => pattern.test(mimeType));
}

/**
 * Detects if a file is a text file using extension and MIME type analysis
 * @param filePath Path to the file to check
 * @returns Promise<boolean> indicating if the file is a text file
 * @throws FileTextDetectionError if file access or analysis fails
 */
export async function isTextFile(filePath: string): Promise<boolean> {
  try {
    // Normalize and validate path
    const normalizedPath = normalizePath(filePath);
    const platformPath = toPlatformPath(normalizedPath);

    // Check if file exists and is accessible
    const exists = await pathExists(platformPath);
    if (!exists) {
      throw new FileTextDetectionError(`File does not exist: ${platformPath}`);
    }

    // Get file stats
    const stats = await getStats(platformPath);
    if (!stats?.isFile()) {
      throw new FileTextDetectionError(`Path is not a file: ${platformPath}`);
    }

    // Quick check based on extension
    if (isTextFileExtension(platformPath)) {
      return true;
    }

    // Read file buffer for analysis
    const buffer = (await window.fileSystem.readFile(platformPath)) as Buffer;

    // Analyze only the first portion of the file
    const analysisBuffer = buffer.slice(0, FILE_DETECTION.maxBufferSize);

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
    return handleError(error, `analyzing file ${filePath}`);
  }
}
