export type ThemeName = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  headerBackground: string;
  headerText: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarLabel: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  warning: string;
  cardBackground: string;
  cardText: string;
  progress: string;
  progressTrack: string;
};

export type Theme = {
  name: ThemeName;
  colors: ThemeColors;
};

export const Themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    colors: {
      background: '#0F172A',
      surface: '#1E293B',
      border: '#334155',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      headerBackground: '#0F172A',
      headerText: '#F8FAFC',
      tabBarBackground: '#0F172A',
      tabBarBorder: '#1E293B',
      tabBarActive: '#6366F1',
      tabBarLabel: '#94A3B8',
      buttonPrimaryBg: '#6366F1',
      buttonPrimaryText: '#FFFFFF',
      warning: '#F59E0B',
      cardBackground: '#FFFFFF',
      cardText: '#111827',
      progress: '#6366F1',
      progressTrack: '#1F2937',
    },
  },
  light: {
    name: 'light',
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textSecondary: '#475569',
      headerBackground: '#FFFFFF',
      headerText: '#0F172A',
      tabBarBackground: '#FFFFFF',
      tabBarBorder: '#E2E8F0',
      tabBarActive: '#6366F1',
      tabBarLabel: '#475569',
      buttonPrimaryBg: '#6366F1',
      buttonPrimaryText: '#FFFFFF',
      warning: '#B45309',
      cardBackground: '#FFFFFF',
      cardText: '#111827',
      progress: '#6366F1',
      progressTrack: '#E5E7EB',
    },
  },
};

export const getTheme = (name: ThemeName): Theme => Themes[name];
