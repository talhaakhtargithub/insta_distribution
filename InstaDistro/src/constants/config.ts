/**
 * App configuration constants
 */

export const API_CONFIG = {
  BASE_URL: 'https://saadmalik1-visual-effects.hf.space',
  API_KEY: 'trusted_dev_key',
  TIMEOUT: 30000, // 30 seconds
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1 second
  MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_IMAGE_SIZE: 50 * 1024 * 1024, // 50MB
};

export const COMPLIANCE = {
  MIN_MODIFICATION: 30, // Minimum 30% modification required
  MAX_EFFECTS: 10, // Maximum 10 effects per video
  RECOMMENDED_EFFECTS: 3, // Recommended number of effects
};

export const VALIDATION = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  MAX_CAPTION_LENGTH: 2200,
  MAX_ACCOUNTS: 20,
  MAX_VIDEOS_PER_ACCOUNT: 100,
};

export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  UPLOAD: 600000, // 10 minutes
  VIDEO_PROCESSING: 300000, // 5 minutes
  SPLASH_SCREEN: 2500, // 2.5 seconds
};

export const STORAGE_LIMITS = {
  MAX_STORAGE_MB: 1000, // 1GB
  AUTO_CLEANUP_DAYS: 30,
  MAX_CACHED_VIDEOS: 50,
};

export const SUPPORTED_FORMATS = {
  VIDEO: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'],
};

export const APP_INFO = {
  NAME: 'InstaDistro',
  VERSION: '1.0.0',
  BUILD: 'MVP',
  SUPPORT_EMAIL: 'support@instadistro.app',
  WEBSITE: 'https://instadistro.app',
};
