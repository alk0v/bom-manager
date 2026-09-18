import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const lightTheme = {
  dark: false,
  colors: {
    background: '#F1F5F9', // Crisp modern slate-100 background
    surface: '#FFFFFF',
    'surface-variant': '#F8FAFC',
    'on-surface-variant': '#0F172A', // Dark text on surface-variant
    primary: '#1D4ED8', // Deep modern royal blue
    'primary-darken-1': '#1E40AF',
    'on-primary': '#FFFFFF',
    secondary: '#0F766E', // Refined teal
    'secondary-darken-1': '#115E59',
    'on-secondary': '#FFFFFF',
    accent: '#6366F1', // Indigo
    error: '#DC2626',
    'on-error': '#FFFFFF',
    info: '#0284C7',
    'on-info': '#FFFFFF',
    success: '#16A34A',
    'on-success': '#FFFFFF',
    warning: '#D97706',
    'on-warning': '#FFFFFF',
    'on-background': '#0F172A',
    'on-surface': '#0F172A',
    'border-color': '#E2E8F0',
  }
};

const darkTheme = {
  dark: true,
  colors: {
    background: '#0F172A',
    surface: '#1E293B',
    'surface-variant': '#334155',
    'on-surface-variant': '#F8FAFC',
    primary: '#3B82F6',
    'primary-darken-1': '#2563EB',
    'on-primary': '#FFFFFF',
    secondary: '#14B8A6',
    'secondary-darken-1': '#0D9488',
    'on-secondary': '#FFFFFF',
    accent: '#818CF8',
    error: '#EF4444',
    'on-error': '#FFFFFF',
    info: '#38BDF8',
    'on-info': '#FFFFFF',
    success: '#22C55E',
    'on-success': '#FFFFFF',
    warning: '#F59E0B',
    'on-warning': '#FFFFFF',
    'on-background': '#F8FAFC',
    'on-surface': '#F8FAFC',
    'border-color': '#334155',
  }
};

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
      dark: darkTheme,
    }
  },
  defaults: {
    VCard: {
      rounded: 0
    },
    VDialog: {
      rounded: 0
    }
  }
});
