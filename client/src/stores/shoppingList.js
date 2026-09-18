import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';

export const useShoppingListStore = defineStore('shoppingList', () => {
  const count = ref(0);
  const loading = ref(false);

  const refreshCount = async () => {
    try {
      loading.value = true;
      const list = await api.getShoppingList();
      count.value = Array.isArray(list) ? list.length : 0;
    } catch (err) {
      console.error('Failed to load shopping list count:', err);
    } finally {
      loading.value = false;
    }
  };

  const setCount = (val) => {
    count.value = Number(val) || 0;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('shopping-list-updated', () => {
      refreshCount();
    });
  }

  return {
    count,
    loading,
    refreshCount,
    setCount
  };
});
