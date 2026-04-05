import { formatJpy, formatNumber } from "@/lib/format";
import type { ManualAssetWithJpy } from "@/lib/types";
import { getManualAssetJpy, groupManualAssetsByClass } from "@/lib/types";

interface ManualAssetSummaryProps {
  assets: ManualAssetWithJpy[];
}

export default function ManualAssetSummary({ assets }: ManualAssetSummaryProps) {
  const groups = groupManualAssetsByClass(assets);
  const total = assets.reduce((sum, a) => sum + getManualAssetJpy(a), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700">手入力資産</h2>
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-800">合計</span>
          <span className="text-base font-bold text-zinc-900">
            {formatJpy(total)}
          </span>
        </div>
        {groups.map((group) => (
          <div key={group.label}>
            {groups.length > 1 && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-1.5">
                <span className="text-xs font-medium text-zinc-400">
                  {group.label}
                </span>
              </div>
            )}
            <div className="divide-y divide-zinc-50">
              {group.items.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-5 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-700">{a.name}</p>
                    {a.currency && a.amount != null && (
                      <p className="text-xs text-zinc-400">
                        {a.currency} {formatNumber(a.amount, 2)}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-zinc-800">
                    {formatJpy(getManualAssetJpy(a))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
