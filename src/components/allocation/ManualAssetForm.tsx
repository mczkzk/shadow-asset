import { useState } from "react";
import type { ManualAsset } from "@/lib/types";

interface AssetClassOption {
  value: string;
  label: string;
  description: string;
  namePlaceholder: string;
  amountLabel: string;
  amountPlaceholder: string;
}

const ASSET_CLASS_OPTIONS: AssetClassOption[] = [
  {
    value: "現金",
    label: "現金(円)",
    description: "銀行預金、証券口座のMRF・待機資金など",
    namePlaceholder: "例: 三菱UFJ銀行 普通預金",
    amountLabel: "残高(円)",
    amountPlaceholder: "例: 3000000",
  },
  {
    value: "外貨預金",
    label: "外貨預金",
    description: "外貨建ての預金。為替レートで自動換算されます",
    namePlaceholder: "例: 住信SBIネット銀行 USD",
    amountLabel: "金額",
    amountPlaceholder: "例: 10000",
  },
  {
    value: "不動産",
    label: "不動産",
    description: "今売却したら手元に残る金額(時価 - ローン残債 - 諸費用)",
    namePlaceholder: "例: 自宅マンション",
    amountLabel: "売却手取り見込み(円)",
    amountPlaceholder: "例: 30000000",
  },
  {
    value: "保険",
    label: "保険",
    description: "貯蓄型保険の解約返戻金や満期金額。掛け捨ては対象外",
    namePlaceholder: "例: 養老保険(2036年満期)",
    amountLabel: "解約返戻金 / 満期金額(円)",
    amountPlaceholder: "例: 2000000",
  },
  {
    value: "生活防衛資金",
    label: "生活防衛資金",
    description: "生活費の3〜6ヶ月分など、投資に回さない別枠の現金",
    namePlaceholder: "例: 生活費6ヶ月分",
    amountLabel: "金額(円)",
    amountPlaceholder: "例: 1500000",
  },
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AUD", "CHF", "CAD", "NZD"];

interface ManualAssetFormProps {
  initial?: ManualAsset;
  onSave: (data: Omit<ManualAsset, "id">) => Promise<void>;
  onCancel: () => void;
}

export default function ManualAssetForm({ initial, onSave, onCancel }: ManualAssetFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [assetClass, setAssetClass] = useState(initial?.asset_class ?? "現金");
  const [valueJpy, setValueJpy] = useState(initial?.value_jpy?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const option = ASSET_CLASS_OPTIONS.find((o) => o.value === assetClass) ?? ASSET_CLASS_OPTIONS[0];
  const isForeign = assetClass === "外貨預金";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isForeign && !amount) return;
    if (!isForeign && !valueJpy) return;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        asset_class: assetClass,
        value_jpy: isForeign ? null : (valueJpy ? Number(valueJpy) : null),
        currency: isForeign ? currency : null,
        amount: isForeign ? (amount ? Number(amount) : null) : null,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div>
        <label className="text-xs font-medium text-zinc-500">資産クラス</label>
        <select
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          {ASSET_CLASS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-400">{option.description}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-500">名前</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={option.namePlaceholder}
          className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      {isForeign ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-500">通貨</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">{option.amountLabel}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={option.amountPlaceholder}
              step="any"
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-zinc-500">{option.amountLabel}</label>
          <input
            type="number"
            value={valueJpy}
            onChange={(e) => setValueJpy(e.target.value)}
            placeholder={option.amountPlaceholder}
            step="any"
            className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim() || (isForeign ? !amount : !valueJpy)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : initial ? "更新" : "追加"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
