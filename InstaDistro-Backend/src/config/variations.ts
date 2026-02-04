/**
 * Content Variation Engine Configuration
 * Controls the intensity and behavior of video/caption/hashtag variations.
 */

export interface VideoVariationSettings {
  brightnessRange: [number, number];
  contrastRange: [number, number];
  saturationRange: [number, number];
  cropPercent: { min: number; max: number };
  speedRange: [number, number];
  volumeRange: [number, number];
  trimMs: { min: number; max: number };
  fadeMs: { min: number; max: number };
}

export interface CaptionVariationSettings {
  synonymIntensity: number;
  emojiProbability: number;
  reorderProbability: number;
}

export interface HashtagVariationSettings {
  minCount: number;
  maxCount: number;
  popularRatio: number;
  rotationSize: number;
}

export interface VariationSettings {
  video: VideoVariationSettings;
  caption: CaptionVariationSettings;
  hashtag: HashtagVariationSettings;
}

export const DEFAULT_VARIATION_SETTINGS: VariationSettings = {
  video: {
    brightnessRange: [-0.1, 0.1],
    contrastRange: [0.9, 1.1],
    saturationRange: [0.9, 1.1],
    cropPercent: { min: 0.01, max: 0.03 },
    speedRange: [0.98, 1.02],
    volumeRange: [0.9, 1.1],
    trimMs: { min: 100, max: 500 },
    fadeMs: { min: 100, max: 300 },
  },
  caption: {
    synonymIntensity: 0.3,
    emojiProbability: 0.5,
    reorderProbability: 0.4,
  },
  hashtag: {
    minCount: 5,
    maxCount: 15,
    popularRatio: 0.4,
    rotationSize: 50,
  },
};

/** Random float in [min, max] */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] inclusive */
export function randomIntInRange(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
