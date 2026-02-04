import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { LucideIcon } from 'lucide-react-native';
import { colors, spacing } from '../theme';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={48} color={colors.light.textTertiary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {action && (
        <Button mode="contained" onPress={action.onPress} style={styles.button}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary.main,
  },
});
