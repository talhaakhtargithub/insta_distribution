import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { colors, typography } from '../theme';
import { Instagram } from 'lucide-react-native';

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const dotScale1 = useSharedValue(0);
  const dotScale2 = useSharedValue(0);
  const dotScale3 = useSharedValue(0);

  useEffect(() => {
    // Logo animation
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Text fade in
    textOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));

    // Loading dots animation
    dotScale1.value = withDelay(800, withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.5, { duration: 300 }),
    ));
    dotScale2.value = withDelay(1000, withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.5, { duration: 300 }),
    ));
    dotScale3.value = withDelay(1200, withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.5, { duration: 300 }),
    ));

    // Navigate after animation
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
    opacity: dotScale1.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
    opacity: dotScale2.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale3.value }],
    opacity: dotScale3.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.iconWrapper}>
          <Instagram size={64} color="#FFFFFF" strokeWidth={1.5} />
        </View>
      </Animated.View>

      <Animated.Text style={[styles.appName, textAnimatedStyle]}>
        InstaDistro
      </Animated.Text>

      <Animated.Text style={[styles.tagline, textAnimatedStyle]}>
        Distribute Smarter
      </Animated.Text>

      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: typography.styles.h1.fontSize,
    fontWeight: typography.styles.h1.fontWeight,
    color: '#FFFFFF',
    marginTop: 16,
  },
  tagline: {
    fontSize: typography.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 100,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
});
