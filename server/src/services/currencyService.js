const pool = require('../db');

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'UAH', 'PLN'];

const CURRENCY_METADATA = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', sign: '$' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', sign: '€' },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', sign: '₴' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', sign: 'zł' }
};

/**
 * Get the current default system currency (stored in t_config or default 'USD')
 */
async function getDefaultCurrency(conn = null) {
  const db = conn || pool;
  const [rows] = await db.query("SELECT c_value FROM t_config WHERE c_key = 'defaultCurrency' LIMIT 1");
  if (rows && rows.length > 0 && rows[0].c_value) {
    const val = rows[0].c_value.toUpperCase().trim();
    if (SUPPORTED_CURRENCIES.includes(val)) {
      return val;
    }
  }
  return 'USD';
}

/**
 * Get active secondary currencies (up to 3, stored in t_config as JSON or default)
 */
async function getSecondaryCurrencies(conn = null) {
  const db = conn || pool;
  const def = await getDefaultCurrency(db);
  const [rows] = await db.query("SELECT c_value FROM t_config WHERE c_key = 'secondaryCurrencies' LIMIT 1");
  if (rows && rows.length > 0 && rows[0].c_value) {
    try {
      const parsed = JSON.parse(rows[0].c_value);
      if (Array.isArray(parsed)) {
        return parsed
          .map(c => String(c).toUpperCase().trim())
          .filter(c => SUPPORTED_CURRENCIES.includes(c) && c !== def)
          .slice(0, 3);
      }
    } catch (e) {
      // ignore
    }
  }
  // Default: all supported currencies except the default currency (up to 3)
  return SUPPORTED_CURRENCIES.filter(c => c !== def).slice(0, 3);
}

/**
 * Fetch all exchange rates sorted by date descending
 */
async function getAllRates(conn = null) {
  const db = conn || pool;
  const [rows] = await db.query('SELECT id, fromCurrency, toCurrency, rate, rateDate, createdAt FROM t_exchange_rates ORDER BY rateDate DESC, id DESC');
  return rows.map(r => ({
    id: r.id,
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: parseFloat(r.rate) || 1,
    rateDate: r.rateDate ? (r.rateDate instanceof Date ? r.rateDate.toISOString().slice(0, 10) : String(r.rateDate).slice(0, 10)) : new Date().toISOString().slice(0, 10),
    createdAt: r.createdAt
  }));
}

/**
 * Find the nearest exchange rate for an order date.
 * If 1 fromCurrency = R toCurrency, rate is R.
 */
function findNearestRate(allRates, fromCurrency, toCurrency, orderDate) {
  const from = (fromCurrency || 'USD').toUpperCase().trim();
  const to = (toCurrency || 'USD').toUpperCase().trim();

  if (from === to) {
    return { rate: 1.0, rateDate: orderDate || new Date().toISOString().slice(0, 10), isDirect: true };
  }

  const targetTime = orderDate ? new Date(orderDate).getTime() : Date.now();

  // 1. Direct match: from -> to
  const directMatches = allRates.filter(r => r.fromCurrency === from && r.toCurrency === to);
  if (directMatches.length > 0) {
    let best = directMatches[0];
    let minDiff = Math.abs(new Date(best.rateDate).getTime() - targetTime);
    for (let i = 1; i < directMatches.length; i++) {
      const diff = Math.abs(new Date(directMatches[i].rateDate).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        best = directMatches[i];
      }
    }
    return {
      rate: Number(best.rate),
      rateDate: best.rateDate,
      isDirect: true
    };
  }

  // 2. Inverse match: to -> from (rate becomes 1 / rate)
  const inverseMatches = allRates.filter(r => r.fromCurrency === to && r.toCurrency === from);
  if (inverseMatches.length > 0) {
    let best = inverseMatches[0];
    let minDiff = Math.abs(new Date(best.rateDate).getTime() - targetTime);
    for (let i = 1; i < inverseMatches.length; i++) {
      const diff = Math.abs(new Date(inverseMatches[i].rateDate).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        best = inverseMatches[i];
      }
    }
    const inv = Number(best.rate);
    return {
      rate: inv > 0 ? (1 / inv) : 1.0,
      rateDate: best.rateDate,
      isInverse: true
    };
  }

  // Fallback 1:1
  return {
    rate: 1.0,
    rateDate: orderDate || new Date().toISOString().slice(0, 10),
    isFallback: true
  };
}

/**
 * Converts an order's price and total to the target currency (defaults to system default currency)
 */
function convertOrderPrice(order, allRates, targetCurrency) {
  const fromCurrency = order.currency || 'USD';
  const price = parseFloat(order.price) || 0;
  const qty = parseInt(order.qty, 10) || 0;
  const orderDate = order.date ? (order.date instanceof Date ? order.date.toISOString().slice(0, 10) : String(order.date).slice(0, 10)) : null;

  const rateInfo = findNearestRate(allRates, fromCurrency, targetCurrency, orderDate);
  const convertedPrice = Math.round(price * rateInfo.rate * 10000) / 10000;
  const convertedTotalCost = Math.round(convertedPrice * qty * 100) / 100;
  const originalTotalCost = Math.round(price * qty * 100) / 100;

  return {
    currency: fromCurrency,
    originalPrice: price,
    originalTotalCost,
    price: convertedPrice, // converted into targetCurrency
    totalCost: convertedTotalCost, // converted into targetCurrency
    convertedPrice,
    convertedTotalCost,
    exchangeRate: rateInfo.rate,
    exchangeRateDate: rateInfo.rateDate
  };
}

/**
 * Recalculate convertedPrice in t_orders for all orders against the current default currency
 */
async function recalculateAllOrders(conn = null) {
  const db = conn || pool;
  const defaultCurrency = await getDefaultCurrency(db);
  const allRates = await getAllRates(db);

  const [orders] = await db.query('SELECT id, price, qty, date, currency FROM t_orders');
  let updatedCount = 0;

  for (const ord of orders) {
    const fromCurrency = ord.currency || defaultCurrency;
    const price = parseFloat(ord.price) || 0;
    const orderDate = ord.date ? (ord.date instanceof Date ? ord.date.toISOString().slice(0, 10) : String(ord.date).slice(0, 10)) : null;

    let convertedPrice = price;
    if (fromCurrency !== defaultCurrency) {
      const rateInfo = findNearestRate(allRates, fromCurrency, defaultCurrency, orderDate);
      convertedPrice = Math.round(price * rateInfo.rate * 10000) / 10000;
    }

    await db.query('UPDATE t_orders SET convertedPrice = ? WHERE id = ?', [convertedPrice, ord.id]);
    updatedCount++;
  }

  return { defaultCurrency, updatedCount };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  CURRENCY_METADATA,
  getDefaultCurrency,
  getSecondaryCurrencies,
  getAllRates,
  findNearestRate,
  convertOrderPrice,
  recalculateAllOrders
};
