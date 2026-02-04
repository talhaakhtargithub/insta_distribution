import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import {
  Card,
  Avatar,
  Text,
  IconButton,
  FAB,
  Chip,
  Portal,
  Dialog,
  TextInput,
  Button,
  Menu,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  SlideOutRight,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, shadows } from '../theme';
import { User, MoreVertical, Trash2, Star, Wifi, WifiOff } from 'lucide-react-native';
import { MESSAGES } from '../constants';
import { formatFollowerCount, isValidUsername, sanitizeUsername } from '../utils';
import { useAccounts } from '../hooks';
import { LoadingState, EmptyState, SkeletonCard } from '../components';
import { Account } from '../services/storage';

export function AccountsScreen() {
  const {
    accounts,
    loading,
    loadAccounts,
    addAccount,
    removeAccount,
    setSourceAccount,
  } = useAccounts();

  const [refreshing, setRefreshing] = useState(false);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [isAdding, setIsAdding] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  const handleAddAccount = async () => {
    const username = sanitizeUsername(newUsername);

    if (!isValidUsername(username)) {
      Alert.alert('Invalid Username', MESSAGES.ERRORS.INVALID_USERNAME);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    setIsAdding(true);
    try {
      // Use backend API instead of AsyncStorage
      const { backendApi } = await import('../services/backendApi');
      const { account } = await backendApi.createAccount({
        username,
        password: newPassword,
        accountType,
      });

      // Add to local state
      await addAccount({
        id: account.id,
        username: account.username,
        followerCount: account.follower_count || 0,
        isSource: accounts.length === 0,
        proxyConnected: !!account.proxy_id,
        createdAt: account.created_at,
      });

      setNewUsername('');
      setNewPassword('');
      setAccountType('personal');
      setAddDialogVisible(false);

      Alert.alert(
        'Success',
        `Account @${account.username} added successfully!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add account',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAccount = async (id: string, username: string) => {
    Alert.alert(
      'Delete Account',
      `Remove @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeAccount(id),
        },
      ]
    );
  };

  const handleSetSource = async (id: string) => {
    await setSourceAccount(id);
    setMenuVisible(null);
  };

  const renderRightActions = (id: string, username: string) => {
    return (
      <Pressable
        style={styles.deleteAction}
        onPress={() => handleDeleteAccount(id, username)}
      >
        <Trash2 size={24} color="#FFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    );
  };

  const renderAccount = ({ item, index }: { item: Account; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      exiting={SlideOutRight}
    >
      <Swipeable
        renderRightActions={() => renderRightActions(item.id, item.username)}
        overshootRight={false}
      >
        <Card style={styles.accountCard} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Avatar.Text
              size={56}
              label={item.username.substring(0, 2).toUpperCase()}
              style={{ backgroundColor: colors.primary.main }}
            />

            <View style={styles.accountInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>@{item.username}</Text>
                {item.isSource && (
                  <Chip
                    mode="flat"
                    style={styles.sourceBadge}
                    textStyle={styles.sourceBadgeText}
                    icon={() => <Star size={12} color={colors.primary.main} fill={colors.primary.main} />}
                  >
                    Source
                  </Chip>
                )}
              </View>

              <Text style={styles.followers}>{formatFollowerCount(item.followerCount!)}</Text>

              <View style={styles.proxyStatus}>
                {item.proxyConnected ? (
                  <>
                    <Wifi size={14} color={colors.success} />
                    <Text style={[styles.statusText, { color: colors.success }]}>
                      Proxy connected
                    </Text>
                  </>
                ) : (
                  <>
                    <WifiOff size={14} color={colors.error} />
                    <Text style={[styles.statusText, { color: colors.error }]}>
                      No proxy
                    </Text>
                  </>
                )}
              </View>
            </View>

            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon={() => <MoreVertical size={20} color={colors.light.textSecondary} />}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
            >
              {!item.isSource && (
                <Menu.Item
                  onPress={() => handleSetSource(item.id)}
                  title="Set as Source"
                  leadingIcon={() => <Star size={18} color={colors.primary.main} />}
                />
              )}
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  handleDeleteAccount(item.id, item.username);
                }}
                title="Delete"
                titleStyle={{ color: colors.error }}
                leadingIcon={() => <Trash2 size={18} color={colors.error} />}
              />
            </Menu>
          </Card.Content>
        </Card>
      </Swipeable>
    </Animated.View>
  );

  if (loading && accounts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Connected Accounts</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <SkeletonCard variant="account" />
          <SkeletonCard variant="account" />
          <SkeletonCard variant="account" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connected Accounts</Text>
        <Text style={styles.headerSubtitle}>{accounts.length} accounts</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccount}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={User}
            title="No accounts yet"
            subtitle="Add your first Instagram account to get started"
            action={{
              label: 'Add Account',
              onPress: () => setAddDialogVisible(true),
            }}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setAddDialogVisible(true)}
        label="Add Account"
      />

      <Portal>
        <Dialog
          visible={addDialogVisible}
          onDismiss={() => {
            setAddDialogVisible(false);
            setNewUsername('');
            setNewPassword('');
            setAccountType('personal');
          }}
        >
          <Dialog.Title>Add Instagram Account</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Username"
              value={newUsername}
              onChangeText={setNewUsername}
              mode="outlined"
              placeholder={MESSAGES.PLACEHOLDERS.USERNAME}
              autoCapitalize="none"
              autoCorrect={false}
              disabled={isAdding}
            />

            <TextInput
              label="Password"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              placeholder="Instagram password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{ marginTop: 12 }}
              disabled={isAdding}
            />

            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 13, color: colors.light.textSecondary, marginBottom: 8 }}>
                Account Type
              </Text>
              <SegmentedButtons
                value={accountType}
                onValueChange={(value) => setAccountType(value as 'personal' | 'business')}
                buttons={[
                  { value: 'personal', label: 'Personal' },
                  { value: 'business', label: 'Business' },
                ]}
                disabled={isAdding}
              />
            </View>

            <Text style={{ fontSize: 12, color: colors.light.textSecondary, marginTop: 12 }}>
              Your credentials are encrypted and stored securely.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button
              onPress={handleAddAccount}
              mode="contained"
              loading={isAdding}
              disabled={isAdding}
            >
              Add Account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  skeletonContainer: {
    padding: spacing.md,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  accountCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
    ...shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  sourceBadge: {
    height: 24,
    backgroundColor: colors.primary.main + '15',
  },
  sourceBadgeText: {
    fontSize: 11,
    color: colors.primary.main,
    fontWeight: '600',
  },
  followers: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 6,
  },
  proxyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
  },
  deleteAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  deleteText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary.main,
  },
});
