import { useEffect, useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatChange } from "@/lib/format";
import TotalAssets from "@/components/dashboard/TotalAssets";
import CategoryBreakdownChart from "@/components/dashboard/CategoryBreakdownChart";
import AccountList from "@/components/dashboard/AccountList";
import ManualAssetSummary from "@/components/dashboard/ManualAssetSummary";
import AssetHistory from "@/components/dashboard/AssetHistory";

const CRASH_THRESHOLD_PCT = -5;
const SHOW_CHANGE_STORAGE_KEY = "dashboard.showChange";

export default function Dashboard() {
  const { data, isLoading, error, refresh, refreshCount } = usePortfolio();
  const [showChange, setShowChange] = useState(() => {
    const stored = localStorage.getItem(SHOW_CHANGE_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const [crashChecked, setCrashChecked] = useState(false);

  useEffect(() => {
    localStorage.setItem(SHOW_CHANGE_STORAGE_KEY, String(showChange));
  }, [showChange]);

  useEffect(() => {
    if (crashChecked || data?.prev_total_jpy == null) return;
    const isCrash = formatChange(data.total_jpy, data.prev_total_jpy).pct <= CRASH_THRESHOLD_PCT;
    if (isCrash) setShowChange(false);
    setCrashChecked(true);
  }, [data, crashChecked]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">価格データを取得中...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <TotalAssets
          totalJpy={data.total_jpy}
          usdJpy={data.usd_jpy}
          prevTotalJpy={data.prev_total_jpy}
          prevDate={data.prev_date}
          showChange={showChange}
        />
        <div className="ml-4 flex shrink-0 flex-col items-end gap-3">
          <button
            onClick={refresh}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            更新
          </button>
          {data.prev_total_jpy != null && (
            <div className="flex cursor-pointer items-center gap-2">
              <span className="text-xs text-zinc-500">前日比</span>
              <button
                role="switch"
                aria-checked={showChange}
                aria-label="前日比の表示切替"
                onClick={() => setShowChange((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  showChange ? "bg-indigo-500" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    showChange ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryBreakdownChart
          breakdown={data.breakdown}
          totalJpy={data.total_jpy}
        />
        <AssetHistory refreshCount={refreshCount} />
      </div>
      <AccountList accounts={data.accounts} prevDate={data.prev_date} showChange={showChange} />
      {data.manual_assets.length > 0 && (
        <ManualAssetSummary assets={data.manual_assets} />
      )}
    </div>
  );
}
