import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSnapshots } from "@/hooks/usePortfolio";
import { formatJpy } from "@/lib/format";

export default function AssetHistory({ refreshCount = 0 }: { refreshCount?: number }) {
  const { snapshots, isLoading } = useSnapshots(90, refreshCount);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  const data = (snapshots ?? [])
    .slice()
    .reverse()
    .map((s) => ({
      date: s.date,
      total: s.total_jpy,
    }));

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-700">資産推移</h2>
        <p className="mt-2 text-sm text-zinc-400">
          ダッシュボードを開くたびに総資産額を記録します。
          {data.length === 0
            ? "本日の記録を保存しました。明日以降にグラフが表示されます。"
            : `${data.length}日分のデータがあります。もう1日分で表示されます。`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-zinc-700">資産推移</h2>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
              width={60}
            />
            <Tooltip
              formatter={(value: unknown) => [
                formatJpy(Number(value)),
                "総資産",
              ]}
              labelFormatter={(label: unknown) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#4F46E5"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
