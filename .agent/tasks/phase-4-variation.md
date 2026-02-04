# Task: Phase 4 - Content Variation Engine

**Priority:** HIGH
**Estimated Time:** 1 week
**Status:** PENDING

---

## Overview

Create a system that generates unique variations of videos and captions for each Instagram account to avoid duplicate content detection and increase reach.

---

## Variation Types

### Video Variations:
1. **Visual Modifications:**
   - Brightness/contrast adjustments (+/- 5-15%)
   - Saturation tweaks
   - Color temperature shifts
   - Add subtle filters/overlays
   - Crop slightly (1-3% from edges)
   - Add invisible watermark (metadata)

2. **Audio Modifications:**
   - Volume adjustments (+/- 5-10%)
   - Slight pitch shift (imperceptible)
   - Add silence padding (100-500ms)
   - Audio normalization

3. **Timing Modifications:**
   - Trim start/end (100-500ms)
   - Playback speed adjustment (0.98x - 1.02x)
   - Add fade in/out

### Caption Variations:
1. **Text Variations:**
   - Synonym replacement
   - Emoji variations (🔥 → 💥)
   - Sentence reordering
   - Add/remove line breaks
   - Case variations

2. **Hashtag Variations:**
   - Rotate hashtag sets
   - Mix popular + niche hashtags
   - Location-based variations
   - Time-based hashtags

---

## Files to Create

### New Files:
1. `src/services/variation/VideoVariator.ts` - Video modification
2. `src/services/variation/CaptionVariator.ts` - Caption modification
3. `src/services/variation/HashtagGenerator.ts` - Hashtag generation
4. `src/services/variation/VariationEngine.ts` - Main orchestrator
5. `src/config/variations.ts` - Variation settings
6. `src/api/controllers/VariationController.ts` - API endpoints

---

## Task Breakdown

### Task 4.1: Create Video Variator
**File:** `src/services/variation/VideoVariator.ts`

**Uses:** fluent-ffmpeg (already installed)

```typescript
class VideoVariator {
  // Visual modifications
  async adjustBrightness(input, output, value)
  async adjustContrast(input, output, value)
  async adjustSaturation(input, output, value)
  async applyFilter(input, output, filterName)
  async cropEdges(input, output, percent)
  
  // Audio modifications
  async adjustVolume(input, output, percent)
  async shiftPitch(input, output, semitones)
  async normalizeAudio(input, output)
  
  // Timing modifications
  async trimVideo(input, output, startMs, endMs)
  async adjustSpeed(input, output, factor)
  async addFades(input, output, fadeInMs, fadeOutMs)
  
  // Main method
  async createVariation(input, accountId, settings)
}
```

---

### Task 4.2: Create Caption Variator
**File:** `src/services/variation/CaptionVariator.ts`

```typescript
class CaptionVariator {
  // Text variations
  synonymReplace(text, intensity)
  emojiVariation(text)
  reorderSentences(text)
  adjustFormatting(text)
  
  // Main method
  createVariation(originalCaption, accountId)
}

// Synonym dictionary
const SYNONYMS = {
  "amazing": ["incredible", "awesome", "fantastic", "wonderful"],
  "love": ["adore", "enjoy", "appreciate", "cherish"],
  // ... 500+ words
};
```

---

### Task 4.3: Create Hashtag Generator
**File:** `src/services/variation/HashtagGenerator.ts`

```typescript
class HashtagGenerator {
  // Hashtag pools
  popularHashtags: string[]  // 1M+ posts
  mediumHashtags: string[]   // 100K-1M posts
  nicheHashtags: string[]    // 10K-100K posts
  
  // Methods
  generateSet(niche, count)
  rotateHashtags(accountId, baseHashtags)
  getLocationHashtags(location)
  getTrendingHashtags(category)
  
  // Main method
  createHashtagVariation(original, accountId)
}
```

---

### Task 4.4: Create Variation Engine
**File:** `src/services/variation/VariationEngine.ts`

```typescript
class VariationEngine {
  // Main orchestrator
  async createContentVariation(content, accountId) {
    // 1. Generate video variation
    const videoPath = await this.videoVariator.createVariation(...)
    
    // 2. Generate caption variation
    const caption = this.captionVariator.createVariation(...)
    
    // 3. Generate hashtag variation
    const hashtags = this.hashtagGenerator.createHashtagVariation(...)
    
    // 4. Store variation
    await this.storeVariation(accountId, videoPath, caption, hashtags)
    
    return { videoPath, caption, hashtags }
  }
  
  // Batch processing
  async createVariationsForSwarm(content, accountIds)
}
```

---

### Task 4.5: Database Updates

```sql
-- Already have content_variations table, extend if needed
ALTER TABLE content_variations ADD COLUMN IF NOT EXISTS
  variation_settings JSONB,
  original_hash TEXT,
  variation_hash TEXT;
```

---

### Task 4.6: API Endpoints

**Endpoints:**
- `POST /api/variations/create` - Create variation for single account
- `POST /api/variations/batch` - Create variations for multiple accounts
- `GET /api/variations/:accountId` - Get variations for account
- `DELETE /api/variations/:id` - Delete a variation
- `GET /api/variations/settings` - Get variation settings
- `PUT /api/variations/settings` - Update variation settings

---

## FFmpeg Commands (Reference)

```bash
# Brightness adjustment
ffmpeg -i input.mp4 -vf "eq=brightness=0.1" output.mp4

# Contrast adjustment
ffmpeg -i input.mp4 -vf "eq=contrast=1.2" output.mp4

# Crop 2% from edges
ffmpeg -i input.mp4 -vf "crop=in_w*0.96:in_h*0.96" output.mp4

# Speed adjustment
ffmpeg -i input.mp4 -filter:v "setpts=1.02*PTS" -filter:a "atempo=0.98" output.mp4

# Combine multiple filters
ffmpeg -i input.mp4 -vf "eq=brightness=0.05:contrast=1.05,crop=in_w*0.98:in_h*0.98" output.mp4
```

---

## Completion Checklist

- [ ] VideoVariator.ts created
- [ ] CaptionVariator.ts created
- [ ] HashtagGenerator.ts created
- [ ] VariationEngine.ts created
- [ ] variations.ts config created
- [ ] VariationController.ts created
- [ ] API routes added
- [ ] FFmpeg integration tested
- [ ] Synonym dictionary populated
- [ ] Hashtag pools populated
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Batch processing tested
- [ ] Documentation updated
