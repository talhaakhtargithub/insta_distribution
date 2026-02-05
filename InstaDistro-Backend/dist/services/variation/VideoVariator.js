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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoVariator = exports.VideoVariator = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path = __importStar(require("path"));
const logger_1 = require("../../config/logger");
const variations_1 = require("../../config/variations");
/**
 * VideoVariator
 * Creates unique video variations using ffmpeg filters to avoid
 * Instagram's duplicate-content detection. All modifications are
 * subtle and imperceptible to the human eye.
 */
class VideoVariator {
    settings;
    outputDir;
    constructor(settings) {
        const defaults = {
            brightnessRange: [-0.1, 0.1],
            contrastRange: [0.9, 1.1],
            saturationRange: [0.9, 1.1],
            cropPercent: { min: 0.01, max: 0.03 },
            speedRange: [0.98, 1.02],
            volumeRange: [0.9, 1.1],
            trimMs: { min: 100, max: 500 },
            fadeMs: { min: 100, max: 300 },
        };
        this.settings = { ...defaults, ...settings };
        this.outputDir = path.join(process.cwd(), 'temp', 'variations');
    }
    /**
     * Create a full variation of a video with randomized filter stack
     */
    async createVariation(inputPath, accountId) {
        const outputPath = path.join(this.outputDir, `var_${accountId}_${Date.now()}_${path.basename(inputPath)}`);
        await this.ensureDir();
        const brightness = (0, variations_1.randomInRange)(...this.settings.brightnessRange);
        const contrast = (0, variations_1.randomInRange)(...this.settings.contrastRange);
        const saturation = (0, variations_1.randomInRange)(...this.settings.saturationRange);
        const cropPct = (0, variations_1.randomInRange)(this.settings.cropPercent.min, this.settings.cropPercent.max);
        const speed = (0, variations_1.randomInRange)(...this.settings.speedRange);
        const volume = (0, variations_1.randomInRange)(...this.settings.volumeRange);
        const videoFilter = [
            `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`,
            `crop=in_w*${(1 - cropPct * 2).toFixed(3)}:in_h*${(1 - cropPct * 2).toFixed(3)}`,
            `scale=iw:ih`,
            `setpts=${(1 / speed).toFixed(4)}*PTS`,
        ].join(',');
        const audioFilter = [
            `volume=${volume.toFixed(3)}`,
            `atempo=${speed.toFixed(4)}`,
        ].join(',');
        logger_1.logger.info(`Creating video variation for account ${accountId}`, {
            brightness, contrast, saturation, cropPct, speed, volume,
        });
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .outputOptions([
                '-vf', videoFilter,
                '-af', audioFilter,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-movflags', '+faststart',
                '-y',
            ])
                .output(outputPath)
                .on('end', () => {
                logger_1.logger.debug(`Video variation created: ${outputPath}`);
                resolve(outputPath);
            })
                .on('error', (err) => {
                logger_1.logger.error('Video variation failed:', err.message);
                reject(err);
            })
                .run();
        });
    }
    /**
     * Apply only visual modifications (no audio change)
     */
    async applyVisualFilters(inputPath, outputPath) {
        const brightness = (0, variations_1.randomInRange)(...this.settings.brightnessRange);
        const contrast = (0, variations_1.randomInRange)(...this.settings.contrastRange);
        const vf = `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}`;
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .outputOptions(['-vf', vf, '-c:a', 'copy', '-y'])
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .run();
        });
    }
    /**
     * Get video duration in seconds
     */
    async getDuration(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, stats) => {
                if (err)
                    return reject(err);
                resolve(stats.format.duration ? Number(stats.format.duration) : 0);
            });
        });
    }
    async ensureDir() {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        await fs.mkdir(this.outputDir, { recursive: true });
    }
}
exports.VideoVariator = VideoVariator;
exports.videoVariator = new VideoVariator();
