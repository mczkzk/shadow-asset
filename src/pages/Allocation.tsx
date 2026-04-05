import type { AllocationData } from "@/lib/types";
import { useAllocation } from "@/hooks/useAllocation";
import { formatJpy, formatPercent } from "@/lib/format";
import CategoryBreakdownChart from "@/components/dashboard/CategoryBreakdownChart";
import ManualAssetList from "@/components/allocation/ManualAssetList";

function AllocationTable({ items, totalJpy }: { items: AllocationData["items"]; totalJpy: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-700">配分詳細</h2>
      <div className="mt-3 text-right text-xs text-zinc-400">
        合計: <span className="font-medium text-zinc-700">{formatJpy(totalJpy)}</span>
      </div>
      <div className="mt-2 space-y-1">
        {items.map((item) => {
          const pct = totalJpy > 0 ? (item.value / totalJpy) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center gap-3 py-1.5">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 text-sm text-zinc-700">{item.name}</span>
              <div className="w-24">
                <div className="h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
              <span className="w-16 text-right text-sm font-medium text-zinc-900">
                {formatPercent(pct)}
              </span>
              <span className="w-28 text-right text-sm text-zinc-500">
                {formatJpy(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Allocation() {
  const { data, isLoading, error, refresh } = useAllocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-red-500">データの取得に失敗しました</p>
        <p className="text-sm text-zinc-400">{error}</p>
        <button
          onClick={refresh}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasSnapshots = data.snapshot_date != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">
            アセットアロケーション
          </h1>
          <p className="text-sm text-zinc-400">
            {hasSnapshots
              ? `${data.snapshot_date} のスナップショット + 手入力資産`
              : "手入力資産のみ (ダッシュボードで更新するとポートフォリオが反映されます)"}
          </p>
        </div>
        <button
          onClick={refresh}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          更新
        </button>
      </div>

      {data.items.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryBreakdownChart
            breakdown={data.items}
            totalJpy={data.total_jpy}
            title="アセットアロケーション"
          />
          <AllocationTable items={data.items} totalJpy={data.total_jpy} />
        </div>
      )}

      <ManualAssetList
        assets={data.manual_assets}
        forexRates={data.forex_rates}
        onChanged={refresh}
      />
    </div>
  );
}
