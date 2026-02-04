import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing } from '../theme';
import { Link2, Sparkles, Share2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

const slides = [
  {
    icon: Link2,
    title: 'Multiple Instagram\nAccounts, One Dashboard',
    subtitle: 'Connect unlimited IG accounts in seconds and manage them all from one place',
    color: colors.secondary.main,
  },
  {
    icon: Sparkles,
    title: 'Automatic Filter\nApplication',
    subtitle: '87 professional effects to modify your content by 30%+ with one tap',
    color: colors.primary.main,
  },
  {
    icon: Share2,
    title: 'Instant Video\nDistribution',
    subtitle: 'Upload to all accounts simultaneously and track progress in real-time',
    color: '#34C759',
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentSlide + 1),
        animated: true,
      });
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slide);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => {
          const IconComponent = slide.icon;
          return (
            <View key={index} style={styles.slide}>
              <View style={[styles.iconContainer, { backgroundColor: slide.color + '15' }]}>
                <IconComponent size={80} color={slide.color} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentSlide === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          onPress={handleNext}
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.light.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    color: colors.light.textSecondary,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.border,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  button: {
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
});
