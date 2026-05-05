import { useState, useEffect, useCallback, useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { Account, Holding, AccountType, HoldingType, AllocationData } from "@/lib/types";
import { ACCOUNT_TYPE_LABELS } from "@/lib/types";
import { ACCOUNT_PRESETS, HOLDING_PRESETS } from "@/lib/presets";
import { formatNumber } from "@/lib/format";
import type { CsvImportPreview } from "@/lib/api";
import * as api from "@/lib/api";
import ManualAssetList from "@/components/allocation/ManualAssetList";

// 口座種類ごとに登録可能な保有種類
// NISA/特定口座: 投信も米国株もETFも全て保有可能
const ALLOWED_HOLDING_TYPES: Record<AccountType, HoldingType[]> = {
  nisa: ["fund", "us_stock", "us_etf"],
  ideco: ["fund", "dc_fund"],
  tokutei: ["fund", "us_stock", "us_etf"],
  crypto: ["crypto"],
  gold: ["gold_coin_1oz", "gold_coin_half_oz", "gold_coin_quarter_oz", "gold_coin_tenth_oz", "gold_bar_1kg", "gold_bar_500g", "gold_bar_100g", "gold_bar_50g", "gold_bar_20g", "gold_bar_10g", "gold_bar_5g"],
  dc: ["fund", "dc_fund"],
};

const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  fund: "投資信託",
  us_stock: "米国株",
  us_etf: "米国ETF",
  crypto: "仮想通貨",
  gold_coin_1oz: "金貨 1oz",
  gold_coin_half_oz: "金貨 1/2oz",
  gold_coin_quarter_oz: "金貨 1/4oz",
  gold_coin_tenth_oz: "金貨 1/10oz",
  gold_bar_1kg: "金地金 1kg",
  gold_bar_500g: "金地金 500g",
  gold_bar_100g: "金地金 100g",
  gold_bar_50g: "金地金 50g",
  gold_bar_20g: "金地金 20g",
  gold_bar_10g: "金地金 10g",
  gold_bar_5g: "金地金 5g",
  dc_fund: "DC年金ファンド",
};

function AccountForm({
  onCreated,
  existingNames,
}: {
  onCreated: () => void;
  existingNames: Set<string>;
}) {
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredPresets = useMemo(() => {
    const q = filter.toLowerCase();
    return ACCOUNT_PRESETS.filter(
      (p) =>
        !existingNames.has(p.name) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          ACCOUNT_TYPE_LABELS[p.type].toLowerCase().includes(q))
    );
  }, [filter, existingNames]);

  const handleAdd = async (name: string, type: AccountType) => {
    setError(null);
    try {
      await api.createAccount({ name, type });
      setFilter("");
      onCreated();
    } catch (e) {
      setError(String(e));
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<AccountType, typeof filteredPresets>();
    for (const p of filteredPresets) {
      const list = map.get(p.type) ?? [];
      list.push(p);
      map.set(p.type, list);
    }
    return map;
  }, [filteredPresets]);

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="証券会社名で検索..."
        className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <div className="max-h-64 space-y-3 overflow-y-auto">
        {[...grouped.entries()].map(([type, presets]) => (
          <div key={type}>
            <p className="mb-1 text-xs font-medium text-zinc-400">
              {ACCOUNT_TYPE_LABELS[type]}
            </p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleAdd(p.name, p.type)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {grouped.size === 0 && (
          <p className="text-sm text-zinc-400">該当する口座がありません</p>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Gold: holding_type encodes both category and size. quantity = number of items.
const GOLD_PRESETS: { label: string; holdingType: HoldingType }[] = [
  { label: "金貨 1oz", holdingType: "gold_coin_1oz" },
  { label: "金貨 1/2oz", holdingType: "gold_coin_half_oz" },
  { label: "金貨 1/4oz", holdingType: "gold_coin_quarter_oz" },
  { label: "金貨 1/10oz", holdingType: "gold_coin_tenth_oz" },
  { label: "金地金 1kg", holdingType: "gold_bar_1kg" },
  { label: "金地金 500g", holdingType: "gold_bar_500g" },
  { label: "金地金 100g", holdingType: "gold_bar_100g" },
  { label: "金地金 50g", holdingType: "gold_bar_50g" },
  { label: "金地金 20g", holdingType: "gold_bar_20g" },
  { label: "金地金 10g", holdingType: "gold_bar_10g" },
  { label: "金地金 5g", holdingType: "gold_bar_5g" },
];

function GoldHoldingForm({
  accountId,
  onCreated,
}: {
  accountId: number;
  onCreated: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preset = GOLD_PRESETS[selectedIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity) return;
    setError(null);
    try {
      await api.createHolding({
        account_id: accountId,
        ticker: "GOLD",
        name: preset.label,
        quantity: parseFloat(quantity), // number of coins/bars
        holding_type: preset.holdingType,
        monthly_amount: null,
      });
      setQuantity("");
      onCreated();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-3 rounded-lg bg-zinc-50 p-3">
      <div>
        <label className="block text-xs text-zinc-500">種類・サイズ</label>
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
          className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm"
        >
          {GOLD_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>{p.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-500">個数</label>
        <input
          type="number"
          step="1"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="例: 2"
          className="mt-1 w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
        />
      </div>
      <button type="submit" className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">
        追加
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

// Standard form for stocks, funds, crypto, DC
function HoldingForm({
  accountId,
  accountType,
  onCreated,
}: {
  accountId: number;
  accountType: AccountType;
  onCreated: () => void;
}) {
  const allowedTypes = ALLOWED_HOLDING_TYPES[accountType];

  // Gold uses its own simplified form
  if (accountType === "gold") {
    return <GoldHoldingForm accountId={accountId} onCreated={onCreated} />;
  }

  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [holdingType, setHoldingType] = useState<HoldingType>(allowedTypes[0]);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Show tsumitate fields only for fund types
  const showTsumitate = accountType === "nisa" || accountType === "ideco" || accountType === "tokutei" || accountType === "dc";

  // Inline suggestions based on ticker input
  const suggestions = useMemo(() => {
    if (ticker.length === 0) return [];
    const q = ticker.toLowerCase();
    return HOLDING_PRESETS.filter(
      (p) =>
        allowedTypes.includes(p.holdingType) &&
        (p.ticker.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [ticker, allowedTypes]);

  const selectSuggestion = (preset: (typeof HOLDING_PRESETS)[number]) => {
    setTicker(preset.ticker);
    setName(preset.name);
    setHoldingType(preset.holdingType);
    setShowSuggestions(false);
  };

  const handleTickerChange = (value: string) => {
    setTicker(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !name.trim() || !quantity) return;
    setError(null);

    try {
      await api.createHolding({
        account_id: accountId,
        ticker: ticker.trim(),
        name: name.trim(),
        quantity: parseFloat(quantity),
        holding_type: holdingType,
        monthly_amount: monthlyAmount ? parseFloat(monthlyAmount) : null,
      });

      setTicker("");
      setName("");
      setQuantity("");
      setMonthlyAmount("");
      setShowSuggestions(false);
      onCreated();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="relative">
          <label className="block text-xs text-zinc-500">ティッカー</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => handleTickerChange(e.target.value)}
            onFocus={() => ticker.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={
              accountType === "crypto"
                ? "例: BTC"
                : "例: NVDA, オルカン"
            }
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg">
              {suggestions.map((p) => (
                <button
                  key={p.ticker}
                  type="button"
                  onMouseDown={() => selectSuggestion(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50"
                >
                  <span className="truncate text-zinc-700">{p.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-zinc-400">
                    {p.ticker}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs text-zinc-500">銘柄名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={accountType === "crypto" ? "例: ビットコイン" : "例: アルファベット"}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500">数量</label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={accountType === "crypto" ? "例: 0.5" : "例: 10"}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        {allowedTypes.length > 1 && accountType !== "ideco" && accountType !== "dc" && (
          <div>
            <label className="block text-xs text-zinc-500">種類</label>
            <select
              value={holdingType}
              onChange={(e) => setHoldingType(e.target.value as HoldingType)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            >
              {allowedTypes.map((t) => (
                <option key={t} value={t}>
                  {HOLDING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        )}
        {showTsumitate && (
          <div>
            <label className="block text-xs text-zinc-500">
              月額積立 (円)
            </label>
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="例: 50000"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
        )}
      </div>
      <button
        type="submit"
        className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
      >
        銘柄を追加
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </form>
  );
}

function quantityUnit(h: Holding): string {
  switch (h.holding_type) {
    case "fund":
    case "dc_fund":
      return "口";
    case "crypto":
      return h.ticker;
    case "gold_coin_1oz":
    case "gold_coin_half_oz":
    case "gold_coin_quarter_oz":
    case "gold_coin_tenth_oz":
      return "枚";
    case "gold_bar_5g":
    case "gold_bar_10g":
    case "gold_bar_20g":
    case "gold_bar_50g":
    case "gold_bar_100g":
    case "gold_bar_500g":
    case "gold_bar_1kg":
      return "本";
    default:
      return "株";
  }
}

function EditableHolding({
  holding,
  onUpdated,
  onDelete,
}: {
  holding: Holding;
  onUpdated: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(holding.quantity));
  const [monthly, setMonthly] = useState(
    holding.monthly_amount != null ? String(holding.monthly_amount) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      await api.updateHolding({
        id: holding.id,
        ticker: holding.ticker,
        name: holding.name,
        quantity: parseFloat(qty),
        holding_type: holding.holding_type,
        monthly_amount: monthly ? parseFloat(monthly) : null,
      });
      setEditing(false);
      onUpdated();
    } catch (e) {
      setError(String(e));
    }
  };

  if (editing) {
    return (
      <div className="rounded bg-zinc-50 px-2 py-2 text-sm">
        <div className="mb-1 font-medium text-zinc-700">
          {holding.name}
          <span className="ml-2 text-xs text-zinc-400">{holding.ticker}</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-zinc-500">数量</label>
            <input
              type="number"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">月額積立 (円)</label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="円"
              className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          {holding.as_of && (
            <div className="text-xs text-zinc-400">
              数量確認日: {holding.as_of}
            </div>
          )}
          <button
            onClick={handleSave}
            className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
          >
            保存
          </button>
          <button
            onClick={() => setEditing(false)}
            className="py-1 text-xs text-zinc-400 hover:text-zinc-600"
          >
            キャンセル
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-zinc-50">
      <button
        onClick={() => setEditing(true)}
        className="text-left"
      >
        <span className="font-medium text-zinc-700">{holding.name}</span>
        <span className="ml-2 text-xs text-zinc-400">{holding.ticker}</span>
        <span className="ml-2 text-xs text-zinc-500">
          {formatNumber(holding.quantity, holding.quantity % 1 === 0 ? 0 : 4)}{" "}
          {quantityUnit(holding)}
        </span>
        {holding.monthly_amount != null && holding.monthly_amount > 0 && (
          <span className="ml-2 text-xs text-indigo-400">
            積立{holding.monthly_amount.toLocaleString()}円/月
          </span>
        )}
      </button>
      <button
        onClick={onDelete}
        className="text-xs text-red-400 hover:text-red-600"
      >
        削除
      </button>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [allocationData, setAllocationData] = useState<AllocationData | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);

  const refresh = useCallback(async () => {
    const [a, h] = await Promise.all([api.getAccounts(), api.getHoldings()]);
    setAccounts(a);
    setHoldings(h);
  }, []);

  const refreshManualAssets = useCallback(async () => {
    setAllocationData(await api.fetchAllocation());
  }, []);

  useEffect(() => {
    refresh();
    refreshManualAssets();
  }, [refresh, refreshManualAssets]);

  const existingNames = useMemo(
    () => new Set(accounts.map((a) => a.name)),
    [accounts]
  );

  const handleDeleteAccount = async (id: number) => {
    try {
      await api.deleteAccount(id);
      setExpandedAccount(null);
      setConfirmDeleteId(null);
      await refresh();
    } catch (e) {
      alert(`削除に失敗しました: ${e}`);
    }
  };

  const handleDeleteHolding = async (id: number) => {
    try {
      await api.deleteHolding(id);
      await refresh();
    } catch (e) {
      alert(`削除に失敗しました: ${e}`);
    }
  };

  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvImportPreview | null>(null);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvApplied, setCsvApplied] = useState(false);

  const handleCsvImport = async (broker: string) => {
    setCsvError(null);
    setCsvPreview(null);
    setCsvApplied(false);
    try {
      const path = await open({
        filters: [{ name: "CSV", extensions: ["csv"] }],
        multiple: false,
      });
      if (!path || typeof path !== "string") return;
      setCsvImportLoading(true);
      const preview = await api.previewCsvImport(path, broker);
      setCsvPreview(preview);
    } catch (e) {
      setCsvError(`CSV読込失敗: ${e}`);
    } finally {
      setCsvImportLoading(false);
    }
  };

  const handleCsvApply = async () => {
    if (!csvPreview) return;
    setCsvError(null);
    try {
      await api.applyCsvImport(csvPreview.updates);
      setCsvApplied(true);
      await refresh();
    } catch (e) {
      setCsvError(`CSV適用失敗: ${e}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-lg font-bold text-zinc-800">保有管理</h1>
        <div className="flex gap-2">
        <div className="relative group">
          <button
            disabled={csvImportLoading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
            </svg>
            {csvImportLoading ? "読込中..." : "CSV取込"}
          </button>
          <div className="invisible absolute right-0 z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg group-hover:visible">
            <button
              onClick={() => handleCsvImport("sbi")}
              className="block w-full px-4 py-2 text-left hover:bg-zinc-50"
            >
              <span className="text-sm font-medium text-zinc-700">SBI証券</span>
              <span className="mt-0.5 block text-xs text-zinc-400">ポートフォリオ → CSVダウンロード</span>
            </button>
            <button
              onClick={() => handleCsvImport("rakuten")}
              className="block w-full px-4 py-2 text-left hover:bg-zinc-50"
            >
              <span className="text-sm font-medium text-zinc-700">楽天証券</span>
              <span className="mt-0.5 block text-xs text-zinc-400">取引履歴 → 投資信託 → すべて → CSVで保存</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {csvError && (
        <p className="text-xs text-red-500">{csvError}</p>
      )}

      {csvPreview && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${csvApplied ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${csvApplied ? "text-emerald-800" : "text-blue-800"}`}>
              {csvApplied
                ? `適用完了: ${csvPreview.updates.length}件更新`
                : `CSV読込結果: ${csvPreview.updates.length}件の更新候補`}
              {csvPreview.unmatched.length > 0 && `、${csvPreview.unmatched.length}件未マッチ`}
            </span>
            <div className="flex items-center gap-2">
              {!csvApplied && csvPreview.updates.length > 0 && (
                <button
                  onClick={handleCsvApply}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  適用する
                </button>
              )}
              <button
                onClick={() => { setCsvPreview(null); setCsvApplied(false); }}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                閉じる
              </button>
            </div>
          </div>
          {csvPreview.updates.length > 0 && (
            <div className="mt-2 space-y-1">
              {csvPreview.updates.map((u, i) => (
                <div key={i} className={`text-xs ${csvApplied ? "text-emerald-700" : "text-blue-700"}`}>
                  {u.account_name} / {u.fund_name}: {formatNumber(u.old_quantity, 0)} → {formatNumber(u.new_quantity, 0)} 口
                </div>
              ))}
            </div>
          )}
          {csvPreview.unmatched.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-amber-700">未マッチ (DBに該当銘柄なし):</p>
              {csvPreview.unmatched.map((u, i) => (
                <div key={i} className="text-xs text-amber-600">
                  {u.fund_name} ({u.section}): {formatNumber(u.quantity, 0)} 口
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">口座</h2>
        {!showAddAccount && (
          <button
            onClick={() => setShowAddAccount(true)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            + 口座を追加
          </button>
        )}
      </div>

      {showAddAccount && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700">口座を追加</h3>
            <button
              onClick={() => setShowAddAccount(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              閉じる
            </button>
          </div>
          <AccountForm onCreated={() => { refresh(); setShowAddAccount(false); }} existingNames={existingNames} />
        </div>
      )}

      <div className="space-y-3">
        {accounts.map((account) => {
          const accountHoldings = holdings.filter(
            (h) => h.account_id === account.id
          );
          const isExpanded = expandedAccount === account.id;

          return (
            <div
              key={account.id}
              className="rounded-xl border border-zinc-200 bg-white"
            >
              <div className="flex items-center justify-between px-5 py-3">
                <button
                  onClick={() =>
                    setExpandedAccount(isExpanded ? null : account.id)
                  }
                  className="flex items-center gap-2 text-left"
                >
                  <span className="text-xs text-zinc-400">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">
                      {account.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {ACCOUNT_TYPE_LABELS[account.type] ?? account.type} (
                      {accountHoldings.length}銘柄)
                    </p>
                  </div>
                </button>
                {confirmDeleteId === account.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">削除する?</span>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600"
                    >
                      はい
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      いいえ
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(account.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    削除
                  </button>
                )}
              </div>

              {/* Holdings summary (collapsed) */}
              {!isExpanded && accountHoldings.length > 0 && (
                <div className="border-t border-zinc-50 px-5 py-2">
                  {accountHoldings.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-0.5 text-xs text-zinc-500"
                    >
                      <span>{h.name}</span>
                      <span>
                        {formatNumber(h.quantity, h.quantity % 1 === 0 ? 0 : 4)}{" "}
                        {quantityUnit(h)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Holdings detail (expanded) */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-5 py-3">
                  <div className="space-y-1">
                    {accountHoldings.map((h) => (
                      <EditableHolding
                        key={h.id}
                        holding={h}
                        onUpdated={refresh}
                        onDelete={() => handleDeleteHolding(h.id)}
                      />
                    ))}
                  </div>
                  <HoldingForm
                    accountId={account.id}
                    accountType={account.type}
                    onCreated={refresh}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <p className="text-center text-sm text-zinc-400">
          「+ 口座を追加」から口座を追加してください
        </p>
      )}

      <ManualAssetList
        assets={allocationData?.manual_assets ?? []}
        forexRates={allocationData?.forex_rates ?? {}}
        onChanged={refreshManualAssets}
      />
    </div>
  );
}
