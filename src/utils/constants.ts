// AI Summary: Stores configuration constants used throughout the application.
// Defines thresholds for file length, smart preview limits, code refactoring and UI animations.
export const FILE_SYSTEM = {
  // Supplementary materials directory name
  materialsDirName: '.ath_materials',

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

export const UI = {
  animations: {
    // Transition timings
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    
    // Floating label
    labelOffset: '0.5rem',
    labelDelay: '50ms',
    labelDuration: '200ms',
    
    // Icon scaling
    iconScale: '1.1',
    iconDuration: '200ms',
  },
};