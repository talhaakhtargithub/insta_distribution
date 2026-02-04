"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaUploader = exports.MediaUploader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const logger_1 = require("../../config/logger");
const readFile = (0, util_1.promisify)(fs.readFile);
const stat = (0, util_1.promisify)(fs.stat);
const unlink = (0, util_1.promisify)(fs.unlink);
const mkdir = (0, util_1.promisify)(fs.mkdir);
const copyFile = (0, util_1.promisify)(fs.copyFile);
// ============================================
// Constants
// ============================================
// Instagram limits
const PHOTO_MAX_SIZE = 8 * 1024 * 1024; // 8MB for photos
const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB for videos
const VIDEO_MAX_DURATION = 60 * 60; // 60 minutes for videos
// Supported formats
const SUPPORTED_PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'gif'];
const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const MIME_TYPES = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
};
// Temporary storage directory
const TEMP_DIR = path.join(process.cwd(), 'temp', 'uploads');
// ============================================
// MediaUploader Class
// ============================================
class MediaUploader {
    /**
     * Validate a media file
     */
    async validateMedia(filePath) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            mediaType: null,
        };
        try {
            // Check if file exists
            const exists = await this.fileExists(filePath);
            if (!exists) {
                result.valid = false;
                result.errors.push(`File not found: ${filePath}`);
                return result;
            }
            // Get file info
            const fileStat = await stat(filePath);
            const extension = path.extname(filePath).toLowerCase().replace('.', '');
            const filename = path.basename(filePath);
            // Determine media type
            if (SUPPORTED_PHOTO_FORMATS.includes(extension)) {
                result.mediaType = 'photo';
                // Check photo size
                if (fileStat.size > PHOTO_MAX_SIZE) {
                    result.valid = false;
                    result.errors.push(`Photo exceeds maximum size of ${PHOTO_MAX_SIZE / 1024 / 1024}MB`);
                }
            }
            else if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
                result.mediaType = 'video';
                // Check video size
                if (fileStat.size > VIDEO_MAX_SIZE) {
                    result.valid = false;
                    result.errors.push(`Video exceeds maximum size of ${VIDEO_MAX_SIZE / 1024 / 1024}MB`);
                }
                // Add warning for large videos
                if (fileStat.size > 50 * 1024 * 1024) {
                    result.warnings.push('Large video may take longer to upload');
                }
            }
            else {
                result.valid = false;
                result.errors.push(`Unsupported file format: ${extension}`);
            }
            logger_1.logger.debug(`Media validation for ${filename}:`, {
                mediaType: result.mediaType,
                size: fileStat.size,
                valid: result.valid,
            });
            return result;
        }
        catch (error) {
            result.valid = false;
            result.errors.push(`Validation failed: ${error.message}`);
            return result;
        }
    }
    /**
     * Prepare media for upload
     */
    async prepareMedia(filePath) {
        // Validate first
        const validation = await this.validateMedia(filePath);
        if (!validation.valid) {
            throw new Error(`Invalid media: ${validation.errors.join(', ')}`);
        }
        // Read file
        const buffer = await readFile(filePath);
        const fileStat = await stat(filePath);
        const extension = path.extname(filePath).toLowerCase().replace('.', '');
        const filename = path.basename(filePath);
        const mimeType = MIME_TYPES[extension] || 'application/octet-stream';
        logger_1.logger.info(`Prepared media for upload: ${filename} (${fileStat.size} bytes)`);
        return {
            localPath: filePath,
            buffer,
            metadata: {
                size: fileStat.size,
                mimeType,
                filename,
            },
        };
    }
    /**
     * Copy media to temporary storage
     */
    async copyToTemp(filePath, prefix) {
        await this.ensureTempDir();
        const filename = path.basename(filePath);
        const tempFilename = prefix
            ? `${prefix}-${Date.now()}-${filename}`
            : `${Date.now()}-${filename}`;
        const tempPath = path.join(TEMP_DIR, tempFilename);
        await copyFile(filePath, tempPath);
        logger_1.logger.debug(`Copied media to temp: ${tempPath}`);
        return tempPath;
    }
    /**
     * Get media file information
     */
    async getMediaInfo(filePath) {
        try {
            const fileStat = await stat(filePath);
            const extension = path.extname(filePath).toLowerCase().replace('.', '');
            const filename = path.basename(filePath);
            let type;
            if (SUPPORTED_PHOTO_FORMATS.includes(extension)) {
                type = 'photo';
            }
            else if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
                type = 'video';
            }
            else {
                return null;
            }
            return {
                path: filePath,
                type,
                size: fileStat.size,
                mimeType: MIME_TYPES[extension] || 'application/octet-stream',
                filename,
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Clean up temporary file
     */
    async cleanupTempFile(filePath) {
        try {
            if (filePath.startsWith(TEMP_DIR)) {
                await unlink(filePath);
                logger_1.logger.debug(`Cleaned up temp file: ${filePath}`);
            }
        }
        catch (error) {
            logger_1.logger.warn(`Failed to cleanup temp file: ${filePath}`);
        }
    }
    /**
     * Clean up all old temporary files (older than 24 hours)
     */
    async cleanupOldTempFiles() {
        let cleaned = 0;
        try {
            const files = await fs.promises.readdir(TEMP_DIR);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            for (const file of files) {
                const filePath = path.join(TEMP_DIR, file);
                const fileStat = await stat(filePath);
                if (now - fileStat.mtime.getTime() > maxAge) {
                    await unlink(filePath);
                    cleaned++;
                }
            }
            if (cleaned > 0) {
                logger_1.logger.info(`Cleaned up ${cleaned} old temp files`);
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to cleanup old temp files:', error);
        }
        return cleaned;
    }
    /**
     * Read media as buffer
     */
    async readAsBuffer(filePath) {
        return await readFile(filePath);
    }
    /**
     * Read media as base64
     */
    async readAsBase64(filePath) {
        const buffer = await readFile(filePath);
        return buffer.toString('base64');
    }
    /**
     * Get file extension
     */
    getExtension(filePath) {
        return path.extname(filePath).toLowerCase().replace('.', '');
    }
    /**
     * Check if file is a photo
     */
    isPhoto(filePath) {
        const ext = this.getExtension(filePath);
        return SUPPORTED_PHOTO_FORMATS.includes(ext);
    }
    /**
     * Check if file is a video
     */
    isVideo(filePath) {
        const ext = this.getExtension(filePath);
        return SUPPORTED_VIDEO_FORMATS.includes(ext);
    }
    /**
     * Get media type from file path
     */
    getMediaType(filePath) {
        if (this.isPhoto(filePath))
            return 'photo';
        if (this.isVideo(filePath))
            return 'video';
        return null;
    }
    // ============================================
    // Private Methods
    // ============================================
    async fileExists(filePath) {
        try {
            await stat(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async ensureTempDir() {
        try {
            await mkdir(TEMP_DIR, { recursive: true });
        }
        catch (error) {
            // Directory might already exist
        }
    }
}
exports.MediaUploader = MediaUploader;
// ============================================
// Export Singleton
// ============================================
exports.mediaUploader = new MediaUploader();
