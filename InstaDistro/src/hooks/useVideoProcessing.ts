import { useState, useCallback } from 'react';
import {
  applyVideoEffect,
  fileToBase64,
  calculateModificationPercentage,
} from '../services/effectsApi';
import { MESSAGES } from '../constants';
import Toast from 'react-native-toast-message';

export function useVideoProcessing() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processVideo = useCallback(
    async (videoUri: string, effects: string[]) => {
      if (effects.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'No Effects',
          text2: MESSAGES.ERRORS.NO_EFFECTS,
        });
        return null;
      }

      setProcessing(true);
      setProgress(0);
      setError(null);

      try {
        // Convert to base64
        setProgress(0.2);
        Toast.show({
          type: 'info',
          text1: MESSAGES.INFO.CONVERTING_VIDEO,
        });

        const videoBase64 = await fileToBase64(videoUri);
        setProgress(0.4);

        // Apply effects
        Toast.show({
          type: 'info',
          text1: MESSAGES.INFO.APPLYING_EFFECTS,
          text2: `Processing ${effects.length} effect(s)...`,
        });

        const effectsString = effects.join(', ');
        const result = await applyVideoEffect(videoBase64, effectsString, (p) => {
          setProgress(0.4 + (p / 100) * 0.5);
        });

        setProgress(0.9);

        const modificationPercentage = calculateModificationPercentage(effects);
        const resultUri = `data:video/mp4;base64,${result.video_base64}`;

        setProgress(1);

        Toast.show({
          type: 'success',
          text1: MESSAGES.SUCCESS.EFFECTS_APPLIED,
          text2: `${modificationPercentage}% modified`,
        });

        return {
          uri: resultUri,
          modificationPercentage,
          appliedEffects: effects,
        };
      } catch (err) {
        const message = MESSAGES.ERRORS.VIDEO_PROCESSING_FAILED;
        setError(message);
        Toast.show({
          type: 'error',
          text1: 'Processing Failed',
          text2: message,
        });
        return null;
      } finally {
        setProcessing(false);
        setTimeout(() => setProgress(0), 500);
      }
    },
    []
  );

  return {
    processing,
    progress,
    error,
    processVideo,
  };
}
