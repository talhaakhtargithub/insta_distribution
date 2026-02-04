import { Platform } from 'react-native';

export const typography = {
  fonts: {
    primary: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
    mono: Platform.select({
      ios: 'SF Mono',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  styles: {
    h1: {
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 41,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      fontWeight: '600' as const,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 29,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 26,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 17,
    },
    button: {
      fontSize: 15,
      fontWeight: '600' as const,
      letterSpacing: 0.2,
    },
  },
};
