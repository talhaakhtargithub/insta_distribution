"use strict";
/**
 * Content Variation Engine Configuration
 * Controls the intensity and behavior of video/caption/hashtag variations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VARIATION_SETTINGS = void 0;
exports.randomInRange = randomInRange;
exports.randomIntInRange = randomIntInRange;
exports.DEFAULT_VARIATION_SETTINGS = {
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
function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}
/** Random integer in [min, max] inclusive */
function randomIntInRange(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}
