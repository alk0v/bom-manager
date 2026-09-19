import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './plugins/i18n';
import vuetify from './plugins/vuetify';
import { fetchMediaConfig } from './services/api';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(vuetify);

// Pre-load media config
fetchMediaConfig().finally(() => {
  app.mount('#app');
});
