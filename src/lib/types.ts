type AccountType =
  | "nisa"
  | "ideco"
  | "tokutei"
  | "crypto"
  | "gold"
  | "dc";

type HoldingType =
  | "fund"
  | "us_stock"
  | "us_etf"
  | "crypto"
  | "gold_coin_1oz"
  | "gold_bar_20g"
  | "dc_fund";

interface Account {
  id: number;
  name: string;
  type: AccountType;
  sort_order: number;
}

interface Holding {
  id: number;
  account_id: number;
  ticker: string;
  name: string;
  quantity: number;
  holding_type: HoldingType;
  as_of: string | null;
  monthly_amount: number | null;
}

interface HoldingWithValue extends Holding {
  price: number | null;
  currency: string;
  value_jpy: number | null;
  estimated_quantity: number | null;
}

interface AccountWithHoldings extends Account {
  holdings: HoldingWithValue[];
  total_jpy: number;
}

interface Snapshot {
  id: number;
  date: string;
  total_jpy: number;
  breakdown_json: string;
}

interface CategoryBreakdown {
  name: string;
  type: AccountType;
  value: number;
  color: string;
}

interface PortfolioData {
  total_jpy: number;
  usd_jpy: number;
  gold_coin_1oz_jpy: number;
  gold_bar_gram_jpy: number;
  accounts: AccountWithHoldings[];
  breakdown: CategoryBreakdown[];
}

export type {
  AccountType,
  HoldingType,
  Account,
  Holding,
  HoldingWithValue,
  AccountWithHoldings,
  Snapshot,
  CategoryBreakdown,
  PortfolioData,
};
