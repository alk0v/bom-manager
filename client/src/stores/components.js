import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useComponentsStore = defineStore('components', () => {
  const totalComponents = ref(0);

  const setTotalComponents = (count) => {
    totalComponents.value = count;
  };

  return {
    totalComponents,
    setTotalComponents
  };
});
