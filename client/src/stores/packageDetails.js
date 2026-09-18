import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';

export const usePackageDetailsStore = defineStore('packageDetails', () => {
  const isOpen = ref(false);
  const loading = ref(false);
  const packageData = ref(null);
  let packagesCache = null;

  const openPackage = async (pkg) => {
    if (!pkg) return;

    let basePkg = typeof pkg === 'string' ? { package: pkg } : { ...pkg };

    packageData.value = {
      package: basePkg.package || '',
      pinQuantity: basePkg.pinQuantity ?? null,
      isSmd: basePkg.isSmd ?? null,
      drawingURL: basePkg.drawingURL ?? null,
      ID: basePkg.package_id || basePkg.packageId || basePkg.ID || null
    };

    isOpen.value = true;

    // If drawingURL or pinQuantity or isSmd is missing/undefined, fetch from packages list
    if (
      packageData.value.drawingURL === undefined ||
      packageData.value.pinQuantity === null ||
      packageData.value.isSmd === null
    ) {
      try {
        loading.value = true;
        if (!packagesCache) {
          packagesCache = await api.getPackages();
        }
        const found = packagesCache.find(
          p => (packageData.value.ID && p.ID === packageData.value.ID) ||
               (p.package && packageData.value.package && p.package.toLowerCase() === packageData.value.package.toLowerCase())
        );
        if (found) {
          packageData.value = {
            ...packageData.value,
            ID: found.ID,
            package: found.package,
            pinQuantity: found.pinQuantity,
            isSmd: found.isSmd,
            drawingURL: found.drawingURL
          };
        }
      } catch (err) {
        console.error('Error resolving package details:', err);
      } finally {
        loading.value = false;
      }
    }
  };

  const close = () => {
    isOpen.value = false;
  };

  return {
    isOpen,
    loading,
    packageData,
    openPackage,
    close
  };
});
