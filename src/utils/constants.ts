// AI Summary: Stores configuration constants used throughout the application.
// Defines thresholds for file length, smart preview limits, code refactoring and UI animations.
// Documentation formats for code content
export const DOC_FORMAT = {
  MARKDOWN: 'markdown',
  XML: 'xml',
  DEFAULT: 'xml', // Set XML as the default format
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

  // Configuration limits
  limits: {
    MAX_RECENT_PROJECTS: 10,
  },

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
      recentProjectPaths: [],
      uiTheme: 'Auto',
      fileViewerWrapEnabled: false,
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

// Context Builder Configuration
export const CONTEXT_BUILDER = {
  // Phase 1: Seeding
  SEED_TRIGGER_THRESHOLD: 2,
  SEED_BASKET_SIZE: 3,

  // Phase 2: Scoring Weights
  SCORE_DIRECT_DEPENDENCY: 50,
  SCORE_TASK_KEYWORD_SINGLE: 30,
  SCORE_TASK_KEYWORD_MULTI: 60,
  // New scores for path matching from the task description
  SCORE_TASK_PATH_EXACT_MATCH: 200,
  SCORE_TASK_PATH_FOLDER_MATCH: 60,
  SCORE_TASK_PATH_BASENAME_OR_PARTIAL_MATCH: 45,
  SCORE_SHARED_COMMIT_SINGLE: 5,
  SCORE_SHARED_COMMIT_MULTI: 10,
  SCORE_ACTIVELY_EDITING: 35,
  SCORE_SIBLING_FILE: 15,
  SCORE_PROJECT_HUB_MAX: 30,
  SCORE_PROJECT_HUB_MIN: 10,
  SCORE_RECENT_COMMIT_ACTIVITY: 10,
  SCORE_SAME_FOLDER: 10,
  SCORE_FILE_MENTION: 8,
  SCORE_GLOBAL_KEYWORD: 5,

  // Phase 2: Final Selection
  MAX_NEIGHBOR_TOKENS: 10000,
  SCORE_THRESHOLD: 1,
  MAX_COMMITS_TO_CHECK: 3,

  // UI Visualization
  VISUALIZATION_THRESHOLD: 5,
  MAX_VISUALIZATION_SCORE: 100,
};

// Project Analysis Configuration
export const PROJECT_ANALYSIS = {
  // The number of recent commits to check when analyzing for shared file commits.
  MAX_COMMITS_FOR_SHARED_ANALYSIS: 200,
  // Delay in ms after the last file system change before considering the system quiet.
  FILE_SYSTEM_QUIESCENCE_DELAY: 30000, // 30 seconds
  // Delay in ms of user inactivity before triggering analysis.
  USER_INACTIVITY_DELAY: 5000, // 5 seconds
};
