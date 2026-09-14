import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import { fetchMediaConfig } from './services/api';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);

// Pre-load media config
fetchMediaConfig().finally(() => {
  app.mount('#app');
});
