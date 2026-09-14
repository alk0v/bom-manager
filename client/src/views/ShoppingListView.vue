<template>
  <div class="shopping-list-view">
    <v-card elevation="1" class="rounded-xl border overflow-hidden">
      <v-card-item class="bg-surface-variant py-3 px-4">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <div class="d-flex align-center">
            <v-icon color="amber-darken-2" class="me-2">mdi-cart-outline</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Procurement Shopping List
                <v-chip size="x-small" color="amber-darken-2" class="ms-1 font-weight-bold">
                  {{ items.length }} items
                </v-chip>
              </div>
              <div class="text-caption text-disabled">
                Planned electronic parts purchases and BOM shortage replenishment
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <v-btn
              prepend-icon="mdi-content-copy"
              size="small"
              variant="outlined"
              :disabled="items.length === 0"
              @click="copyShoppingList"
            >
              Copy Text
            </v-btn>

            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              :loading="loading"
              @click="loadShoppingList"
            />
          </div>
        </div>
      </v-card-item>

      <v-divider />

      <!-- Table -->
      <v-table density="comfortable" hover class="shopping-table">
        <thead>
          <tr>
            <th class="text-left font-weight-bold" style="width: 50px;">Photo</th>
            <th class="text-left font-weight-bold">Component / Part</th>
            <th class="text-left font-weight-bold">Category</th>
            <th class="text-left font-weight-bold">Package</th>
            <th class="text-center font-weight-bold">Current Stock</th>
            <th class="text-center font-weight-bold" style="width: 140px;">Quantity to Buy</th>
            <th class="text-center font-weight-bold">Date Added</th>
            <th class="text-right font-weight-bold" style="width: 80px;">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in items" :key="item.id">
            <!-- Photo -->
            <td>
              <v-avatar rounded="lg" size="36" class="border">
                <MediaImage
                  type="component"
                  :src="item.photoURL"
                  height="36px"
                  width="36px"
                />
              </v-avatar>
            </td>

            <!-- Name -->
            <td>
              <div class="font-mono font-weight-bold text-body-2 text-primary">
                {{ item.component }}
              </div>
              <div class="text-caption text-disabled" v-if="item.marking || item.shortDescription">
                <span v-if="item.marking" class="font-mono me-2">{{ item.marking }}</span>
                <span v-if="item.shortDescription">{{ item.shortDescription }}</span>
              </div>
            </td>

            <!-- Category -->
            <td>
              <v-chip size="x-small" variant="tonal" color="info" v-if="item.category">
                {{ item.category }}
              </v-chip>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Package -->
            <td>
              <span class="font-mono text-caption" v-if="item.package">{{ item.package }}</span>
              <span v-else class="text-disabled text-caption">—</span>
            </td>

            <!-- Stock -->
            <td class="text-center font-mono">
              <v-chip size="small" :color="item.stockQuantity > 0 ? 'success' : 'default'" variant="flat">
                {{ item.stockQuantity ?? 0 }}
              </v-chip>
            </td>

            <!-- Quantity to Buy with inc/dec buttons -->
            <td class="text-center">
              <div class="d-flex align-center justify-center gap-1">
                <v-btn
                  icon="mdi-minus"
                  size="x-small"
                  variant="outlined"
                  :disabled="item.qty <= 1"
                  @click="updateQuantity(item, item.qty - 1)"
                />
                <span class="font-mono font-weight-bold px-2">{{ item.qty }}</span>
                <v-btn
                  icon="mdi-plus"
                  size="x-small"
                  variant="outlined"
                  @click="updateQuantity(item, item.qty + 1)"
                />
              </div>
            </td>

            <!-- Date -->
            <td class="text-center text-caption text-disabled font-mono">
              {{ formatDate(item.date) }}
            </td>

            <!-- Actions -->
            <td class="text-right">
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                color="error"
                variant="text"
                title="Remove from shopping list"
                @click="removeItem(item)"
              />
            </td>
          </tr>

          <tr v-if="items.length === 0 && !loading">
            <td colspan="8" class="text-center py-10 text-disabled">
              <v-icon size="48" class="mb-2">mdi-cart-check</v-icon>
              <div class="text-subtitle-1">Your procurement shopping list is empty</div>
              <div class="text-caption">Add shortages directly from project BOMs or from the component catalog.</div>
            </td>
          </tr>

          <tr v-if="loading">
            <td colspan="8" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import MediaImage from '../components/MediaImage.vue';

const items = ref([]);
const loading = ref(false);

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
});

const notify = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return d;
  }
};

const loadShoppingList = async () => {
  loading.value = true;
  try {
    items.value = await api.getShoppingList();
  } catch (err) {
    notify('Failed to load shopping list: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const updateQuantity = async (item, newQty) => {
  if (newQty < 1) return;
  try {
    await api.updateShoppingListItem(item.id, { qty: newQty });
    item.qty = newQty;
  } catch (err) {
    notify('Failed to update quantity: ' + err.message, 'error');
  }
};

const removeItem = async (item) => {
  try {
    await api.deleteShoppingListItem(item.id);
    items.value = items.value.filter(i => i.id !== item.id);
    notify(`Removed ${item.component} from shopping list`);
  } catch (err) {
    notify('Failed to remove item: ' + err.message, 'error');
  }
};

const copyShoppingList = () => {
  const text = items.value
    .map(i => `${i.component} (${i.package || 'N/A'}) - Qty: ${i.qty}`)
    .join('\n');
  navigator.clipboard.writeText(text);
  notify('Shopping list copied to clipboard!');
};

onMounted(() => {
  loadShoppingList();
});
</script>

<style scoped>
.shopping-table :deep(th) {
  background-color: var(--v-theme-surface-variant);
  font-size: 0.82rem;
}
</style>
