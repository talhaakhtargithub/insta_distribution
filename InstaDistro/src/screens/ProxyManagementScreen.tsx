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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface Proxy {
  id: string;
  host: string;
  port: number;
  type: 'http' | 'https' | 'socks5';
  username?: string;
  isActive: boolean;
  assignedAccounts: number;
  healthStatus: 'healthy' | 'slow' | 'failing' | 'dead';
  responseTime?: number;
  errorRate?: number;
  lastChecked?: string;
}

const ProxyManagementScreen = () => {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProxy, setNewProxy] = useState({
    host: '',
    port: '',
    type: 'http',
    username: '',
    password: '',
  });

  useEffect(() => {
    loadProxies();
  }, []);

  const loadProxies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/proxies`, {
        headers: { 'x-user-id': 'user_1' }
      });
      setProxies(response.data.proxies || []);
    } catch (error) {
      console.error('Error loading proxies:', error);
      Alert.alert('Error', 'Failed to load proxies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddProxy = async () => {
    if (!newProxy.host || !newProxy.port) {
      Alert.alert('Validation Error', 'Host and port are required');
      return;
    }

    try {
      await axios.post(`${API_URL}/proxies`, {
        host: newProxy.host,
        port: parseInt(newProxy.port),
        type: newProxy.type,
        username: newProxy.username || undefined,
        password: newProxy.password || undefined,
      }, {
        headers: { 'x-user-id': 'user_1' }
      });

      setShowAddModal(false);
      setNewProxy({ host: '', port: '', type: 'http', username: '', password: '' });
      Alert.alert('Success', 'Proxy added successfully');
      loadProxies();
    } catch (error) {
      Alert.alert('Error', 'Failed to add proxy');
    }
  };

  const handleTestProxy = async (proxyId: string) => {
    try {
      const response = await axios.post(`${API_URL}/proxies/${proxyId}/test`, {}, {
        headers: { 'x-user-id': 'user_1' }
      });
      Alert.alert('Test Result', `Status: ${response.data.status}\nResponse Time: ${response.data.responseTime}ms`);
      loadProxies();
    } catch (error) {
      Alert.alert('Error', 'Proxy test failed');
    }
  };

  const handleDeleteProxy = (proxyId: string) => {
    Alert.alert(
      'Delete Proxy',
      'Are you sure you want to delete this proxy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/proxies/${proxyId}`, {
                headers: { 'x-user-id': 'user_1' }
              });
              Alert.alert('Success', 'Proxy deleted');
              loadProxies();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete proxy');
            }
          },
        },
      ]
    );
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10B981';
      case 'slow': return '#F59E0B';
      case 'failing': return '#EF4444';
      case 'dead': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const renderProxyCard = (proxy: Proxy) => {
    const healthColor = getHealthColor(proxy.healthStatus);

    return (
      <View key={proxy.id} style={styles.proxyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.proxyInfo}>
            <Text style={styles.proxyHost}>{proxy.host}:{proxy.port}</Text>
            <View style={styles.proxyMeta}>
              <View style={[styles.typeBadge, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.typeBadgeText}>{proxy.type.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: healthColor }]}>
                <Text style={styles.statusText}>{proxy.healthStatus.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.activeToggle, { backgroundColor: proxy.isActive ? '#10B981' : '#6B7280' }]}
          >
            <Ionicons name={proxy.isActive ? 'checkmark' : 'close'} size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people" size={16} color="#6B7280" />
            <Text style={styles.statText}>{proxy.assignedAccounts} accounts</Text>
          </View>
          {proxy.responseTime && (
            <View style={styles.stat}>
              <Ionicons name="speedometer" size={16} color="#6B7280" />
              <Text style={styles.statText}>{proxy.responseTime}ms</Text>
            </View>
          )}
          {proxy.errorRate !== undefined && (
            <View style={styles.stat}>
              <Ionicons name="alert-circle" size={16} color="#6B7280" />
              <Text style={styles.statText}>{proxy.errorRate.toFixed(1)}% errors</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={() => handleTestProxy(proxy.id)}
          >
            <Ionicons name="flask" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProxy(proxy.id)}
          >
            <Ionicons name="trash" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddProxyModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Proxy</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <Text style={styles.label}>Host *</Text>
            <TextInput
              style={styles.input}
              placeholder="proxy.example.com"
              value={newProxy.host}
              onChangeText={(text) => setNewProxy({ ...newProxy, host: text })}
            />

            <Text style={styles.label}>Port *</Text>
            <TextInput
              style={styles.input}
              placeholder="8080"
              keyboardType="numeric"
              value={newProxy.port}
              onChangeText={(text) => setNewProxy({ ...newProxy, port: text })}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeButtons}>
              {['http', 'https', 'socks5'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    newProxy.type === type && styles.typeButtonActive
                  ]}
                  onPress={() => setNewProxy({ ...newProxy, type })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    newProxy.type === type && styles.typeButtonTextActive
                  ]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Username (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              value={newProxy.username}
              onChangeText={(text) => setNewProxy({ ...newProxy, username: text })}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="password"
              secureTextEntry
              value={newProxy.password}
              onChangeText={(text) => setNewProxy({ ...newProxy, password: text })}
              autoCapitalize="none"
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.addButton]}
              onPress={handleAddProxy}
            >
              <Text style={styles.addButtonText}>Add Proxy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E11D48" />
          <Text style={styles.loadingText}>Loading proxies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Proxy Management</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color="#E11D48" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadProxies();
          }} />
        }
      >
        {proxies.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="globe" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Proxies</Text>
            <Text style={styles.emptyText}>
              Add proxies to route your account traffic through different IPs
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add First Proxy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          proxies.map(renderProxyCard)
        )}
      </ScrollView>

      {renderAddProxyModal()}
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
  content: {
    flex: 1,
    padding: 16,
  },
  proxyCard: {
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
  proxyInfo: {
    flex: 1,
  },
  proxyHost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  proxyMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
  activeToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
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
  testButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
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
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  addButton: {
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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

export default ProxyManagementScreen;
