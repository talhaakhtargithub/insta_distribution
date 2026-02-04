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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, shadows } from '../theme';
import {
  getAccounts,
  saveAccount,
  deleteAccount,
  setSourceAccount,
  Account,
} from '../services/storage';
import { User, MoreVertical, Trash2, Star, Wifi, WifiOff } from 'lucide-react-native';

export function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const loadAccounts = async () => {
    const data = await getAccounts();
    setAccounts(data);
  };

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
    if (!newUsername.trim()) return;

    const account: Account = {
      id: Date.now().toString(),
      username: newUsername.trim().replace('@', ''),
      followerCount: Math.floor(Math.random() * 1000000) + 10000,
      isSource: accounts.length === 0,
      proxyConnected: Math.random() > 0.3,
      createdAt: new Date().toISOString(),
    };

    await saveAccount(account);
    setNewUsername('');
    setAddDialogVisible(false);
    loadAccounts();
  };

  const handleDeleteAccount = async (id: string) => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to remove this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(id);
            loadAccounts();
          },
        },
      ]
    );
  };

  const handleSetSource = async (id: string) => {
    await setSourceAccount(id);
    loadAccounts();
    setMenuVisible(null);
  };

  const formatFollowers = (count?: number) => {
    if (!count) return 'Loading...';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M followers`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K followers`;
    return `${count} followers`;
  };

  const renderAccount = ({ item, index }: { item: Account; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
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
                  icon={() => <Star size={12} color={colors.primary.main} />}
                >
                  Source
                </Chip>
              )}
            </View>

            <Text style={styles.followers}>{formatFollowers(item.followerCount)}</Text>

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
                handleDeleteAccount(item.id);
              }}
              title="Delete"
              titleStyle={{ color: colors.error }}
              leadingIcon={() => <Trash2 size={18} color={colors.error} />}
            />
          </Menu>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <User size={48} color={colors.light.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No accounts yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first Instagram account to get started
      </Text>
    </View>
  );

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
        ListEmptyComponent={EmptyState}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setAddDialogVisible(true)}
        label="Add Account"
      />

      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>Add Instagram Account</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Username"
              value={newUsername}
              onChangeText={setNewUsername}
              mode="outlined"
              placeholder="@username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddAccount} mode="contained">
              Add
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary.main,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
