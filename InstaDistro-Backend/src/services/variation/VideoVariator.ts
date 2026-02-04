import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { logger } from '../../config/logger';
import { VideoVariationSettings, randomInRange } from '../../config/variations';

/**
 * VideoVariator
 * Creates unique video variations using ffmpeg filters to avoid
 * Instagram's duplicate-content detection. All modifications are
 * subtle and imperceptible to the human eye.
 */
export class VideoVariator {
  private settings: VideoVariationSettings;
  private outputDir: string;

  constructor(settings?: Partial<VideoVariationSettings>) {
    const defaults: VideoVariationSettings = {
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
  async createVariation(inputPath: string, accountId: string): Promise<string> {
    const outputPath = path.join(
      this.outputDir,
      `var_${accountId}_${Date.now()}_${path.basename(inputPath)}`
    );

    await this.ensureDir();

    const brightness = randomInRange(...this.settings.brightnessRange);
    const contrast = randomInRange(...this.settings.contrastRange);
    const saturation = randomInRange(...this.settings.saturationRange);
    const cropPct = randomInRange(this.settings.cropPercent.min, this.settings.cropPercent.max);
    const speed = randomInRange(...this.settings.speedRange);
    const volume = randomInRange(...this.settings.volumeRange);

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

    logger.info(`Creating video variation for account ${accountId}`, {
      brightness, contrast, saturation, cropPct, speed, volume,
    });

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
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
          logger.debug(`Video variation created: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          logger.error('Video variation failed:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Apply only visual modifications (no audio change)
   */
  async applyVisualFilters(inputPath: string, outputPath: string): Promise<string> {
    const brightness = randomInRange(...this.settings.brightnessRange);
    const contrast = randomInRange(...this.settings.contrastRange);

    const vf = `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions(['-vf', vf, '-c:a', 'copy', '-y'])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * Get video duration in seconds
   */
  async getDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, stats) => {
        if (err) return reject(err);
        resolve(stats.format.duration ? Number(stats.format.duration) : 0);
      });
    });
  }

  private async ensureDir(): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(this.outputDir, { recursive: true });
  }
}

export const videoVariator = new VideoVariator();
