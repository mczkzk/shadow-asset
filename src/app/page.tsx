"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import TotalAssets from "@/components/dashboard/TotalAssets";
import CategoryBreakdownChart from "@/components/dashboard/CategoryBreakdownChart";
import AccountList from "@/components/dashboard/AccountList";
import AssetHistory from "@/components/dashboard/AssetHistory";

export default function Home() {
  const { data, isLoading, error } = usePortfolio();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">価格データを取得中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">
          データの取得に失敗しました。サーバーが起動しているか確認してください。
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <TotalAssets
        totalJpy={data.total_jpy}
        usdJpy={data.usd_jpy}
        goldUsdOz={data.gold_usd_oz}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryBreakdownChart
          breakdown={data.breakdown}
          totalJpy={data.total_jpy}
        />
        <AssetHistory />
      </div>
      <AccountList accounts={data.accounts} />
    </div>
  );
}
