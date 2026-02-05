"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captionVariator = exports.CaptionVariator = void 0;
const logger_1 = require("../../config/logger");
const SYNONYMS = {
    amazing: ['incredible', 'awesome', 'fantastic', 'stunning'],
    beautiful: ['gorgeous', 'stunning', 'lovely', 'elegant', 'breathtaking'],
    love: ['adore', 'cherish', 'appreciate', 'enjoy'],
    great: ['excellent', 'superb', 'outstanding', 'remarkable'],
    good: ['nice', 'pleasant', 'fine', 'solid'],
    best: ['top', 'finest', 'ultimate', 'supreme'],
    new: ['fresh', 'latest', 'novel', 'recent'],
    big: ['massive', 'huge', 'enormous', 'grand'],
    happy: ['joyful', 'delighted', 'cheerful', 'thrilled'],
    excited: ['thrilled', 'pumped', 'stoked', 'buzzing'],
    cool: ['awesome', 'epic', 'rad', 'stellar'],
    fun: ['enjoyable', 'entertaining', 'amusing', 'thrilling'],
    perfect: ['flawless', 'ideal', 'sublime', 'immaculate'],
    important: ['crucial', 'vital', 'essential', 'key'],
    interesting: ['fascinating', 'captivating', 'compelling', 'engaging'],
    different: ['unique', 'distinct', 'novel', 'fresh'],
    make: ['create', 'craft', 'build', 'produce'],
    show: ['reveal', 'unveil', 'display', 'present'],
    find: ['discover', 'uncover', 'locate'],
    incredible: ['unbelievable', 'mind-blowing', 'phenomenal', 'epic'],
    life: ['existence', 'journey', 'adventure', 'experience'],
    world: ['globe', 'planet', 'realm', 'landscape'],
    time: ['moment', 'instant', 'period', 'era'],
    people: ['folks', 'individuals', 'everyone', 'community'],
};
class CaptionVariator {
    settings;
    constructor(settings) {
        this.settings = { synonymIntensity: 0.3, emojiProbability: 0.5, reorderProbability: 0.4, ...settings };
    }
    createVariation(caption, accountId) {
        if (!caption)
            return caption;
        let result = this.applySynonyms(caption);
        result = this.reorderSentences(result);
        result = this.adjustFormatting(result);
        logger_1.logger.debug('Caption varied' + (accountId ? ' for ' + accountId : ''));
        return result;
    }
    applySynonyms(text) {
        const tokens = text.split(/(\s+)/);
        return tokens.map((token) => {
            if (Math.random() > this.settings.synonymIntensity)
                return token;
            const clean = token.toLowerCase().replace(/[^a-z]/g, '');
            const pool = SYNONYMS[clean];
            if (!pool)
                return token;
            const r = pool[Math.floor(Math.random() * pool.length)];
            if (token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase()) {
                return r.charAt(0).toUpperCase() + r.slice(1);
            }
            return r;
        }).join('');
    }
    reorderSentences(text) {
        if (Math.random() > this.settings.reorderProbability)
            return text;
        const sentences = text.split(/(?<=[.!?])\s+/);
        if (sentences.length < 2)
            return text;
        for (let i = sentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
        }
        return sentences.join(' ');
    }
    adjustFormatting(text) {
        const sentences = text.split(/(?<=[.!?])\s+/);
        if (sentences.length < 2)
            return text;
        return sentences.join(Math.random() > 0.5 ? '\n' : ' ');
    }
}
exports.CaptionVariator = CaptionVariator;
exports.captionVariator = new CaptionVariator();
