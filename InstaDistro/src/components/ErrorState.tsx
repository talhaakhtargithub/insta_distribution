import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { AlertCircle } from 'lucide-react-native';
import { colors, spacing } from '../theme';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AlertCircle size={48} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button mode="outlined" onPress={onRetry} style={styles.button}>
          {retryText}
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  button: {
    borderColor: colors.error,
    minWidth: 140,
  },
});
