import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { colors } from './colors';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary.main,
    secondary: colors.secondary.main,
    tertiary: colors.primary.light,
    error: colors.error,
    background: colors.light.background,
    surface: colors.light.surface,
    surfaceVariant: colors.light.surfaceVariant,
    outline: colors.light.border,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: colors.light.textPrimary,
    onSurface: colors.light.textPrimary,
  },
  roundness: 12,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary.light,
    secondary: colors.secondary.light,
    background: colors.dark.background,
    surface: colors.dark.surface,
    surfaceVariant: colors.dark.surfaceVariant,
    outline: colors.dark.border,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: colors.dark.textPrimary,
    onSurface: colors.dark.textPrimary,
  },
  roundness: 12,
};
