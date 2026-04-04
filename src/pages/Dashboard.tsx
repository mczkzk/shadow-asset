import { usePortfolio } from "@/hooks/usePortfolio";
import TotalAssets from "@/components/dashboard/TotalAssets";
import CategoryBreakdownChart from "@/components/dashboard/CategoryBreakdownChart";
import AccountList from "@/components/dashboard/AccountList";
import AssetHistory from "@/components/dashboard/AssetHistory";

export default function Dashboard() {
  const { data, isLoading, error, refresh, refreshCount } = usePortfolio();

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
        />
        <button
          onClick={refresh}
          className="ml-4 shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          更新
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryBreakdownChart
          breakdown={data.breakdown}
          totalJpy={data.total_jpy}
        />
        <AssetHistory refreshCount={refreshCount} />
      </div>
      <AccountList accounts={data.accounts} />
    </div>
  );
}
