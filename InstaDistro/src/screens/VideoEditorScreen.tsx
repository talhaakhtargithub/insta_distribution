import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text, Button, Chip, IconButton, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { Video, updateVideo } from '../services/storage';
import {
  EFFECTS_BY_CATEGORY,
  applyVideoEffect,
  fileToBase64,
  calculateModificationPercentage,
} from '../services/effectsApi';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export function VideoEditorScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const video = (route.params as any)?.video as Video;

  const [selectedEffects, setSelectedEffects] = useState<string[]>(video.appliedEffects || []);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const modificationPercentage = calculateModificationPercentage(selectedEffects);
  const isCompliant = modificationPercentage >= 30;

  const toggleEffect = (effect: string) => {
    setSelectedEffects(prev =>
      prev.includes(effect)
        ? prev.filter(e => e !== effect)
        : [...prev, effect]
    );
  };

  const handleApplyEffects = async () => {
    if (selectedEffects.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Effects Selected',
        text2: 'Please select at least one effect',
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Convert video to base64
      setProgress(0.2);
      Toast.show({
        type: 'info',
        text1: 'Processing',
        text2: 'Converting video...',
      });

      const videoBase64 = await fileToBase64(video.uri);
      setProgress(0.4);

      // Apply effects
      Toast.show({
        type: 'info',
        text1: 'Applying Effects',
        text2: `Processing ${selectedEffects.length} effect(s)...`,
      });

      const effectsString = selectedEffects.join(', ');
      const result = await applyVideoEffect(videoBase64, effectsString, (p) => {
        setProgress(0.4 + (p / 100) * 0.5);
      });

      setProgress(0.9);

      // Save result
      const resultUri = `data:video/mp4;base64,${result.video_base64}`;
      await updateVideo(video.id, {
        uri: resultUri,
        isEdited: true,
        appliedEffects: selectedEffects,
        modificationPercentage,
      });

      setProgress(1);

      Toast.show({
        type: 'success',
        text1: 'Effects Applied!',
        text2: `${modificationPercentage}% modified`,
      });

      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error) {
      console.error('Error applying effects:', error);
      Toast.show({
        type: 'error',
        text1: 'Processing Failed',
        text2: 'Please try again with fewer effects',
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleDistribute = () => {
    navigation.navigate('Distribution' as never, { video } as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon={() => <ArrowLeft size={24} color={colors.light.textPrimary} />}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Video Editor</Text>
        <View style={{ width: 40 }} />
      </View>

      {processing && (
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} color={colors.primary.main} />
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% - Processing...
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Video Preview Placeholder */}
        <View style={styles.videoPreview}>
          <View style={styles.videoPlaceholder}>
            <Sparkles size={48} color={colors.light.textTertiary} />
            <Text style={styles.previewText}>Video Preview</Text>
          </View>
        </View>

        {/* Modification Status */}
        <View style={[styles.complianceCard, isCompliant && styles.complianceCardSuccess]}>
          <View style={styles.complianceHeader}>
            <CheckCircle2
              size={20}
              color={isCompliant ? colors.success : colors.light.textSecondary}
            />
            <Text style={[styles.complianceText, isCompliant && styles.complianceTextSuccess]}>
              {modificationPercentage}% Modified
            </Text>
          </View>
          <Text style={styles.complianceSubtext}>
            {isCompliant
              ? 'Compliant - Ready to distribute!'
              : 'Add more effects to reach 30% minimum'}
          </Text>
        </View>

        {/* Selected Effects */}
        {selectedEffects.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>Selected Effects ({selectedEffects.length})</Text>
            <View style={styles.selectedEffects}>
              {selectedEffects.map(effect => (
                <Chip
                  key={effect}
                  mode="flat"
                  style={styles.selectedChip}
                  textStyle={styles.selectedChipText}
                  onClose={() => toggleEffect(effect)}
                >
                  {effect.replace(/_/g, ' ')}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* Effects by Category */}
        <View style={styles.effectsSection}>
          <Text style={styles.sectionTitle}>Available Effects</Text>

          {Object.entries(EFFECTS_BY_CATEGORY).map(([category, effects]) => (
            <View key={category} style={styles.categoryContainer}>
              <Pressable
                style={styles.categoryHeader}
                onPress={() =>
                  setExpandedCategory(expandedCategory === category ? null : category)
                }
              >
                <Text style={styles.categoryTitle}>{category}</Text>
                <Text style={styles.categoryCount}>
                  {effects.length} {expandedCategory === category ? '▼' : '▶'}
                </Text>
              </Pressable>

              {expandedCategory === category && (
                <View style={styles.effectsGrid}>
                  {effects.map(effect => {
                    const isSelected = selectedEffects.includes(effect);
                    return (
                      <Pressable
                        key={effect}
                        style={[styles.effectButton, isSelected && styles.effectButtonSelected]}
                        onPress={() => toggleEffect(effect)}
                      >
                        <Text
                          style={[styles.effectText, isSelected && styles.effectTextSelected]}
                        >
                          {effect.replace(/_/g, ' ')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleApplyEffects}
          style={styles.applyButton}
          labelStyle={styles.buttonLabel}
          disabled={processing || selectedEffects.length === 0}
          loading={processing}
        >
          Apply Effects
        </Button>
        {video.isEdited && (
          <Button
            mode="outlined"
            onPress={handleDistribute}
            style={styles.distributeButton}
            labelStyle={styles.buttonLabel}
            disabled={processing}
          >
            Distribute
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.light.surface,
  },
  progressText: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  videoPreview: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.light.surfaceVariant,
    ...shadows.sm,
  },
  videoPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewText: {
    fontSize: 15,
    color: colors.light.textSecondary,
  },
  complianceCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.surfaceVariant,
    borderWidth: 2,
    borderColor: colors.light.border,
  },
  complianceCardSuccess: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  complianceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  complianceTextSuccess: {
    color: colors.success,
  },
  complianceSubtext: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  selectedSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  selectedEffects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedChip: {
    backgroundColor: colors.primary.main + '15',
  },
  selectedChipText: {
    color: colors.primary.main,
    fontSize: 12,
  },
  effectsSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  categoryContainer: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.md,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  categoryCount: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  effectButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.light.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  effectButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  effectText: {
    fontSize: 13,
    color: colors.light.textPrimary,
    textTransform: 'capitalize',
  },
  effectTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
    backgroundColor: colors.light.background,
    gap: spacing.sm,
  },
  applyButton: {
    borderRadius: borderRadius.lg,
    height: 50,
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  distributeButton: {
    borderRadius: borderRadius.lg,
    height: 50,
    justifyContent: 'center',
    borderColor: colors.primary.main,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
