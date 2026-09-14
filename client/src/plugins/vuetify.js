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
    primary: '#1D4ED8', // Deep modern royal blue
    'primary-darken-1': '#1E40AF',
    secondary: '#0F766E', // Refined teal
    'secondary-darken-1': '#115E59',
    accent: '#6366F1', // Indigo
    error: '#DC2626',
    info: '#0284C7',
    success: '#16A34A',
    warning: '#D97706',
    'on-background': '#0F172A',
    'on-surface': '#0F172A',
    'border-color': '#E2E8F0',
  }
};

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
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
