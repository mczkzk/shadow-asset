import type { AccountType, HoldingType } from "./types";

interface AccountPreset {
  name: string;
  type: AccountType;
}

// Account = 証券会社 x 口座種類
// 米国株は口座ではなく保有銘柄の種類(特定口座やNISA内で保有)
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
  // 仮想通貨
  { name: "bitFlyer", type: "crypto" },
  { name: "Coincheck", type: "crypto" },
  { name: "GMOコイン", type: "crypto" },
  { name: "bitbank", type: "crypto" },
  // ゴールド
  { name: "ゴールド現物", type: "gold" },
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
  // 投資信託
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
  // ゴールド (GoldHoldingForm handles these directly)
  // DC / iDeCo (楽天証券) - ISINをティッカーとして使用
  { ticker: "JP90C000FHD2", name: "楽天・全米株式インデックス・ファンド", holdingType: "dc_fund" },
  { ticker: "JP90C000FHC4", name: "楽天・全世界株式インデックス・ファンド", holdingType: "dc_fund" },
  { ticker: "JP90C000GCQ3", name: "楽天・インデックス・バランス(DC年金)", holdingType: "dc_fund" },
];
