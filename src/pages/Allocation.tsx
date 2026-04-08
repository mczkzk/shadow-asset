import type { AllocationData, ManualAssetWithJpy } from "@/lib/types";
import { getManualAssetJpy } from "@/lib/types";
import { useAllocation } from "@/hooks/useAllocation";
import { formatJpy, formatNumber, formatPercent } from "@/lib/format";
import CategoryBreakdownChart from "@/components/dashboard/CategoryBreakdownChart";
import TargetJudgment from "@/components/allocation/TargetJudgment";

function AllocationTable({
  items,
  totalJpy,
  manualAssets,
}: {
  items: AllocationData["items"];
  totalJpy: number;
  manualAssets: ManualAssetWithJpy[];
}) {
  const manualByClass: Record<string, ManualAssetWithJpy[]> = {};
  for (const a of manualAssets) {
    (manualByClass[a.asset_class] ??= []).push(a);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-700">配分詳細</h2>
      <div className="mt-3 text-right text-xs text-zinc-400">
        合計: <span className="font-medium text-zinc-700">{formatJpy(totalJpy)}</span>
      </div>
      <div className="mt-2 divide-y divide-zinc-100">
        {items.map((item) => {
          const pct = totalJpy > 0 ? (item.value / totalJpy) * 100 : 0;
          const classManual = manualByClass[item.name] ?? [];
          return (
            <div key={item.name} className="py-2">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 text-sm font-medium text-zinc-700">{item.name}</span>
                <span className="text-sm font-medium text-zinc-900">
                  {formatPercent(pct)}
                </span>
                <span className="w-28 text-right text-sm text-zinc-500">
                  {formatJpy(item.value)}
                </span>
              </div>
              {(item.holdings.length > 0 || classManual.length > 0) && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {item.holdings.map((h) => (
                    <div key={`${h.ticker}-${h.name}`} className="flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {h.name}
                        {!h.holding_type.startsWith("gold_") && (
                          <span className="ml-1 text-zinc-300">{h.ticker}</span>
                        )}
                      </span>
                      <span>{formatJpy(h.value_jpy)}</span>
                    </div>
                  ))}
                  {classManual.map((a) => (
                    <div key={`manual-${a.id}`} className="flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {a.name}
                        {a.currency && a.amount != null && (
                          <span className="ml-1 text-zinc-300">
                            {a.currency} {formatNumber(a.amount, 2)}
                          </span>
                        )}
                      </span>
                      <span>{formatJpy(getManualAssetJpy(a))}</span>
                    </div>
                  ))}
                </div>
              )}
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

  // 生活防衛資金をチャート・テーブルから除外
  const valueByName = new Map(data.items.map((i) => [i.name, i.value]));
  const emergencyFundValue = valueByName.get("生活防衛資金") ?? 0;
  const cashValue = valueByName.get("現金") ?? 0;
  const govBondValue = valueByName.get("個人向け国債") ?? 0;
  const bondValue = valueByName.get("債券") ?? 0;
  const goldValue = valueByName.get("ゴールド") ?? 0;
  const cryptoValue = valueByName.get("暗号資産") ?? 0;
  const forexValue = valueByName.get("外貨預金") ?? 0;
  const insuranceValue = valueByName.get("保険") ?? 0;
  const realEstateValue = valueByName.get("不動産") ?? 0;
  const filteredItems = data.items.filter((i) => i.name !== "生活防衛資金");
  const filteredTotal = data.total_jpy - emergencyFundValue;
  const filteredManualAssets = data.manual_assets.filter(
    (a) => a.asset_class !== "生活防衛資金",
  );

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
      </div>

      {filteredItems.length > 0 && (
        <>
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div>
              <CategoryBreakdownChart
                breakdown={filteredItems}
                totalJpy={filteredTotal}
                title="アセットアロケーション"
              />
              {emergencyFundValue > 0 && (
                <p className="mt-2 text-xs text-zinc-400">
                  ※ 生活防衛資金 {formatJpy(emergencyFundValue)} は配分対象外のため除外
                </p>
              )}
            </div>
            <TargetJudgment
              emergencyFundActual={emergencyFundValue}
              cashActual={cashValue}
              govBondActual={govBondValue}
              bondActual={bondValue}
              goldActual={goldValue}
              cryptoActual={cryptoValue}
              forexActual={forexValue}
              insuranceActual={insuranceValue}
              realEstateActual={realEstateValue}
              totalExcludingEmergency={filteredTotal}
            />
          </div>
          <AllocationTable items={filteredItems} totalJpy={filteredTotal} manualAssets={filteredManualAssets} />
        </>
      )}

    </div>
  );
}
