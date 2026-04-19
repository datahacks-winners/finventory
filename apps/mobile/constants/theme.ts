/**
 * Finventory Theme Configuration
 * Based on Stitch design system - Material Design 3 color tokens
 * Primary: Ocean blue (#005f93)
 * Secondary: Warm orange (#8c4f14)
 * Tertiary: Gold accent (#725c07)
 * Surface: Warm off-white (#fff8f5)
 */

import { Platform } from 'react-native';

// Material Design 3 Color Tokens from Stitch designs
export const Colors = {
  light: {
    // Primary (Ocean Blue)
    primary: '#005f93',
    onPrimary: '#ffffff',
    primaryContainer: '#1e78b4',
    onPrimaryContainer: '#f7f9ff',
    primaryFixed: '#cde5ff',
    primaryFixedDim: '#95ccff',
    onPrimaryFixed: '#001d32',
    onPrimaryFixedVariant: '#004a75',

    // Secondary (Warm Orange)
    secondary: '#8c4f14',
    onSecondary: '#ffffff',
    secondaryContainer: '#fdac6a',
    onSecondaryContainer: '#773e01',
    secondaryFixed: '#ffdcc3',
    secondaryFixedDim: '#ffb77d',
    onSecondaryFixed: '#2f1500',
    onSecondaryFixedVariant: '#6e3900',

    // Tertiary (Gold Accent)
    tertiary: '#725c07',
    onTertiary: '#ffffff',
    tertiaryContainer: '#c5a952',
    onTertiaryContainer: '#4e3e00',
    tertiaryFixed: '#ffe085',
    tertiaryFixedDim: '#e2c46a',
    onTertiaryFixed: '#231b00',
    onTertiaryFixedVariant: '#574500',

    // Surface (Warm Off-White)
    background: '#fff8f5',
    onBackground: '#241911',
    surface: '#fff8f5',
    onSurface: '#241911',
    surfaceDim: '#ebd6c9',
    surfaceBright: '#fff8f5',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#fff1e9',
    surfaceContainer: '#ffeadc',
    surfaceContainerHigh: '#f9e4d7',
    surfaceContainerHighest: '#f3dfd1',
    surfaceVariant: '#f3dfd1',
    onSurfaceVariant: '#404750',
    inverseSurface: '#3a2e25',
    inverseOnSurface: '#ffede2',
    inversePrimary: '#95ccff',
    surfaceTint: '#00639a',

    // Error
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',

    // Outline
    outline: '#707881',
    outlineVariant: '#c0c7d1',

    // Legacy compatibility
    text: '#241911',
    tint: '#005f93',
    icon: '#707881',
    tabIconDefault: '#707881',
    tabIconSelected: '#005f93',
  },

  dark: {
    // Primary (Ocean Blue - Dark)
    primary: '#95ccff',
    onPrimary: '#003450',
    primaryContainer: '#004a75',
    onPrimaryContainer: '#cde5ff',
    primaryFixed: '#cde5ff',
    primaryFixedDim: '#95ccff',
    onPrimaryFixed: '#001d32',
    onPrimaryFixedVariant: '#004a75',

    // Secondary (Warm Orange - Dark)
    secondary: '#ffb77d',
    onSecondary: '#4f2500',
    secondaryContainer: '#6e3900',
    onSecondaryContainer: '#ffdcc3',
    secondaryFixed: '#ffdcc3',
    secondaryFixedDim: '#ffb77d',
    onSecondaryFixed: '#2f1500',
    onSecondaryFixedVariant: '#6e3900',

    // Tertiary (Gold Accent - Dark)
    tertiary: '#e2c46a',
    onTertiary: '#3b2f00',
    tertiaryContainer: '#574500',
    onTertiaryContainer: '#ffe085',
    tertiaryFixed: '#ffe085',
    tertiaryFixedDim: '#e2c46a',
    onTertiaryFixed: '#231b00',
    onTertiaryFixedVariant: '#574500',

    // Surface (Dark Warm)
    background: '#241911',
    onBackground: '#ffede2',
    surface: '#241911',
    onSurface: '#ffede2',
    surfaceDim: '#1a120d',
    surfaceBright: '#3a2e25',
    surfaceContainerLowest: '#150d08',
    surfaceContainerLow: '#1a120d',
    surfaceContainer: '#241911',
    surfaceContainerHigh: '#2f231b',
    surfaceContainerHighest: '#3a2e25',
    surfaceVariant: '#3a2e25',
    onSurfaceVariant: '#c0c7d1',
    inverseSurface: '#fff8f5',
    inverseOnSurface: '#241911',
    inversePrimary: '#005f93',
    surfaceTint: '#95ccff',

    // Error (Dark)
    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',

    // Outline (Dark)
    outline: '#8a919c',
    outlineVariant: '#404750',

    // Legacy compatibility
    text: '#ffede2',
    tint: '#95ccff',
    icon: '#8a919c',
    tabIconDefault: '#8a919c',
    tabIconSelected: '#95ccff',
  },
};

// Typography - Plus Jakarta Sans + Caveat accent
export const Fonts = Platform.select({
  ios: {
    sans: 'PlusJakartaSans',
    serif: 'ui-serif',
    rounded: 'PlusJakartaSans',
    mono: 'ui-monospace',
    accent: 'Caveat',
  },
  default: {
    sans: 'PlusJakartaSans',
    serif: 'serif',
    rounded: 'PlusJakartaSans',
    mono: 'monospace',
    accent: 'Caveat',
  },
  web: {
    sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Plus Jakarta Sans', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    accent: "'Caveat', cursive",
  },
});

// Spacing tokens (Material Design 3)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius tokens
export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

// Elevation/shadows
export const Elevation = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 12,
    elevation: 6,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  level5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 20,
  },
};

// Glass effect styles
export const Glass = {
  light: {
    backgroundColor: 'rgba(255, 248, 245, 0.7)',
    backdropFilter: 'blur(20px)',
  },
  dark: {
    backgroundColor: 'rgba(36, 25, 17, 0.7)',
    backdropFilter: 'blur(20px)',
  },
};

// Grade badge colors
export const GradeColors = {
  sushi: {
    background: '#005f93',
    text: '#ffffff',
    icon: '#cde5ff',
  },
  gradeA: {
    background: '#1e78b4',
    text: '#ffffff',
    icon: '#f7f9ff',
  },
  gradeB: {
    background: '#fdac6a',
    text: '#773e01',
    icon: '#8c4f14',
  },
  gradeC: {
    background: '#c5a952',
    text: '#4e3e00',
    icon: '#725c07',
  },
};
