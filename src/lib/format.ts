function formatJpy(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

interface ChangeResult {
  change: number;
  pct: number;
  /** "+" for non-negative, "" for negative (formatJpy handles the minus sign) */
  sign: string;
}

function formatChange(current: number, prev: number): ChangeResult {
  const change = current - prev;
  const pct = prev !== 0 ? (change / prev) * 100 : 0;
  const sign = change >= 0 ? "+" : "";
  return { change, pct, sign };
}

export type { ChangeResult };
export { formatJpy, formatNumber, formatPercent, formatChange };
