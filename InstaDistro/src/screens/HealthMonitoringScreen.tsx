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

interface SwarmHealth {
  avgScore: number;
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalAccounts: number;
  healthyAccounts: number;
  poorAccounts: number;
  criticalAccounts: number;
}

interface AccountHealth {
  id: string;
  username: string;
  healthScore: number;
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  postSuccessRate: number;
  errorRate24h: number;
  rateLimitHits: number;
  lastChecked: string;
}

interface Alert {
  id: string;
  accountId: string;
  username: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

const HealthMonitoringScreen = () => {
  const [swarmHealth, setSwarmHealth] = useState<SwarmHealth | null>(null);
  const [accounts, setAccounts] = useState<AccountHealth[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'alerts'>('overview');

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const [swarmRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/health/swarm`, {
          headers: { 'x-user-id': 'user_1' }
        }),
        axios.get(`${API_URL}/health/alerts`, {
          headers: { 'x-user-id': 'user_1' }
        }),
      ]);

      setSwarmHealth(swarmRes.data.overallHealth);
      setAccounts(swarmRes.data.accountHealthScores || []);
      setAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Error loading health data:', error);
      Alert.alert('Error', 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await axios.post(`${API_URL}/health/alerts/${alertId}/acknowledge`, {}, {
        headers: { 'x-user-id': 'user_1' }
      });
      loadHealthData();
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge alert');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await axios.post(`${API_URL}/health/alerts/${alertId}/resolve`, {}, {
        headers: { 'x-user-id': 'user_1' }
      });
      loadHealthData();
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve alert');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'excellent': return '#10B981';
      case 'good': return '#3B82F6';
      case 'fair': return '#F59E0B';
      case 'poor': return '#EF4444';
      case 'critical': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return '#3B82F6';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      case 'critical': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const renderHealthGauge = () => {
    if (!swarmHealth) return null;

    const score = swarmHealth.avgScore;
    const color = getCategoryColor(swarmHealth.category);
    const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

    return (
      <View style={styles.gaugeCard}>
        <Text style={styles.gaugeTitle}>Swarm Health Score</Text>
        <View style={styles.gaugeContainer}>
          <View style={styles.gauge}>
            <View style={[styles.gaugeArc, { borderColor: color }]} />
            <View style={[styles.gaugeNeedle, { transform: [{ rotate: `${rotation}deg` }] }]} />
            <View style={styles.gaugeCenter}>
              <Text style={[styles.gaugeScore, { color }]}>{Math.round(score)}</Text>
              <Text style={styles.gaugeLabel}>{swarmHealth.category.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.healthStats}>
          <View style={styles.healthStat}>
            <View style={[styles.healthDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.healthStatText}>{swarmHealth.healthyAccounts} Healthy</Text>
          </View>
          <View style={styles.healthStat}>
            <View style={[styles.healthDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.healthStatText}>{swarmHealth.poorAccounts} Poor</Text>
          </View>
          <View style={styles.healthStat}>
            <View style={[styles.healthDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.healthStatText}>{swarmHealth.criticalAccounts} Critical</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAccountCard = (account: AccountHealth) => {
    const color = getCategoryColor(account.category);

    return (
      <TouchableOpacity key={account.id} style={styles.accountCard}>
        <View style={styles.accountHeader}>
          <View>
            <Text style={styles.accountUsername}>@{account.username}</Text>
            <Text style={styles.accountCategory}>{account.category.toUpperCase()}</Text>
          </View>
          <View style={[styles.scoreCircle, { backgroundColor: color }]}>
            <Text style={styles.scoreText}>{Math.round(account.healthScore)}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={styles.metricText}>{account.postSuccessRate.toFixed(1)}% Success</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.metricText}>{account.errorRate24h.toFixed(1)}% Errors</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={styles.metricText}>{account.rateLimitHits} Limits</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAlertCard = (alert: Alert) => {
    const severityColor = getSeverityColor(alert.severity);

    return (
      <View key={alert.id} style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Ionicons
              name={alert.severity === 'critical' ? 'warning' : 'information-circle'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
          </View>
          <Text style={styles.alertTime}>
            {new Date(alert.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        <Text style={styles.alertUsername}>@{alert.username}</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>

        {!alert.acknowledged && (
          <View style={styles.alertActions}>
            <TouchableOpacity
              style={[styles.alertButton, styles.acknowledgeButton]}
              onPress={() => acknowledgeAlert(alert.id)}
            >
              <Text style={styles.alertButtonText}>Acknowledge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.alertButton, styles.resolveButton]}
              onPress={() => resolveAlert(alert.id)}
            >
              <Text style={styles.alertButtonText}>Resolve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderOverviewTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadHealthData();
        }} />
      }
    >
      {renderHealthGauge()}

      {/* Recent Alerts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {alerts.slice(0, 3).length > 0 ? (
          alerts.slice(0, 3).map(renderAlertCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark" size={48} color="#10B981" />
            <Text style={styles.emptyText}>No active alerts</Text>
          </View>
        )}
      </View>

      {/* Top Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Health</Text>
        {accounts.slice(0, 5).map(renderAccountCard)}
      </View>
    </ScrollView>
  );

  const renderAccountsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadHealthData();
        }} />
      }
    >
      {accounts.length > 0 ? (
        accounts.map(renderAccountCard)
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Accounts</Text>
          <Text style={styles.emptyText}>Add accounts to monitor their health</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderAlertsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadHealthData();
        }} />
      }
    >
      {alerts.length > 0 ? (
        alerts.map(renderAlertCard)
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark" size={64} color="#10B981" />
          <Text style={styles.emptyTitle}>No Alerts</Text>
          <Text style={styles.emptyText}>All systems healthy</Text>
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E11D48" />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Monitoring</Text>
        <TouchableOpacity onPress={loadHealthData}>
          <Ionicons name="refresh" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accounts' && styles.activeTab]}
          onPress={() => setActiveTab('accounts')}
        >
          <Text style={[styles.tabText, activeTab === 'accounts' && styles.activeTabText]}>
            Accounts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
            Alerts
          </Text>
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {alerts.filter(a => !a.acknowledged).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'accounts' && renderAccountsTab()}
      {activeTab === 'alerts' && renderAlertsTab()}
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
    position: 'relative',
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
  badge: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  gaugeCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gaugeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gauge: {
    width: 200,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gaugeArc: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: '#E5E7EB',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '180deg' }],
    top: -90,
  },
  gaugeNeedle: {
    position: 'absolute',
    width: 4,
    height: 90,
    backgroundColor: '#DC2626',
    borderRadius: 2,
    top: 10,
    transformOrigin: 'bottom center',
  },
  gaugeCenter: {
    alignItems: 'center',
    marginTop: 10,
  },
  gaugeScore: {
    fontSize: 48,
    fontWeight: '700',
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  healthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  healthStatText: {
    fontSize: 14,
    color: '#374151',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  accountCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  resolveButton: {
    backgroundColor: '#10B981',
  },
  alertButtonText: {
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

export default HealthMonitoringScreen;
