import { useState, useMemo } from "react";
import { formatJpy, formatNumber } from "@/lib/format";
import type { ManualAsset, ManualAssetWithJpy } from "@/lib/types";
import * as api from "@/lib/api";
import ManualAssetForm from "./ManualAssetForm";

const CLASS_ORDER = ["現金", "外貨預金", "不動産", "保険", "生活防衛資金"];

function groupByClass(assets: ManualAssetWithJpy[]): { label: string; items: ManualAssetWithJpy[] }[] {
  const groups: Record<string, ManualAssetWithJpy[]> = {};
  for (const a of assets) {
    (groups[a.asset_class] ??= []).push(a);
  }
  return CLASS_ORDER
    .filter((c) => groups[c]?.length)
    .map((c) => ({ label: c, items: groups[c] }));
}

interface ManualAssetListProps {
  assets: ManualAssetWithJpy[];
  forexRates: Record<string, number>;
  onChanged: () => void;
}

export default function ManualAssetList({ assets, forexRates, onChanged }: ManualAssetListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groups = useMemo(() => groupByClass(assets), [assets]);

  const handleCreate = async (data: Omit<ManualAsset, "id">) => {
    await api.createManualAsset(data);
    setShowForm(false);
    onChanged();
  };

  const handleUpdate = async (id: number, data: Omit<ManualAsset, "id">) => {
    await api.updateManualAsset({ id, ...data });
    setEditingId(null);
    onChanged();
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await api.deleteManualAsset(id);
      onChanged();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">手入力資産</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            + 追加
          </button>
        )}
      </div>

      {showForm && (
        <ManualAssetForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {assets.length === 0 && !showForm && (
        <p className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-400">
          現金、外貨預金、不動産、保険、生活防衛資金などを追加できます
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-2">
            <span className="text-xs font-medium text-zinc-400">{group.label}</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {group.items.map((a) =>
              editingId === a.id ? (
                <div key={a.id} className="p-3">
                  <ManualAssetForm
                    initial={a}
                    onSave={(data) => handleUpdate(a.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{a.name}</p>
                    {a.currency && a.amount != null && (
                      <p className="text-xs text-zinc-400">
                        {a.currency} {formatNumber(a.amount, 2)}
                        {forexRates[a.currency] && (
                          <span className="ml-1 text-zinc-300">
                            @{formatNumber(forexRates[a.currency], 2)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-800">
                      {formatJpy(a.converted_jpy ?? a.value_jpy ?? 0)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(a.id)}
                        className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
