// AI Summary: Stores configuration constants used throughout the application.
// Defines thresholds for file length, smart preview limits, and code refactoring.
export const FILE_SYSTEM = {
  // Resources directory name
  resourcesDirName: '.ath_resources',
  
  // Maximum number of lines before a file is considered too long
  thresholdLineLength: 200,
  // Maximum/minimum lines for smart preview
  minSmartPreviewLines: 10,
  maxSmartPreviewLines: 20,
  // Refactoring thresholds
  refactoring: {
    // Files over this length are candidates for splitting
    splitThreshold: 300,
    // Minimum size for a split file to be worthwhile
    minSplitSize: 50,
    // Maximum recommended file size
    maxFileSize: 500,
  },
};
