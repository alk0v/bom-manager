import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  UAH: '₴',
  PLN: 'zł'
};

export const CURRENCY_NAMES = {
  USD: 'US Dollar',
  EUR: 'Euro',
  UAH: 'Ukrainian Hryvnia',
  PLN: 'Polish Złoty'
};

export const useCurrencyStore = defineStore('currency', () => {
  const defaultCurrency = ref('USD');
  const secondaryCurrencies = ref(['EUR', 'UAH', 'PLN']);
  const supportedCurrencies = ref(['USD', 'EUR', 'UAH', 'PLN']);
  const rates = ref([]);
  const loading = ref(false);
  const loaded = ref(false);

  const defaultSymbol = computed(() => CURRENCY_SYMBOLS[defaultCurrency.value] || '$');

  const activeCurrencies = computed(() => {
    return [defaultCurrency.value, ...secondaryCurrencies.value];
  });

  const currencyOptions = computed(() => {
    return activeCurrencies.value.map(code => ({
      code,
      symbol: CURRENCY_SYMBOLS[code] || code,
      name: CURRENCY_NAMES[code] || code,
      label: `${code} (${CURRENCY_SYMBOLS[code] || code})`
    }));
  });

  const getSymbol = (code) => {
    if (!code) return defaultSymbol.value;
    return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
  };

  const loadCurrencies = async () => {
    loading.value = true;
    try {
      const data = await api.getCurrencySettings();
      if (data) {
        if (data.defaultCurrency) defaultCurrency.value = data.defaultCurrency;
        if (Array.isArray(data.secondaryCurrencies)) secondaryCurrencies.value = data.secondaryCurrencies;
        if (Array.isArray(data.supportedCurrencies)) supportedCurrencies.value = data.supportedCurrencies;
        if (Array.isArray(data.rates)) rates.value = data.rates;
        loaded.value = true;
      }
    } catch (err) {
      console.warn('Failed to load currency settings:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Find nearest rate from loaded rates
   */
  const getNearestRate = (fromCurrency, toCurrency = defaultCurrency.value, orderDate = null) => {
    const from = (fromCurrency || defaultCurrency.value).toUpperCase().trim();
    const to = (toCurrency || defaultCurrency.value).toUpperCase().trim();

    if (from === to) {
      return { rate: 1.0, isDirect: true };
    }

    const targetTime = orderDate ? new Date(orderDate).getTime() : Date.now();

    // Direct match
    const direct = rates.value.filter(r => r.fromCurrency === from && r.toCurrency === to);
    if (direct.length > 0) {
      let best = direct[0];
      let minDiff = Math.abs(new Date(best.rateDate).getTime() - targetTime);
      for (let i = 1; i < direct.length; i++) {
        const diff = Math.abs(new Date(direct[i].rateDate).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          best = direct[i];
        }
      }
      return { rate: Number(best.rate), rateDate: best.rateDate, isDirect: true };
    }

    // Inverse match
    const inverse = rates.value.filter(r => r.fromCurrency === to && r.toCurrency === from);
    if (inverse.length > 0) {
      let best = inverse[0];
      let minDiff = Math.abs(new Date(best.rateDate).getTime() - targetTime);
      for (let i = 1; i < inverse.length; i++) {
        const diff = Math.abs(new Date(inverse[i].rateDate).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          best = inverse[i];
        }
      }
      const invRate = Number(best.rate);
      return { rate: invRate > 0 ? (1 / invRate) : 1.0, rateDate: best.rateDate, isInverse: true };
    }

    return { rate: 1.0, isFallback: true };
  };

  const convertAmount = (amount, fromCurrency, toCurrency = defaultCurrency.value, orderDate = null) => {
    const val = Number(amount) || 0;
    const rateInfo = getNearestRate(fromCurrency, toCurrency, orderDate);
    return {
      converted: Math.round(val * rateInfo.rate * 100) / 100,
      rate: rateInfo.rate,
      rateDate: rateInfo.rateDate
    };
  };

  return {
    defaultCurrency,
    secondaryCurrencies,
    supportedCurrencies,
    rates,
    loading,
    loaded,
    defaultSymbol,
    activeCurrencies,
    currencyOptions,
    getSymbol,
    loadCurrencies,
    getNearestRate,
    convertAmount
  };
});
