import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { logger } from '../../config/logger';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

/**
 * Media Uploader Service
 *
 * Handles media file operations for Instagram posting:
 * - Validates media files (size, format, dimensions)
 * - Prepares media for upload
 * - Handles cover images for videos
 * - Manages temporary file storage
 */

// ============================================
// Types
// ============================================

export interface MediaFile {
    path: string;
    type: 'photo' | 'video';
    size: number;
    mimeType: string;
    filename: string;
}

export interface MediaValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
    mediaType: 'photo' | 'video' | null;
}

export interface PreparedMedia {
    localPath: string;
    publicUrl?: string; // For Graph API, needs public URL
    buffer: Buffer;
    metadata: {
        size: number;
        mimeType: string;
        filename: string;
    };
}

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

const MIME_TYPES: Record<string, string> = {
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

export class MediaUploader {
    /**
     * Validate a media file
     */
    async validateMedia(filePath: string): Promise<MediaValidation> {
        const result: MediaValidation = {
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
            } else if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
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
            } else {
                result.valid = false;
                result.errors.push(`Unsupported file format: ${extension}`);
            }

            logger.debug(`Media validation for ${filename}:`, {
                mediaType: result.mediaType,
                size: fileStat.size,
                valid: result.valid,
            });

            return result;
        } catch (error: any) {
            result.valid = false;
            result.errors.push(`Validation failed: ${error.message}`);
            return result;
        }
    }

    /**
     * Prepare media for upload
     */
    async prepareMedia(filePath: string): Promise<PreparedMedia> {
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

        logger.info(`Prepared media for upload: ${filename} (${fileStat.size} bytes)`);

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
    async copyToTemp(filePath: string, prefix?: string): Promise<string> {
        await this.ensureTempDir();

        const filename = path.basename(filePath);
        const tempFilename = prefix
            ? `${prefix}-${Date.now()}-${filename}`
            : `${Date.now()}-${filename}`;
        const tempPath = path.join(TEMP_DIR, tempFilename);

        await copyFile(filePath, tempPath);
        logger.debug(`Copied media to temp: ${tempPath}`);

        return tempPath;
    }

    /**
     * Get media file information
     */
    async getMediaInfo(filePath: string): Promise<MediaFile | null> {
        try {
            const fileStat = await stat(filePath);
            const extension = path.extname(filePath).toLowerCase().replace('.', '');
            const filename = path.basename(filePath);

            let type: 'photo' | 'video';
            if (SUPPORTED_PHOTO_FORMATS.includes(extension)) {
                type = 'photo';
            } else if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
                type = 'video';
            } else {
                return null;
            }

            return {
                path: filePath,
                type,
                size: fileStat.size,
                mimeType: MIME_TYPES[extension] || 'application/octet-stream',
                filename,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Clean up temporary file
     */
    async cleanupTempFile(filePath: string): Promise<void> {
        try {
            if (filePath.startsWith(TEMP_DIR)) {
                await unlink(filePath);
                logger.debug(`Cleaned up temp file: ${filePath}`);
            }
        } catch (error) {
            logger.warn(`Failed to cleanup temp file: ${filePath}`);
        }
    }

    /**
     * Clean up all old temporary files (older than 24 hours)
     */
    async cleanupOldTempFiles(): Promise<number> {
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
                logger.info(`Cleaned up ${cleaned} old temp files`);
            }
        } catch (error) {
            logger.warn('Failed to cleanup old temp files:', error);
        }
        return cleaned;
    }

    /**
     * Read media as buffer
     */
    async readAsBuffer(filePath: string): Promise<Buffer> {
        return await readFile(filePath);
    }

    /**
     * Read media as base64
     */
    async readAsBase64(filePath: string): Promise<string> {
        const buffer = await readFile(filePath);
        return buffer.toString('base64');
    }

    /**
     * Get file extension
     */
    getExtension(filePath: string): string {
        return path.extname(filePath).toLowerCase().replace('.', '');
    }

    /**
     * Check if file is a photo
     */
    isPhoto(filePath: string): boolean {
        const ext = this.getExtension(filePath);
        return SUPPORTED_PHOTO_FORMATS.includes(ext);
    }

    /**
     * Check if file is a video
     */
    isVideo(filePath: string): boolean {
        const ext = this.getExtension(filePath);
        return SUPPORTED_VIDEO_FORMATS.includes(ext);
    }

    /**
     * Get media type from file path
     */
    getMediaType(filePath: string): 'photo' | 'video' | null {
        if (this.isPhoto(filePath)) return 'photo';
        if (this.isVideo(filePath)) return 'video';
        return null;
    }

    // ============================================
    // Private Methods
    // ============================================

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await stat(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async ensureTempDir(): Promise<void> {
        try {
            await mkdir(TEMP_DIR, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }
}

// ============================================
// Export Singleton
// ============================================

export const mediaUploader = new MediaUploader();
