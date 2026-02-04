import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { clearAllData } from '../services/storage';
import { Info, Trash2, HelpCircle, Mail, Shield } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export function SettingsScreen() {
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all accounts, videos, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Toast.show({
              type: 'success',
              text1: 'Data Cleared',
              text2: 'All app data has been removed',
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <List.Item
            title="Version"
            description="1.0.0 (MVP)"
            left={(props) => <Info {...props} size={24} color={colors.light.textSecondary} />}
          />
          <Divider />
          <List.Item
            title="API Status"
            description="Connected to Visual Effects API"
            left={(props) => <Shield {...props} size={24} color={colors.success} />}
          />
        </View>

        {/* Help & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <List.Item
            title="How to Use"
            description="Learn how to use InstaDistro"
            left={(props) => <HelpCircle {...props} size={24} color={colors.light.textSecondary} />}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Quick Guide',
                text2: '1. Add accounts → 2. Add videos → 3. Apply effects → 4. Distribute',
              });
            }}
          />
          <Divider />
          <List.Item
            title="Contact Support"
            description="Get help with issues"
            left={(props) => <Mail {...props} size={24} color={colors.light.textSecondary} />}
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Contact',
                text2: 'support@instadistro.app',
              });
            }}
          />
        </View>

        {/* Features Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>87 Professional Effects</Text>
            <Text style={styles.featureDescription}>
              Apply artistic filters, frames, and adjustments to your videos
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>30% Modification Rule</Text>
            <Text style={styles.featureDescription}>
              Ensure compliance by modifying content by at least 30%
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Multi-Account Distribution</Text>
            <Text style={styles.featureDescription}>
              Upload to multiple Instagram accounts simultaneously
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
          <Button
            mode="outlined"
            onPress={handleClearData}
            style={styles.dangerButton}
            textColor={colors.error}
            icon={() => <Trash2 size={18} color={colors.error} />}
          >
            Clear All Data
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>InstaDistro MVP</Text>
          <Text style={styles.footerSubtext}>
            Built with React Native & Expo
          </Text>
          <Text style={styles.footerSubtext}>
            Powered by Visual Effects API
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  dangerButton: {
    borderColor: colors.error,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
});
