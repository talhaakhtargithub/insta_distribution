import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { IconButton, ProgressBar } from 'react-native-paper';
import { Play, Pause } from 'lucide-react-native';
import { colors, borderRadius } from '../theme';

interface Props {
  uri: string;
  style?: any;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
}

export function VideoPlayer({
  uri,
  style,
  autoPlay = false,
  loop = false,
  showControls = true,
}: Props) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / (status.durationMillis || 1));
      setDuration(status.durationMillis || 0);

      if (status.didJustFinish && !loop) {
        setIsPlaying(false);
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        isLooping={loop}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />

      {showControls && (
        <View style={styles.controls}>
          <Pressable style={styles.playButton} onPress={handlePlayPause}>
            {isPlaying ? (
              <Pause size={32} color="#FFF" fill="#FFF" />
            ) : (
              <Play size={32} color="#FFF" fill="#FFF" />
            )}
          </Pressable>

          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} color={colors.primary.main} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: colors.light.surfaceVariant,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
