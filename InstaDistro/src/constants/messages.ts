/**
 * User-facing messages and notifications
 */

export const MESSAGES = {
  ERRORS: {
    // Network
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',

    // Authentication
    AUTH_FAILED: 'Authentication failed. Please check your credentials.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',

    // File operations
    FILE_NOT_FOUND: 'File not found. Please select a valid file.',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 500MB.',
    INVALID_FILE_FORMAT: 'Invalid file format. Please select a video file.',
    FILE_READ_ERROR: 'Failed to read file. Please try again.',

    // API
    API_ERROR: 'Failed to process request. Please try again.',
    EFFECTS_LOAD_FAILED: 'Failed to load effects. Please check your connection.',
    VIDEO_PROCESSING_FAILED: 'Failed to process video. Please try again.',

    // Storage
    STORAGE_FULL: 'Storage is full. Please clear some space.',
    SAVE_FAILED: 'Failed to save data. Please try again.',
    LOAD_FAILED: 'Failed to load data. Please try again.',

    // Validation
    INVALID_USERNAME: 'Invalid username. Use 3-30 characters, letters, numbers, dots, and underscores.',
    CAPTION_TOO_LONG: 'Caption is too long. Maximum 2200 characters.',
    NO_ACCOUNTS: 'No accounts available. Please add an account first.',
    NO_VIDEOS: 'No videos selected. Please select at least one video.',
    NO_EFFECTS: 'No effects selected. Please select at least one effect.',

    // Upload
    UPLOAD_FAILED: 'Upload failed. Please try again.',
    NO_ELIGIBLE_ACCOUNTS: 'No eligible accounts. Accounts must have proxy connections.',

    // Generic
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },

  SUCCESS: {
    ACCOUNT_ADDED: 'Account added successfully',
    ACCOUNT_DELETED: 'Account removed',
    ACCOUNT_UPDATED: 'Account updated',
    SOURCE_SET: 'Source account updated',

    VIDEO_ADDED: 'Video added successfully',
    VIDEO_DELETED: 'Video removed',
    VIDEO_SAVED: 'Video saved',

    EFFECTS_APPLIED: 'Effects applied successfully',
    VIDEO_PROCESSED: 'Video processed successfully',

    UPLOAD_COMPLETE: 'Upload completed successfully',
    DISTRIBUTION_COMPLETE: 'Distribution completed',

    DATA_CLEARED: 'All data has been cleared',
    SETTINGS_SAVED: 'Settings saved',
  },

  INFO: {
    LOADING: 'Loading...',
    PROCESSING: 'Processing...',
    UPLOADING: 'Uploading...',
    DOWNLOADING: 'Downloading...',
    PLEASE_WAIT: 'Please wait...',

    CONVERTING_VIDEO: 'Converting video...',
    APPLYING_EFFECTS: 'Applying effects...',
    UPLOADING_TO_ACCOUNTS: 'Uploading to accounts...',

    ONBOARDING_SKIP: 'You can always view this guide in Settings',
    NO_INTERNET: 'No internet connection. Some features may not work.',

    GUIDE: {
      STEP_1: '1. Add accounts',
      STEP_2: '2. Add videos',
      STEP_3: '3. Apply effects',
      STEP_4: '4. Distribute',
      FULL: 'Add accounts → Add videos → Apply effects → Distribute',
    },
  },

  WARNINGS: {
    LOW_MODIFICATION: 'Modification below 30%. Add more effects for compliance.',
    LARGE_FILE: 'Large file detected. Processing may take longer.',
    NO_PROXY: 'Some accounts have no proxy connection and cannot receive uploads.',
    SLOW_NETWORK: 'Slow network detected. Upload may take longer.',
    ALREADY_UPLOADED: 'This video has already been uploaded to some accounts.',
  },

  CONFIRMATIONS: {
    DELETE_ACCOUNT: 'Are you sure you want to remove this account?',
    DELETE_VIDEO: 'Are you sure you want to delete this video?',
    CLEAR_ALL_DATA: 'This will remove all accounts, videos, and settings. This action cannot be undone.',
    SKIP_ONBOARDING: 'Skip the introduction?',
    CANCEL_UPLOAD: 'Cancel ongoing upload?',
  },

  PLACEHOLDERS: {
    USERNAME: '@username',
    CAPTION: 'Enter caption for your post...',
    SEARCH: 'Search...',
    SEARCH_VIDEOS: 'Search videos...',
    SEARCH_ACCOUNTS: 'Search accounts...',
  },
};
