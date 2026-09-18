/**
 * Currency and formatting helpers for Financial Insights.
 */

/**
 * Formats a monetary amount into a clean currency string.
 * Supports fractions of a cent (e.g. $0.0085) for electronics components,
 * and standard 2 decimal places for whole dollars / totals ($2.50, $14.20).
 *
 * @param {number|string|null|undefined} amount - The amount to format
 * @param {Object} options
 * @param {string} [options.currency='$'] - Currency symbol
 * @param {boolean} [options.subCentPrecision=true] - Whether to show up to 4 decimal places for values < $1
 * @param {string} [options.fallback='—'] - Value to return when null/undefined
 * @returns {string}
 */
export function formatCurrency(amount, options = {}) {
  const {
    currency = '$',
    subCentPrecision = true,
    fallback = '—'
  } = options;

  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return fallback;
  }

  const num = Number(amount);
  if (num === 0) {
    return `${currency}0.00`;
  }

  const absNum = Math.abs(num);

  if (subCentPrecision && absNum < 0.01) {
    // Very small fraction (e.g. $0.0085)
    return `${currency}${num.toFixed(4)}`;
  } else if (subCentPrecision && absNum < 1) {
    // Less than 1 dollar (e.g. 0.259 -> $0.259, 0.2 -> $0.20)
    const str4 = num.toFixed(4);
    // If it has precision up to 3 or 4 places
    const trimmed = parseFloat(str4).toString();
    const parts = trimmed.split('.');
    if (parts.length > 1 && parts[1].length > 2) {
      return `${currency}${trimmed}`;
    }
    return `${currency}${num.toFixed(2)}`;
  } else {
    // Normal amount >= $1.00
    return `${currency}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}

/**
 * Formats date into readable string (e.g. 'Jul 20, 2024').
 */
export function formatDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateVal);
  }
}
