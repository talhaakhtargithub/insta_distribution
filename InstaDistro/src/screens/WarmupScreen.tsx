import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface WarmupAccount {
  id: string;
  username: string;
  currentDay: number;
  totalDays: number;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface WarmupStats {
  totalInWarmup: number;
  activeWarmups: number;
  pausedWarmups: number;
  completedToday: number;
  avgProgress: number;
}

const WarmupScreen = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'settings'>('active');
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [stats, setStats] = useState<WarmupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWarmupData();
  }, []);

  const loadWarmupData = async () => {
    try {
      setLoading(true);
      const [accountsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/warmup/accounts`, {
          headers: { 'x-user-id': 'user_1' }
        }),
        axios.get(`${API_URL}/warmup/stats`, {
          headers: { 'x-user-id': 'user_1' }
        }),
      ]);

      setAccounts(accountsRes.data.accounts || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading warmup data:', error);
      Alert.alert('Error', 'Failed to load warmup data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePauseWarmup = async (accountId: string) => {
    try {
      await axios.post(`${API_URL}/warmup/pause/${accountId}`, {}, {
        headers: { 'x-user-id': 'user_1' }
      });
      Alert.alert('Success', 'Warmup paused');
      loadWarmupData();
    } catch (error) {
      Alert.alert('Error', 'Failed to pause warmup');
    }
  };

  const handleResumeWarmup = async (accountId: string) => {
    try {
      await axios.post(`${API_URL}/warmup/resume/${accountId}`, {}, {
        headers: { 'x-user-id': 'user_1' }
      });
      Alert.alert('Success', 'Warmup resumed');
      loadWarmupData();
    } catch (error) {
      Alert.alert('Error', 'Failed to resume warmup');
    }
  };

  const handleSkipToActive = (accountId: string, username: string) => {
    Alert.alert(
      'Skip Warmup?',
      `Are you sure you want to skip warmup for @${username}? This may increase the risk of account restrictions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(`${API_URL}/warmup/skip-to-active/${accountId}`, {}, {
                headers: { 'x-user-id': 'user_1' }
              });
              Alert.alert('Success', 'Account moved to active');
              loadWarmupData();
            } catch (error) {
              Alert.alert('Error', 'Failed to skip warmup');
            }
          },
        },
      ]
    );
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalInWarmup}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.activeWarmups}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pausedWarmups}</Text>
            <Text style={styles.statLabel}>Paused</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWarmupCard = (account: WarmupAccount) => {
    const statusColor = account.status === 'active' ? '#10B981' : account.status === 'paused' ? '#F59E0B' : '#6B7280';

    return (
      <View key={account.id} style={styles.warmupCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.username}>@{account.username}</Text>
            <Text style={styles.dayProgress}>
              Day {account.currentDay} of {account.totalDays}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{account.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${account.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(account.progress)}%</Text>
        </View>

        {/* Daily Tasks */}
        <View style={styles.tasksContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.tasksText}>
            {account.tasksCompleted}/{account.tasksTotal} tasks completed today
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {account.status === 'active' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.pauseButton]}
              onPress={() => handlePauseWarmup(account.id)}
            >
              <Ionicons name="pause" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.resumeButton]}
              onPress={() => handleResumeWarmup(account.id)}
            >
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Resume</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={() => handleSkipToActive(account.id, account.username)}
          >
            <Ionicons name="flash" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderActiveTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadWarmupData();
        }} />
      }
    >
      {renderStatsCard()}

      {accounts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Accounts in Warmup</Text>
          <Text style={styles.emptyText}>
            Start warmup for your accounts to gradually build their activity
          </Text>
        </View>
      ) : (
        accounts.map(renderWarmupCard)
      )}
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.emptyState}>
        <Ionicons name="time" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Warmup History</Text>
        <Text style={styles.emptyText}>
          View completed warmup sessions and their performance
        </Text>
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Warmup Protocol</Text>
        <Text style={styles.settingDescription}>
          14-day gradual activity increase to build account trust
        </Text>
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Auto-Start Warmup</Text>
        <Text style={styles.settingDescription}>
          Automatically start warmup for newly added accounts
        </Text>
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Daily Task Scheduling</Text>
        <Text style={styles.settingDescription}>
          Tasks are distributed throughout the day for natural activity
        </Text>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E11D48" />
          <Text style={styles.loadingText}>Loading warmup data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Warmup</Text>
        <TouchableOpacity onPress={loadWarmupData}>
          <Ionicons name="refresh" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'active' && renderActiveTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#E11D48',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#E11D48',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  warmupCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dayProgress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  tasksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  resumeButton: {
    backgroundColor: '#10B981',
  },
  skipButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default WarmupScreen;
