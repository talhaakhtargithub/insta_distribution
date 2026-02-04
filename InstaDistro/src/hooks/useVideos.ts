import { useState, useCallback } from 'react';
import {
  getVideos,
  saveVideo,
  updateVideo as updateVideoStorage,
  deleteVideo,
  Video,
} from '../services/storage';
import { MESSAGES } from '../constants';
import Toast from 'react-native-toast-message';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (err) {
      const message = MESSAGES.ERRORS.LOAD_FAILED;
      setError(message);
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  }, []);

  const addVideo = useCallback(async (video: Video) => {
    try {
      await saveVideo(video);
      await loadVideos();
      Toast.show({
        type: 'success',
        text1: MESSAGES.SUCCESS.VIDEO_ADDED,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadVideos]);

  const updateVideo = useCallback(async (id: string, updates: Partial<Video>) => {
    try {
      await updateVideoStorage(id, updates);
      await loadVideos();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadVideos]);

  const removeVideo = useCallback(async (id: string) => {
    try {
      await deleteVideo(id);
      await loadVideos();
      Toast.show({
        type: 'success',
        text1: MESSAGES.SUCCESS.VIDEO_DELETED,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: MESSAGES.ERRORS.SAVE_FAILED,
      });
      throw err;
    }
  }, [loadVideos]);

  return {
    videos,
    loading,
    error,
    loadVideos,
    addVideo,
    updateVideo,
    removeVideo,
  };
}
