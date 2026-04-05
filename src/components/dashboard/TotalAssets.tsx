import { formatJpy, formatChange, formatPercent } from "@/lib/format";

interface TotalAssetsProps {
  totalJpy: number;
  usdJpy: number;
  prevTotalJpy: number | null;
  prevDate: string | null;
}

export default function TotalAssets({
  totalJpy,
  usdJpy,
  prevTotalJpy,
  prevDate,
}: TotalAssetsProps) {
  const diff = prevTotalJpy != null ? formatChange(totalJpy, prevTotalJpy) : null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg">
      <p className="text-sm font-medium opacity-80">総資産額</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">
        {formatJpy(totalJpy)}
      </p>
      {diff && (
        <p className="mt-1 text-sm font-medium opacity-90">
          <span className={diff.change >= 0 ? "text-emerald-300" : "text-red-300"}>
            {diff.sign}{formatJpy(diff.change)} ({diff.sign}{formatPercent(diff.pct, 2)})
          </span>
          {prevDate && <span className="ml-2 text-xs opacity-60">{prevDate}比</span>}
        </p>
      )}
      <div className="mt-4 text-xs opacity-70">
        <span>USD/JPY: {usdJpy.toFixed(2)}</span>
      </div>
    </div>
  );
}
