import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface Schedule {
  id: string;
  name: string;
  type: 'one-time' | 'recurring' | 'queue' | 'bulk';
  scheduledTime: string;
  accountIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface OptimalTime {
  hour: number;
  score: number;
  reason: string;
}

const AdvancedSchedulingScreen = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'optimal'>('list');

  useEffect(() => {
    loadSchedulingData();
  }, []);

  const loadSchedulingData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, optimalRes] = await Promise.all([
        axios.get(`${API_URL}/schedules`, {
          headers: { 'x-user-id': 'user_1' }
        }),
        axios.get(`${API_URL}/schedules/optimal-times/all`, {
          headers: { 'x-user-id': 'user_1' }
        }).catch(() => ({ data: { optimalTimes: [] } })),
      ]);

      setSchedules(schedulesRes.data.schedules || []);
      setOptimalTimes(optimalRes.data.optimalTimes || []);
    } catch (error) {
      console.error('Error loading scheduling data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'processing': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'one-time': return 'time';
      case 'recurring': return 'repeat';
      case 'queue': return 'list';
      case 'bulk': return 'layers';
      default: return 'calendar';
    }
  };

  const renderScheduleCard = (schedule: Schedule) => {
    const statusColor = getStatusColor(schedule.status);
    const typeIcon = getTypeIcon(schedule.type);

    return (
      <TouchableOpacity key={schedule.id} style={styles.scheduleCard}>
        <View style={styles.cardHeader}>
          <View style={styles.scheduleInfo}>
            <View style={styles.titleRow}>
              <Ionicons name={typeIcon as any} size={20} color="#E11D48" />
              <Text style={styles.scheduleName}>{schedule.name}</Text>
            </View>
            <Text style={styles.scheduleType}>{schedule.type.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{schedule.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.scheduleDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {new Date(schedule.scheduledTime).toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{schedule.accountIds.length} accounts</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOptimalTimesCard = () => (
    <View style={styles.optimalCard}>
      <Text style={styles.sectionTitle}>Best Times to Post</Text>
      <Text style={styles.sectionSubtitle}>
        Based on your account's historical performance
      </Text>

      {optimalTimes.length > 0 ? (
        optimalTimes.map((time, index) => (
          <View key={index} style={styles.optimalTimeRow}>
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>
                {time.hour}:00 - {time.hour + 1}:00
              </Text>
              <Text style={styles.reasonText}>{time.reason}</Text>
            </View>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBar, { width: `${time.score}%` }]} />
              <Text style={styles.scoreText}>{Math.round(time.score)}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.placeholderTimes}>
          <View style={styles.optimalTimeRow}>
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>09:00 - 10:00</Text>
              <Text style={styles.reasonText}>Morning engagement peak</Text>
            </View>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBar, { width: '85%' }]} />
              <Text style={styles.scoreText}>85</Text>
            </View>
          </View>
          <View style={styles.optimalTimeRow}>
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>15:00 - 16:00</Text>
              <Text style={styles.reasonText}>Afternoon activity surge</Text>
            </View>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBar, { width: '80%' }]} />
              <Text style={styles.scoreText}>80</Text>
            </View>
          </View>
          <View style={styles.optimalTimeRow}>
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>21:00 - 22:00</Text>
              <Text style={styles.reasonText}>Evening prime time</Text>
            </View>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBar, { width: '90%' }]} />
              <Text style={styles.scoreText}>90</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderListView = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadSchedulingData();
        }} />
      }
    >
      {schedules.length > 0 ? (
        schedules.map(renderScheduleCard)
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Schedules</Text>
          <Text style={styles.emptyText}>
            Create a schedule to automate your posting
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderOptimalView = () => (
    <ScrollView style={styles.content}>
      {renderOptimalTimesCard()}

      <View style={styles.heatmapPlaceholder}>
        <Text style={styles.sectionTitle}>Posting Heatmap</Text>
        <Text style={styles.sectionSubtitle}>Coming soon</Text>
        <View style={styles.heatmapGrid}>
          {Array.from({ length: 7 }).map((_, day) => (
            <View key={day} style={styles.heatmapRow}>
              {Array.from({ length: 24 }).map((_, hour) => (
                <View
                  key={hour}
                  style={[
                    styles.heatmapCell,
                    {
                      backgroundColor:
                        Math.random() > 0.7
                          ? '#10B981'
                          : Math.random() > 0.4
                          ? '#F59E0B'
                          : '#E5E7EB',
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E11D48" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scheduling</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={28} color="#E11D48" />
        </TouchableOpacity>
      </View>

      <View style={styles.viewSelector}>
        <TouchableOpacity
          style={[styles.viewButton, activeView === 'list' && styles.activeViewButton]}
          onPress={() => setActiveView('list')}
        >
          <Ionicons name="list" size={20} color={activeView === 'list' ? '#E11D48' : '#6B7280'} />
          <Text style={[styles.viewButtonText, activeView === 'list' && styles.activeViewText]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, activeView === 'calendar' && styles.activeViewButton]}
          onPress={() => setActiveView('calendar')}
        >
          <Ionicons name="calendar" size={20} color={activeView === 'calendar' ? '#E11D48' : '#6B7280'} />
          <Text style={[styles.viewButtonText, activeView === 'calendar' && styles.activeViewText]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, activeView === 'optimal' && styles.activeViewButton]}
          onPress={() => setActiveView('optimal')}
        >
          <Ionicons name="analytics" size={20} color={activeView === 'optimal' ? '#E11D48' : '#6B7280'} />
          <Text style={[styles.viewButtonText, activeView === 'optimal' && styles.activeViewText]}>
            Optimal
          </Text>
        </TouchableOpacity>
      </View>

      {activeView === 'list' && renderListView()}
      {activeView === 'optimal' && renderOptimalView()}
      {activeView === 'calendar' && (
        <View style={styles.comingSoon}>
          <Ionicons name="calendar" size={64} color="#D1D5DB" />
          <Text style={styles.comingSoonText}>Calendar View Coming Soon</Text>
        </View>
      )}
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
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  activeViewButton: {
    backgroundColor: '#FEE2E2',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeViewText: {
    color: '#E11D48',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  scheduleInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scheduleType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scheduleDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  optimalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  optimalTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#10B981',
    borderRadius: 4,
    width: 60,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    minWidth: 30,
  },
  placeholderTimes: {
    opacity: 0.7,
  },
  heatmapPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heatmapGrid: {
    marginTop: 12,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
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

export default AdvancedSchedulingScreen;
