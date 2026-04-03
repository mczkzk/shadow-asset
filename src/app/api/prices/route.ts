import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateValueJpy } from "@/lib/pricing";
import type { Holding, HoldingType, AccountWithHoldings, CategoryBreakdown } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default;

const ACCOUNT_COLORS: Record<string, string> = {
  nisa: "#4F46E5",
  ideco: "#7C3AED",
  tokutei: "#2563EB",
  us_stock: "#059669",
  crypto: "#D97706",
  gold: "#CA8A04",
  dc: "#DC2626",
};

async function fetchUsdJpy(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v2/latest?base=USD&symbols=JPY");
    const data = await res.json();
    return data.rates.JPY;
  } catch {
    return 150;
  }
}

async function fetchGoldUsdOz(): Promise<number> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU");
    const data = await res.json();
    return data.price;
  } catch {
    return 2300;
  }
}

async function fetchCryptoPricesJpy(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const idMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    BCH: "bitcoin-cash",
  };

  const ids = symbols.map((s) => idMap[s.toUpperCase()] ?? s.toLowerCase());

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=jpy`
    );
    const data = await res.json();

    const result: Record<string, number> = {};
    for (const symbol of symbols) {
      const id = idMap[symbol.toUpperCase()] ?? symbol.toLowerCase();
      if (data[id]?.jpy) {
        result[symbol.toUpperCase()] = data[id].jpy;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchStockPrices(
  tickers: string[]
): Promise<Record<string, { price: number; currency: string }>> {
  if (tickers.length === 0) return {};

  const result: Record<string, { price: number; currency: string }> = {};

  for (const ticker of tickers) {
    try {
      const q = await yahooFinance.quote(ticker);
      if (q.regularMarketPrice) {
        result[q.symbol] = {
          price: q.regularMarketPrice,
          currency: q.currency ?? "USD",
        };
      }
    } catch {
      // skip failed ticker
    }
  }

  return result;
}

interface DbRow {
  [key: string]: unknown;
}

export async function GET(): Promise<NextResponse> {
  const db = getDb();

  const accounts = db.prepare("SELECT * FROM accounts ORDER BY sort_order, id").all() as DbRow[];
  const allHoldings = db.prepare("SELECT * FROM holdings ORDER BY id").all() as DbRow[];

  // Categorize tickers
  const stockTickers: string[] = [];
  const cryptoSymbols: string[] = [];

  for (const h of allHoldings) {
    if (h.holding_type === "crypto") {
      cryptoSymbols.push(String(h.ticker));
    } else if (h.holding_type !== "gold_coin_1oz" && h.holding_type !== "gold_bar_20g") {
      stockTickers.push(String(h.ticker));
    }
  }

  const [usdJpy, goldUsdOz, cryptoPrices, stockPrices] = await Promise.all([
    fetchUsdJpy(),
    fetchGoldUsdOz(),
    fetchCryptoPricesJpy([...new Set(cryptoSymbols)]),
    fetchStockPrices([...new Set(stockTickers)]),
  ]);

  let grandTotal = 0;
  const accountsWithHoldings: AccountWithHoldings[] = accounts.map((account) => {
    const accountHoldings = allHoldings.filter((h) => h.account_id === account.id);

    const holdings = accountHoldings.map((h) => {
      const holding: Holding = {
        id: Number(h.id),
        account_id: Number(h.account_id),
        ticker: String(h.ticker),
        name: String(h.name),
        quantity: Number(h.quantity),
        holding_type: String(h.holding_type) as HoldingType,
        as_of: h.as_of ? String(h.as_of) : null,
        monthly_amount: h.monthly_amount ? Number(h.monthly_amount) : null,
      };

      let price: number | null = null;
      let currency = "JPY";

      if (holding.holding_type === "crypto") {
        price = cryptoPrices[holding.ticker.toUpperCase()] ?? null;
      } else if (holding.holding_type !== "gold_coin_1oz" && holding.holding_type !== "gold_bar_20g") {
        const sp = stockPrices[holding.ticker];
        if (sp) {
          price = sp.price;
          currency = sp.currency;
        }
      }

      return calculateValueJpy(holding, price, currency, usdJpy, goldUsdOz);
    });

    const total = holdings.reduce((sum, h) => sum + (h.value_jpy ?? 0), 0);
    grandTotal += total;

    return {
      id: Number(account.id),
      name: String(account.name),
      type: String(account.type) as AccountWithHoldings["type"],
      sort_order: Number(account.sort_order),
      holdings,
      total_jpy: total,
    };
  });

  const breakdown: CategoryBreakdown[] = accountsWithHoldings
    .filter((a) => a.total_jpy > 0)
    .map((a) => ({
      name: a.name,
      type: a.type,
      value: a.total_jpy,
      color: ACCOUNT_COLORS[a.type] ?? "#6B7280",
    }));

  // Save daily snapshot
  const today = new Date().toISOString().slice(0, 10);
  try {
    db.prepare(
      "INSERT OR REPLACE INTO snapshots (date, total_jpy, breakdown_json) VALUES (?, ?, ?)"
    ).run(today, grandTotal, JSON.stringify(breakdown));
  } catch {
    // ignore snapshot save failure
  }

  return NextResponse.json({
    total_jpy: grandTotal,
    usd_jpy: usdJpy,
    gold_usd_oz: goldUsdOz,
    accounts: accountsWithHoldings,
    breakdown,
  });
}
