import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatJpy, formatPercent } from "@/lib/format";

interface BreakdownEntry {
  name: string;
  value: number;
  color: string;
}

interface CategoryBreakdownChartProps {
  breakdown: BreakdownEntry[];
  totalJpy: number;
  title?: string;
}

export default function CategoryBreakdownChart({
  breakdown,
  totalJpy,
  title = "資産内訳",
}: CategoryBreakdownChartProps) {
  if (breakdown.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-500">データがありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
              >
                {breakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) => formatJpy(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {breakdown.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-zinc-700">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="font-medium text-zinc-900">
                  {formatJpy(item.value)}
                </span>
                <span className="ml-2 text-zinc-400">
                  {formatPercent(totalJpy > 0 ? (item.value / totalJpy) * 100 : 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
