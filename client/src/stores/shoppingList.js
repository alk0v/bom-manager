import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';

export const useShoppingListStore = defineStore('shoppingList', () => {
  const items = ref([]);
  const count = ref(0);
  const loading = ref(false);

  const componentIds = computed(() => {
    return new Set(items.value.map(item => Number(item.componentId)));
  });

  const isInShoppingList = (componentId) => {
    if (!componentId) return false;
    return componentIds.value.has(Number(componentId));
  };

  const refreshCount = async () => {
    try {
      loading.value = true;
      const list = await api.getShoppingList();
      items.value = Array.isArray(list) ? list : [];
      count.value = items.value.length;
    } catch (err) {
      console.error('Failed to load shopping list count:', err);
    } finally {
      loading.value = false;
    }
  };

  const setCount = (val) => {
    count.value = Number(val) || 0;
  };

  const setItems = (newItems) => {
    items.value = Array.isArray(newItems) ? newItems : [];
    count.value = items.value.length;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('shopping-list-updated', () => {
      refreshCount();
    });
  }

  return {
    items,
    count,
    loading,
    componentIds,
    isInShoppingList,
    refreshCount,
    setCount,
    setItems
  };
});
