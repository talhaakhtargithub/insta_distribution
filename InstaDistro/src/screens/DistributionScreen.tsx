import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  Text,
  Button,
  Checkbox,
  TextInput,
  IconButton,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { Video, updateVideo } from '../services/storage';
import { getAccounts, Account } from '../services/storage';
import { ArrowLeft, CheckCircle2, Sparkles, Wifi, WifiOff } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export function DistributionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const video = (route.params as any)?.video as Video;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const data = await getAccounts();
    // Filter out source account and accounts that already have this video
    const available = data.filter(
      acc => !acc.isSource && !video.uploadedTo.includes(acc.id) && acc.proxyConnected
    );
    setAccounts(available);
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAll = () => {
    const eligible = accounts.filter(acc => acc.proxyConnected && !video.uploadedTo.includes(acc.id));
    setSelectedAccounts(eligible.map(acc => acc.id));
  };

  const handleDistribute = async () => {
    if (selectedAccounts.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Accounts Selected',
        text2: 'Please select at least one account',
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i / 100);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update video with uploaded accounts
      await updateVideo(video.id, {
        uploadedTo: [...video.uploadedTo, ...selectedAccounts],
      });

      Toast.show({
        type: 'success',
        text1: 'Distribution Complete!',
        text2: `Uploaded to ${selectedAccounts.length} account(s)`,
      });

      setTimeout(() => {
        navigation.navigate('Videos' as never);
      }, 1500);
    } catch (error) {
      console.error('Distribution error:', error);
      Toast.show({
        type: 'error',
        text1: 'Distribution Failed',
        text2: 'Please try again',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon={() => <ArrowLeft size={24} color={colors.light.textPrimary} />}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Distribute to Accounts</Text>
        <View style={{ width: 40 }} />
      </View>

      {uploading && (
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} color={colors.primary.main} />
          <Text style={styles.progressText}>
            Uploading to {selectedAccounts.length} account(s)... {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Video Preview */}
        <View style={styles.videoCard}>
          <View style={styles.videoPreview}>
            <Sparkles size={40} color={colors.light.textTertiary} />
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>Edited Video</Text>
            <Text style={styles.videoMeta}>
              {formatDuration(video.duration)} • {video.modificationPercentage}% modified
            </Text>
            {video.appliedEffects.length > 0 && (
              <View style={styles.effectsRow}>
                <Text style={styles.effectsLabel}>Effects:</Text>
                <Text style={styles.effectsText} numberOfLines={1}>
                  {video.appliedEffects.slice(0, 3).join(', ')}
                  {video.appliedEffects.length > 3 && ` +${video.appliedEffects.length - 3}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Caption Input */}
        <View style={styles.captionSection}>
          <Text style={styles.sectionTitle}>Caption (Optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter caption for your post..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            style={styles.captionInput}
          />
        </View>

        {/* Account Selection */}
        <View style={styles.accountsSection}>
          <View style={styles.accountsHeader}>
            <Text style={styles.sectionTitle}>Select Accounts</Text>
            <Button mode="text" onPress={selectAll} compact>
              Select All
            </Button>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.emptyAccounts}>
              <Text style={styles.emptyText}>No eligible accounts available</Text>
              <Text style={styles.emptySubtext}>
                Make sure accounts have proxy connections
              </Text>
            </View>
          ) : (
            accounts.map(account => {
              const isSelected = selectedAccounts.includes(account.id);
              const isAlreadyUploaded = video.uploadedTo.includes(account.id);
              const isDisabled = isAlreadyUploaded || !account.proxyConnected;

              return (
                <Pressable
                  key={account.id}
                  style={[
                    styles.accountItem,
                    isDisabled && styles.accountItemDisabled,
                  ]}
                  onPress={() => !isDisabled && toggleAccount(account.id)}
                  disabled={isDisabled}
                >
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => !isDisabled && toggleAccount(account.id)}
                    disabled={isDisabled}
                  />
                  <View style={styles.accountDetails}>
                    <Text
                      style={[
                        styles.accountUsername,
                        isDisabled && styles.accountUsernameDisabled,
                      ]}
                    >
                      @{account.username}
                    </Text>
                    <View style={styles.accountMeta}>
                      {account.proxyConnected ? (
                        <Wifi size={12} color={colors.success} />
                      ) : (
                        <WifiOff size={12} color={colors.error} />
                      )}
                      <Text style={styles.accountStatus}>
                        {isAlreadyUploaded
                          ? 'Already uploaded'
                          : !account.proxyConnected
                          ? 'No proxy'
                          : 'Ready'}
                      </Text>
                    </View>
                  </View>
                  {isSelected && <CheckCircle2 size={20} color={colors.primary.main} />}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Selected Count */}
        {selectedAccounts.length > 0 && (
          <View style={styles.selectedInfo}>
            <Chip
              mode="flat"
              style={styles.selectedChip}
              textStyle={styles.selectedChipText}
            >
              {selectedAccounts.length} account(s) selected
            </Chip>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleDistribute}
          style={styles.distributeButton}
          labelStyle={styles.buttonLabel}
          disabled={uploading || selectedAccounts.length === 0}
          loading={uploading}
        >
          Distribute to {selectedAccounts.length || 0} Account{selectedAccounts.length !== 1 ? 's' : ''}
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
  videoCard: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.surface,
    ...shadows.sm,
  },
  videoPreview: {
    width: 80,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginBottom: 6,
  },
  effectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  effectsLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  effectsText: {
    fontSize: 12,
    color: colors.primary.main,
    flex: 1,
  },
  captionSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  captionInput: {
    backgroundColor: colors.light.background,
  },
  accountsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  accountItemDisabled: {
    opacity: 0.5,
  },
  accountDetails: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  accountUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  accountUsernameDisabled: {
    color: colors.light.textSecondary,
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountStatus: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  emptyAccounts: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  selectedInfo: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectedChip: {
    backgroundColor: colors.primary.main + '15',
  },
  selectedChipText: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.divider,
    backgroundColor: colors.light.background,
  },
  distributeButton: {
    borderRadius: borderRadius.lg,
    height: 50,
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
