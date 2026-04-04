import { formatJpy, formatNumber } from "@/lib/format";

interface TotalAssetsProps {
  totalJpy: number;
  usdJpy: number;
  goldCoin1ozJpy: number;
}

export default function TotalAssets({
  totalJpy,
  usdJpy,
  goldCoin1ozJpy,
}: TotalAssetsProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg">
      <p className="text-sm font-medium opacity-80">総資産額</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">
        {formatJpy(totalJpy)}
      </p>
      <div className="mt-4 flex gap-6 text-xs opacity-70">
        <span>USD/JPY: {usdJpy.toFixed(2)}</span>
        <span>金1oz: {formatNumber(goldCoin1ozJpy, 0)}円</span>
      </div>
    </div>
  );
}
