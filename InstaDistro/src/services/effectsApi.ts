const API_URL = 'https://saadmalik1-visual-effects.hf.space';
const API_KEY = 'trusted_dev_key';

export interface Effect {
  name: string;
  category: string;
}

export interface EffectResult {
  status: string;
  effect_applied: string;
  data_base64?: string;
  video_base64?: string;
}

// All 87 available effects organized by category
export const EFFECTS_BY_CATEGORY = {
  'Distortion & Glitch': [
    'rgb_split', 'pixelate', 'scanlines', 'ripple', 'twirl',
    'fisheye', 'spherize', 'glitch_blocky', 'mirror_horizontal', 'kaleidoscope'
  ],
  'Color & Filters': [
    'invert', 'grayscale', 'sepia', 'posterize', 'thermal',
    'color_swap_rb', 'hsv_rotate', 'solarize', 'threshold_binary', 'gameboy'
  ],
  'Artistic & Edges': [
    'canny_edges', 'neon_edges', 'cartoon', 'sketch', 'emboss',
    'oil_painting', 'watercolor', 'detail_enhance', 'vignette', 'noise_salt_pepper'
  ],
  'Blur & Morph': [
    'blur_gaussian', 'blur_box', 'blur_median', 'motion_blur', 'zoom_blur',
    'dilate', 'erode', 'opening', 'closing', 'gradient'
  ],
  'Adjustments': [
    'rotate_90', 'rotate_180', 'rotate_270', 'sharpen', 'clahe',
    'gamma_correction', 'increase_contrast', 'gotham_filter', 'washout_color',
    'mirror_vertical', 'glitch_horizontal'
  ],
  'Decorative Frames': [
    'frame_polaroid', 'frame_vlog', 'frame_vintage', 'frame_neon', 'frame_minimalist'
  ],
  'Masks & Overlays': [
    'mask_circle', 'mask_heart', 'overlay_light_leak', 'overlay_film_grain',
    'overlay_dust', 'overlay_rec_dot', 'overlay_timestamp', 'enhance_hdr',
    'enhance_glow', 'enhance_crisp', 'mask_vignette_soft', 'effect_double_glow',
    'mask_gradient_vertical', 'overlay_bokeh', 'effect_technicolor'
  ],
  'Social & Premium Frames': [
    'frame_instagram', 'frame_story', 'frame_cinematic_v2', 'frame_tiktok',
    'frame_aesthetic', 'frame_shadow', 'frame_rounded_v2', 'frame_round_border',
    'frame_aesthetic_minimal', 'frame_aesthetic_thick', 'frame_aesthetic_gradient',
    'frame_aesthetic_corners', 'frame_aesthetic_glow', 'frame_cinema_classic',
    'frame_cinema_premium', 'frame_cinema_imax'
  ],
};

export const ALL_EFFECTS = Object.values(EFFECTS_BY_CATEGORY).flat();

// Convert file URI to base64
export async function fileToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URI prefix if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Apply effect to image
export async function applyImageEffect(
  imageBase64: string,
  effectName: string
): Promise<EffectResult> {
  const response = await fetch(`${API_URL}/api/v1/image/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      image_base64: imageBase64,
      effect_name: effectName,
      return_base64: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Apply effect to video
export async function applyVideoEffect(
  videoBase64: string,
  effectName: string,
  onProgress?: (progress: number) => void
): Promise<EffectResult> {
  onProgress?.(10);

  const response = await fetch(`${API_URL}/api/v1/video/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      video_base64: videoBase64,
      effect_name: effectName,
      return_base64: true,
    }),
  });

  onProgress?.(90);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  onProgress?.(100);

  return result;
}

// Get list of all effects from API
export async function fetchEffectsList(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/effects`);
    const data = await response.json();
    return data.effects || ALL_EFFECTS;
  } catch {
    return ALL_EFFECTS;
  }
}

// Calculate modification percentage based on applied effects
export function calculateModificationPercentage(appliedEffects: string[]): number {
  if (appliedEffects.length === 0) return 0;

  // Base modification: each effect adds ~10-15%
  let modification = 0;

  appliedEffects.forEach(effect => {
    // Higher modification for color/artistic effects
    if (['cartoon', 'sketch', 'oil_painting', 'watercolor', 'neon_edges'].includes(effect)) {
      modification += 15;
    } else if (['grayscale', 'sepia', 'invert', 'thermal', 'gameboy'].includes(effect)) {
      modification += 12;
    } else if (effect.startsWith('frame_')) {
      modification += 8;
    } else {
      modification += 10;
    }
  });

  return Math.min(modification, 100);
}
