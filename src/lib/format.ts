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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export { formatJpy, formatNumber, formatPercent };
