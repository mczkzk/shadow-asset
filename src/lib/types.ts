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
  | "gold_coin_half_oz"
  | "gold_coin_quarter_oz"
  | "gold_coin_tenth_oz"
  | "gold_bar_5g"
  | "gold_bar_10g"
  | "gold_bar_20g"
  | "gold_bar_50g"
  | "gold_bar_100g"
  | "gold_bar_500g"
  | "gold_bar_1kg"
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
  asset_class: string | null;
}

interface HoldingWithValue extends Holding {
  price: number | null;
  currency: string;
  value_jpy: number | null;
  estimated_quantity: number | null;
  prev_value_jpy: number | null;
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

interface MfPreviewRow extends Omit<Snapshot, "id"> {}

interface MfImportPreview {
  rows: MfPreviewRow[];
  skipped_today: boolean;
  skipped_existing: number;
}

interface MfImportResult {
  imported: number;
}

interface CategoryBreakdown {
  name: string;
  type: string;
  value: number;
  color: string;
}

interface PortfolioData {
  total_jpy: number;
  usd_jpy: number;
  gold_coin_oz_jpy: number;
  gold_bar_gram_jpy: number;
  accounts: AccountWithHoldings[];
  breakdown: CategoryBreakdown[];
  prev_total_jpy: number | null;
  prev_date: string | null;
  manual_assets: ManualAssetWithJpy[];
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  nisa: "NISA",
  ideco: "iDeCo",
  tokutei: "特定口座",
  crypto: "仮想通貨",
  gold: "ゴールド",
  dc: "確定拠出年金",
};

interface ManualAsset {
  id: number;
  name: string;
  asset_class: string;
  value_jpy: number | null;
  currency: string | null;
  amount: number | null;
}

interface ManualAssetWithJpy extends ManualAsset {
  converted_jpy: number | null;
}

const MANUAL_ASSET_CLASS_ORDER = ["現金", "個人向け国債", "外貨預金", "不動産", "保険", "生活防衛資金"] as const;

function getManualAssetJpy(a: ManualAssetWithJpy): number {
  return a.converted_jpy ?? a.value_jpy ?? 0;
}

function groupManualAssetsByClass(assets: ManualAssetWithJpy[]): { label: string; items: ManualAssetWithJpy[] }[] {
  const groups: Record<string, ManualAssetWithJpy[]> = {};
  for (const a of assets) {
    (groups[a.asset_class] ??= []).push(a);
  }
  return MANUAL_ASSET_CLASS_ORDER
    .filter((c) => groups[c]?.length)
    .map((c) => ({ label: c, items: groups[c] }));
}

interface AllocationHolding {
  name: string;
  ticker: string;
  holding_type: string;
  value_jpy: number;
}

interface AllocationItem {
  name: string;
  value: number;
  color: string;
  holdings: AllocationHolding[];
}

interface AllocationData {
  total_jpy: number;
  items: AllocationItem[];
  manual_assets: ManualAssetWithJpy[];
  snapshot_date: string | null;
  forex_rates: Record<string, number>;
}

export type {
  AccountType,
  HoldingType,
  Account,
  Holding,
  HoldingWithValue,
  AccountWithHoldings,
  Snapshot,
  MfPreviewRow,
  MfImportPreview,
  MfImportResult,
  CategoryBreakdown,
  PortfolioData,
  ManualAsset,
  ManualAssetWithJpy,
  AllocationItem,
  AllocationData,
};

export {
  ACCOUNT_TYPE_LABELS,
  MANUAL_ASSET_CLASS_ORDER,
  getManualAssetJpy,
  groupManualAssetsByClass,
};
