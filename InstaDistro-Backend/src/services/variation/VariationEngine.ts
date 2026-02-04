import { logger } from '../../config/logger';
import { pool } from '../../config/database';
import { videoVariator } from './VideoVariator';
import { captionVariator } from './CaptionVariator';
import { hashtagGenerator } from './HashtagGenerator';
import { DEFAULT_VARIATION_SETTINGS, VariationSettings } from '../../config/variations';

export interface ContentInput {
  mediaPath: string;
  mediaType: 'photo' | 'video';
  caption?: string;
  hashtags?: string[];
  niche?: string;
}
export interface ContentVariation {
  accountId: string;
  mediaPath: string;
  caption: string;
  hashtags: string[];
}
export class VariationEngine {
  private settings: VariationSettings;
  constructor(settings?: Partial<VariationSettings>) {
    this.settings = { ...DEFAULT_VARIATION_SETTINGS, ...settings };
  }
  async createContentVariation(content: ContentInput, accountId: string): Promise<ContentVariation> {
    logger.info('Variation engine: creating for ' + accountId);
    let mediaPath = content.mediaPath;
    if (content.mediaType === 'video') {
      try { mediaPath = await videoVariator.createVariation(content.mediaPath, accountId); }
      catch (err) { logger.warn('Video variation failed for ' + accountId + ', using original'); }
    }
    const caption = content.caption ? captionVariator.createVariation(content.caption, accountId) : '';
    const hashtags = hashtagGenerator.createHashtagVariation(content.hashtags, content.niche, accountId);
    const variation: ContentVariation = { accountId, mediaPath, caption, hashtags };
    await this.storeVariation(accountId, variation, content);
    return variation;
  }
  async createVariationsForSwarm(content: ContentInput, accountIds: string[]): Promise<ContentVariation[]> {
    logger.info('Swarm variations for ' + accountIds.length + ' accounts');
    const variations: ContentVariation[] = [];
    for (const id of accountIds) {
      try { variations.push(await this.createContentVariation(content, id)); }
      catch (err) { logger.error('Variation failed for ' + id); }
    }
    return variations;
  }
  async getVariations(accountId: string, limit: number = 10): Promise<any[]> {
    try {
      const r = await pool.query('SELECT * FROM content_variations WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2', [accountId, limit]);
      return r.rows;
    } catch (_) { return []; }
  }
  private async storeVariation(accountId: string, v: ContentVariation, orig: ContentInput): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO content_variations (account_id, original_media_path, variation_media_path, original_caption, variation_caption, hashtags, media_type, variation_settings, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [accountId, orig.mediaPath, v.mediaPath, orig.caption || null, v.caption, JSON.stringify(v.hashtags), orig.mediaType, JSON.stringify(this.settings)]
      );
    } catch (_) { logger.warn('Variation persist failed (non-critical)'); }
  }
}
export const variationEngine = new VariationEngine();
