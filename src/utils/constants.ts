// AI Summary: Stores configuration constants used throughout the application.
// Defines thresholds for file length, smart preview limits, code refactoring and UI animations.
// Documentation formats for code content
export const DOC_FORMAT = {
  MARKDOWN: 'markdown',
  XML: 'xml',
  DEFAULT: 'xml',  // Set XML as the default format
};

export const FILE_SYSTEM = {
  // Supplementary materials directory name
  materialsDirName: '.ath_materials',

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

// Settings configuration
export const SETTINGS = {
  // Filenames for settings files
  PROJECT_SETTINGS_FILENAME: 'project_settings.json',
  APP_SETTINGS_FILENAME: 'application_settings.json',
  
  // Default settings
  defaults: {
    project: {
      projectNameOverride: '',
      projectInfoFilePath: '',
      includeAiSummaries: true,
      useGitignore: true,
    },
    application: {
      enableExperimentalFeatures: false,
      minSmartPreviewLines: 10,
      maxSmartPreviewLines: 20,
      thresholdLineLength: 200,
      lastSelectedApiPresetId: null,
      lastOpenedProjectPath: undefined,
      uiTheme: 'Auto',
    },
  },
};

// Custom templates configuration
export const CUSTOM_TEMPLATES = {
  // Directory name for user-defined prompts and tasks
  USER_PROMPTS_DIR_NAME: 'prompts',
};

// Project information file configuration
export const PROJECT_INFO = {
  // Basenames in order of precedence (case-insensitive)
  BASENAMES: ['project', 'about', 'index', 'readme'],
  // Extensions in order of precedence (case-insensitive)
  EXTENSIONS: ['.md', '.txt'],
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
  
  // Menu configuration
  menu: {
    padding: 16, // Minimum padding from viewport edges
    maxWidth: 300, // Maximum width for context menus
    minWidth: 200, // Minimum width for context menus
    buttonSpacing: 8, // Space between button edge and menu
  },
  
  // Button interaction states
  button: {
    pressDelay: '50ms',
    pressDuration: '100ms',
    contextDelay: '150ms', // Delay before showing context menu
  },
  
  // Context field configuration
  context: {
    height: '2.5rem',
    maxWidth: '100%',
    fontSize: '0.875rem', // 14px
    lineHeight: '1.25rem', // 20px
    transitionDuration: '150ms',
    dropdownMaxHeight: '12rem',
  },
};

// Drag and drop configuration
export const DRAG_DROP = {
  // Custom MIME type for internal file path transfers
  MIME_TYPE: 'application/x-athanor-filepath',
  // CSS classes for drag states
  classes: {
    draggable: 'cursor-grab hover:cursor-grab active:cursor-grabbing',
    dragging: 'opacity-50 cursor-grabbing',
  },
};
