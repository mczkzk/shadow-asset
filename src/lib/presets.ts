import type { AccountType, HoldingType } from "./types";

interface AccountPreset {
  name: string;
  type: AccountType;
}

// Major brokerage presets grouped by account type
export const ACCOUNT_PRESETS: AccountPreset[] = [
  // NISA
  { name: "SBI証券 NISA", type: "nisa" },
  { name: "楽天証券 NISA", type: "nisa" },
  { name: "マネックス証券 NISA", type: "nisa" },
  { name: "松井証券 NISA", type: "nisa" },
  { name: "auカブコム証券 NISA", type: "nisa" },
  // iDeCo
  { name: "SBI証券 iDeCo", type: "ideco" },
  { name: "楽天証券 iDeCo", type: "ideco" },
  { name: "マネックス証券 iDeCo", type: "ideco" },
  // 特定口座
  { name: "SBI証券", type: "tokutei" },
  { name: "楽天証券", type: "tokutei" },
  { name: "マネックス証券", type: "tokutei" },
  { name: "松井証券", type: "tokutei" },
  { name: "auカブコム証券", type: "tokutei" },
  { name: "野村證券", type: "tokutei" },
  { name: "大和証券", type: "tokutei" },
  // 米国株
  { name: "SBI証券 米国株", type: "us_stock" },
  { name: "楽天証券 米国株", type: "us_stock" },
  { name: "マネックス証券 米国株", type: "us_stock" },
  // 仮想通貨
  { name: "bitFlyer", type: "crypto" },
  { name: "Coincheck", type: "crypto" },
  { name: "GMOコイン", type: "crypto" },
  { name: "bitbank", type: "crypto" },
  // ゴールド
  { name: "ゴールド現物 (自宅保管)", type: "gold" },
  { name: "田中貴金属", type: "gold" },
  { name: "三菱マテリアル", type: "gold" },
  // DC
  { name: "楽天証券 DC", type: "dc" },
  { name: "SBI証券 DC", type: "dc" },
  { name: "企業型DC", type: "dc" },
];

interface HoldingPreset {
  ticker: string;
  name: string;
  holdingType: HoldingType;
}

export const HOLDING_PRESETS: HoldingPreset[] = [
  // 投資信託 (人気順)
  { ticker: "0331418A", name: "eMAXIS Slim 全世界株式(オール・カントリー)", holdingType: "fund" },
  { ticker: "03311187", name: "eMAXIS Slim 米国株式(S&P500)", holdingType: "fund" },
  { ticker: "89311199", name: "SBI・V・S&P500インデックス・ファンド", holdingType: "fund" },
  { ticker: "0331418B", name: "eMAXIS Slim 先進国株式インデックス", holdingType: "fund" },
  { ticker: "9C311125", name: "楽天・全米株式インデックス・ファンド(楽天VTI)", holdingType: "fund" },
  // 米国株
  { ticker: "NVDA", name: "エヌビディア", holdingType: "us_stock" },
  { ticker: "AAPL", name: "アップル", holdingType: "us_stock" },
  { ticker: "MSFT", name: "マイクロソフト", holdingType: "us_stock" },
  { ticker: "GOOGL", name: "アルファベット", holdingType: "us_stock" },
  { ticker: "AMZN", name: "アマゾン", holdingType: "us_stock" },
  { ticker: "TSLA", name: "テスラ", holdingType: "us_stock" },
  { ticker: "META", name: "メタ・プラットフォームズ", holdingType: "us_stock" },
  // 米国ETF
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", holdingType: "us_etf" },
  { ticker: "VTI", name: "Vanguard Total Stock Market ETF", holdingType: "us_etf" },
  { ticker: "VT", name: "Vanguard Total World Stock ETF", holdingType: "us_etf" },
  { ticker: "QQQ", name: "Invesco QQQ Trust", holdingType: "us_etf" },
  { ticker: "GLDM", name: "SPDR Gold MiniShares", holdingType: "us_etf" },
  // 仮想通貨
  { ticker: "BTC", name: "ビットコイン", holdingType: "crypto" },
  { ticker: "ETH", name: "イーサリアム", holdingType: "crypto" },
  { ticker: "BCH", name: "ビットコインキャッシュ", holdingType: "crypto" },
  // ゴールド
  { ticker: "GOLD_COIN_1OZ", name: "金貨 1oz", holdingType: "gold_coin_1oz" },
  { ticker: "GOLD_BAR_20G", name: "金地金 20g", holdingType: "gold_bar_20g" },
  // DC
  { ticker: "9I312179", name: "楽天・全世界株式インデックス(楽天DC)", holdingType: "dc_fund" },
  { ticker: "9I311198", name: "楽天・全米株式インデックス(楽天DC)", holdingType: "dc_fund" },
  { ticker: "9I31116B", name: "楽天・インデックス・バランス(楽天DC)", holdingType: "dc_fund" },
];
