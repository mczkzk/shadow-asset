import { useState, useEffect, useCallback, useMemo } from "react";
import type { Account, Holding, AccountType, HoldingType } from "@/lib/types";
import { ACCOUNT_PRESETS, HOLDING_PRESETS } from "@/lib/presets";
import { formatNumber } from "@/lib/format";
import * as api from "@/lib/api";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  nisa: "NISA",
  ideco: "iDeCo",
  tokutei: "特定口座",
  us_stock: "米国株",
  crypto: "仮想通貨",
  gold: "ゴールド",
  dc: "確定拠出年金",
};

const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  fund: "投資信託",
  us_stock: "米国株",
  us_etf: "米国ETF",
  crypto: "仮想通貨",
  gold_coin_1oz: "金貨1oz",
  gold_bar_20g: "金地金20g",
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

  // Group by type
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
          <p className="text-sm text-zinc-400">
            該当する口座がありません
          </p>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function HoldingForm({
  accountId,
  accountType,
  onCreated,
}: {
  accountId: number;
  accountType: AccountType;
  onCreated: () => void;
}) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [holdingType, setHoldingType] = useState<HoldingType>("fund");
  const [asOf, setAsOf] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter suggestions based on account type and search query
  const suggestions = useMemo(() => {
    const typeFilter: HoldingType[] = (() => {
      switch (accountType) {
        case "nisa":
        case "tokutei":
          return ["fund", "us_stock", "us_etf"];
        case "ideco":
          return ["fund"];
        case "us_stock":
          return ["us_stock", "us_etf"];
        case "crypto":
          return ["crypto"];
        case "gold":
          return ["gold_coin_1oz", "gold_bar_20g"];
        case "dc":
          return ["dc_fund"];
        default:
          return [];
      }
    })();

    const q = searchQuery.toLowerCase();
    return HOLDING_PRESETS.filter(
      (p) =>
        typeFilter.includes(p.holdingType) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.ticker.toLowerCase().includes(q))
    );
  }, [accountType, searchQuery]);

  const selectPreset = (preset: (typeof HOLDING_PRESETS)[number]) => {
    setTicker(preset.ticker);
    setName(preset.name);
    setHoldingType(preset.holdingType);
    setShowSuggestions(false);
    setSearchQuery("");
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
        as_of: asOf || null,
        monthly_amount: monthlyAmount ? parseFloat(monthlyAmount) : null,
      });

      setTicker("");
      setName("");
      setQuantity("");
      setAsOf("");
      setMonthlyAmount("");
      onCreated();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3">
      {/* Suggestion area */}
      <div>
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {showSuggestions ? "▼ 銘柄を選択" : "▶ 銘柄を選択"}
        </button>
        {showSuggestions && (
          <div className="mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="銘柄名・ティッカーで検索..."
              className="mb-2 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
            <div className="max-h-40 overflow-y-auto">
              {suggestions.map((p) => (
                <button
                  key={p.ticker}
                  type="button"
                  onClick={() => selectPreset(p)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-indigo-50"
                >
                  <span className="text-zinc-700">{p.name}</span>
                  <span className="text-xs text-zinc-400">{p.ticker}</span>
                </button>
              ))}
              {suggestions.length === 0 && (
                <p className="px-2 py-1 text-xs text-zinc-400">
                  該当なし (下のフォームで手動入力可)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-zinc-500">ティッカー</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="例: NVDA, BTC"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">銘柄名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: エヌビディア"
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
              placeholder="例: 10"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">種類</label>
            <select
              value={holdingType}
              onChange={(e) => setHoldingType(e.target.value as HoldingType)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            >
              {Object.entries(HOLDING_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">
              確認日 (積立用)
            </label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
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
        </div>
        <button
          type="submit"
          className="mt-2 rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
        >
          銘柄を追加
        </button>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </form>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [a, h] = await Promise.all([api.getAccounts(), api.getHoldings()]);
    setAccounts(a);
    setHoldings(h);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const existingNames = useMemo(
    () => new Set(accounts.map((a) => a.name)),
    [accounts]
  );

  const handleDeleteAccount = async (id: number) => {
    if (!confirm("この口座と全銘柄を削除しますか?")) return;
    await api.deleteAccount(id);
    await refresh();
  };

  const handleDeleteHolding = async (id: number) => {
    await api.deleteHolding(id);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-800">保有管理</h1>
        <p className="text-sm text-zinc-500">口座と銘柄の追加、編集、削除</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          口座を追加
        </h2>
        <AccountForm onCreated={refresh} existingNames={existingNames} />
      </div>

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
                      {ACCOUNT_TYPE_LABELS[account.type] ?? account.type} ({accountHoldings.length}銘柄)
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>

              {/* Holdings summary (always visible) */}
              {!isExpanded && accountHoldings.length > 0 && (
                <div className="border-t border-zinc-50 px-5 py-2">
                  {accountHoldings.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-0.5 text-xs text-zinc-500"
                    >
                      <span>{h.name}</span>
                      <span>
                        {formatNumber(
                          h.quantity,
                          h.quantity % 1 === 0 ? 0 : 4
                        )}{" "}
                        {h.holding_type === "fund" || h.holding_type === "dc_fund"
                          ? "口"
                          : h.holding_type === "crypto"
                            ? h.ticker
                            : h.holding_type === "gold_coin_1oz"
                              ? "oz"
                              : h.holding_type === "gold_bar_20g"
                                ? "本"
                                : "株"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-zinc-100 px-5 py-3">
                  <div className="space-y-1">
                    {accountHoldings.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        <div>
                          <span className="font-medium text-zinc-700">
                            {h.name}
                          </span>
                          <span className="ml-2 text-xs text-zinc-400">
                            {h.ticker}
                          </span>
                          <span className="ml-2 text-xs text-zinc-500">
                            {formatNumber(
                              h.quantity,
                              h.quantity % 1 === 0 ? 0 : 4
                            )}
                            {h.holding_type === "fund" || h.holding_type === "dc_fund"
                              ? "口"
                              : h.holding_type === "crypto"
                                ? ` ${h.ticker}`
                                : h.holding_type === "gold_coin_1oz"
                                  ? "oz"
                                  : h.holding_type === "gold_bar_20g"
                                    ? "本"
                                    : "株"}
                          </span>
                          {h.monthly_amount != null && h.monthly_amount > 0 && (
                            <span className="ml-2 text-xs text-indigo-400">
                              積立{h.monthly_amount.toLocaleString()}円/月
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteHolding(h.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>
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
          上のプリセットから口座を追加してください
        </p>
      )}
    </div>
  );
}
