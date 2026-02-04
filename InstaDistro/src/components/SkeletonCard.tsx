import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  variant?: 'account' | 'video' | 'list';
}

export function SkeletonCard({ variant = 'list' }: Props) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (variant === 'account') {
    return (
      <View style={styles.accountCard}>
        <Animated.View style={[styles.skeleton, styles.avatar, animatedStyle]} />
        <View style={styles.content}>
          <Animated.View style={[styles.skeleton, styles.line, animatedStyle]} />
          <Animated.View style={[styles.skeleton, styles.lineShort, animatedStyle]} />
        </View>
      </View>
    );
  }

  if (variant === 'video') {
    return (
      <View style={styles.videoCard}>
        <Animated.View style={[styles.skeleton, styles.videoThumb, animatedStyle]} />
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      <Animated.View style={[styles.skeleton, styles.listLine, animatedStyle]} />
      <Animated.View style={[styles.skeleton, styles.listLineShort, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.light.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  accountCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.light.background,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  line: {
    height: 16,
    marginBottom: spacing.sm,
  },
  lineShort: {
    height: 16,
    width: '60%',
  },
  videoCard: {
    padding: spacing.xs,
  },
  videoThumb: {
    width: '100%',
    aspectRatio: 0.66,
  },
  listCard: {
    padding: spacing.md,
    backgroundColor: colors.light.background,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  listLine: {
    height: 20,
    marginBottom: spacing.sm,
  },
  listLineShort: {
    height: 16,
    width: '70%',
  },
});
