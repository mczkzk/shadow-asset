import { useState, useEffect, useCallback } from "react";
import type { Account, Holding, AccountType, HoldingType } from "@/lib/types";
import * as api from "@/lib/api";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "nisa", label: "NISA" },
  { value: "ideco", label: "iDeCo" },
  { value: "tokutei", label: "特定口座" },
  { value: "us_stock", label: "米国株" },
  { value: "crypto", label: "仮想通貨" },
  { value: "gold", label: "ゴールド" },
  { value: "dc", label: "確定拠出年金" },
];

const HOLDING_TYPES: { value: HoldingType; label: string }[] = [
  { value: "fund", label: "投資信託" },
  { value: "us_stock", label: "米国株" },
  { value: "us_etf", label: "米国ETF" },
  { value: "crypto", label: "仮想通貨" },
  { value: "gold_coin_1oz", label: "金貨1oz" },
  { value: "gold_bar_20g", label: "金地金20g" },
  { value: "dc_fund", label: "DC年金ファンド" },
];

function AccountForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("nisa");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await api.createAccount({ name, type });
      setName("");
      onCreated();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div>
        <label className="block text-xs text-zinc-500">口座名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: つみたてNISA"
          className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500">種類</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        追加
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

function HoldingForm({
  accountId,
  onCreated,
}: {
  accountId: number;
  onCreated: () => void;
}) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [holdingType, setHoldingType] = useState<HoldingType>("fund");
  const [asOf, setAsOf] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3"
    >
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
            {HOLDING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500">確認日 (積立用)</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500">月額積立 (円)</label>
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
        className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
      >
        銘柄を追加
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
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
        <AccountForm onCreated={refresh} />
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
                      {ACCOUNT_TYPES.find((t) => t.value === account.type)
                        ?.label}{" "}
                      ({accountHoldings.length}銘柄)
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
                          {h.monthly_amount && (
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
                  <HoldingForm accountId={account.id} onCreated={refresh} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <p className="text-center text-sm text-zinc-400">
          口座がありません。上のフォームから追加してください。
        </p>
      )}
    </div>
  );
}
