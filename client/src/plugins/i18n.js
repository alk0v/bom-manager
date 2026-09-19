import { createI18n } from 'vue-i18n';
import en from '../locales/en.json';
import uk from '../locales/uk.json';
import { en as vuetifyEn, uk as vuetifyUk } from 'vuetify/locale';

const messages = {
  en: {
    $vuetify: vuetifyEn,
    ...en,
  },
  uk: {
    $vuetify: vuetifyUk,
    ...uk,
  },
};

const savedLocale = localStorage.getItem('bom_language') || 'en';

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages,
});

export default i18n;
