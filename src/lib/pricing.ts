import type { Holding, HoldingWithValue } from "./types";

const TROY_OZ_GRAMS = 31.1035;

function estimateQuantity(holding: Holding, currentPrice: number): number {
  if (!holding.as_of || !holding.monthly_amount || currentPrice <= 0) {
    return holding.quantity;
  }

  const asOf = new Date(holding.as_of);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - asOf.getFullYear()) * 12 +
    (now.getMonth() - asOf.getMonth());

  if (monthsElapsed <= 0) return holding.quantity;

  const additionalUnits = (monthsElapsed * holding.monthly_amount) / currentPrice;
  return holding.quantity + additionalUnits;
}

function calculateValueJpy(
  holding: Holding,
  price: number | null,
  currency: string,
  usdJpy: number,
  goldUsdOz: number
): HoldingWithValue {
  if (holding.holding_type === "gold_coin_1oz") {
    const valueJpy = goldUsdOz * usdJpy * holding.quantity;
    return {
      ...holding,
      price: goldUsdOz * usdJpy,
      currency: "JPY",
      value_jpy: valueJpy,
      estimated_quantity: null,
    };
  }

  if (holding.holding_type === "gold_bar_20g") {
    const pricePerGram = (goldUsdOz / TROY_OZ_GRAMS) * usdJpy;
    const valueJpy = pricePerGram * 20 * holding.quantity;
    return {
      ...holding,
      price: pricePerGram * 20,
      currency: "JPY",
      value_jpy: valueJpy,
      estimated_quantity: null,
    };
  }

  if (price == null) {
    return {
      ...holding,
      price: null,
      currency,
      value_jpy: null,
      estimated_quantity: null,
    };
  }

  const estimatedQty = estimateQuantity(holding, price);
  const isEstimated = estimatedQty !== holding.quantity;

  if (holding.holding_type === "fund" || holding.holding_type === "dc_fund") {
    // Japanese funds: price is per 10,000 units (基準価額)
    const valueJpy = (estimatedQty / 10000) * price;
    return {
      ...holding,
      price,
      currency: "JPY",
      value_jpy: valueJpy,
      estimated_quantity: isEstimated ? estimatedQty : null,
    };
  }

  if (currency === "USD") {
    const valueJpy = estimatedQty * price * usdJpy;
    return {
      ...holding,
      price,
      currency,
      value_jpy: valueJpy,
      estimated_quantity: isEstimated ? estimatedQty : null,
    };
  }

  // JPY-denominated (crypto etc.)
  const valueJpy = estimatedQty * price;
  return {
    ...holding,
    price,
    currency: "JPY",
    value_jpy: valueJpy,
    estimated_quantity: isEstimated ? estimatedQty : null,
  };
}

export { estimateQuantity, calculateValueJpy };
