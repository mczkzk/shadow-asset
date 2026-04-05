import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { open } from "@tauri-apps/plugin-dialog";
import { useSnapshots } from "@/hooks/usePortfolio";
import { previewMfImport, applyMfImport } from "@/lib/api";
import { formatJpy } from "@/lib/format";
import type { Snapshot, MfImportPreview } from "@/lib/types";

interface ChartRow {
  ts: number;
  [key: string]: number;
}

function dateToTs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

function buildChartData(snapshots: Snapshot[]): {
  data: ChartRow[];
  keys: string[];
  colors: Record<string, string>;
} {
  const allKeys = new Set<string>();
  const colors: Record<string, string> = {};
  const data: ChartRow[] = [];

  for (const s of snapshots) {
    const parsed: unknown = JSON.parse(s.breakdown_json || "[]");
    const row: ChartRow = { ts: dateToTs(s.date) };

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item.name === "string" && typeof item.value === "number" && item.value > 0) {
          row[item.name] = (Number(row[item.name]) || 0) + item.value;
          allKeys.add(item.name);
          if (typeof item.color === "string") colors[item.name] = item.color;
        }
      }
    }

    data.push(row);
  }

  const keyTotals = new Map<string, number>();
  for (const key of allKeys) {
    const total = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
    keyTotals.set(key, total);
  }
  const keys = [...allKeys].sort(
    (a, b) => (keyTotals.get(b) ?? 0) - (keyTotals.get(a) ?? 0)
  );

  return { data, keys, colors };
}

type Period = "1m" | "3m" | "6m" | "1y" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "1m", label: "1ヶ月" },
  { key: "3m", label: "3ヶ月" },
  { key: "6m", label: "6ヶ月" },
  { key: "1y", label: "1年" },
  { key: "all", label: "全期間" },
];

function periodStartDate(period: Period): string | null {
  if (period === "all") return null;
  const d = new Date();
  switch (period) {
    case "1m": d.setMonth(d.getMonth() - 1); break;
    case "3m": d.setMonth(d.getMonth() - 3); break;
    case "6m": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
  }
  return d.toISOString().slice(0, 10);
}

export default function AssetHistory({
  refreshCount = 0,
}: {
  refreshCount?: number;
}) {
  const { snapshots, isLoading, reload } = useSnapshots(undefined, refreshCount);
  const [preview, setPreview] = useState<MfImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");

  const handlePickCsv = async () => {
    const file = await open({
      title: "MoneyForward CSV",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!file) return;

    setPreview(null);
    setApplied(false);
    setError(null);
    setImporting(true);
    try {
      const result = await previewMfImport(file);
      setPreview(result);
    } catch (e) {
      setError(`CSV読込失敗: ${String(e)}`);
    } finally {
      setImporting(false);
    }
  };

  const handleApply = async () => {
    if (!preview || importing) return;
    setError(null);
    setImporting(true);
    try {
      await applyMfImport(preview.rows);
      setApplied(true);
      reload();
    } catch (e) {
      setError(`適用失敗: ${String(e)}`);
    } finally {
      setImporting(false);
    }
  };

  const all = useMemo(
    () => (snapshots ?? []).slice().reverse(),
    [snapshots]
  );

  const filtered = useMemo(() => {
    const start = periodStartDate(period);
    if (!start) return all;
    return all.filter((s) => s.date >= start);
  }, [all, period]);

  const { data, keys, colors } = useMemo(
    () => filtered.length < 2 ? { data: [], keys: [], colors: {} } : buildChartData(filtered),
    [filtered]
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  const emptyState = filtered.length < 2;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">資産推移</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-zinc-200">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-2 py-1 text-xs ${
                  period === key
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:bg-zinc-50"
                } ${key !== "1m" ? "border-l border-zinc-200" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handlePickCsv}
            disabled={importing}
            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
          >
            {importing ? "読込中..." : "MF CSV取込"}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      {preview && (
        <div className={`mb-3 rounded-lg border px-4 py-3 text-sm ${applied ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${applied ? "text-emerald-800" : "text-blue-800"}`}>
              {applied
                ? `適用完了: ${preview.rows.length}件取込`
                : `${preview.rows.length}件の取込候補`}
              {(preview.skipped_today || preview.skipped_existing > 0) && (
                <span className="ml-1 font-normal text-zinc-500">
                  ({[
                    preview.skipped_today && "本日分",
                    preview.skipped_existing > 0 && `既存${preview.skipped_existing}件`,
                  ].filter(Boolean).join("・")}はスキップ)
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {!applied && preview.rows.length > 0 && (
                <button
                  onClick={handleApply}
                  disabled={importing}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? "適用中..." : "適用する"}
                </button>
              )}
              <button
                onClick={() => { setPreview(null); setApplied(false); }}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                閉じる
              </button>
            </div>
          </div>
          {!applied && preview.rows.length > 0 && (
            <div className="mt-2 text-xs text-blue-700">
              期間: {preview.rows.reduce((min, r) => r.date < min ? r.date : min, preview.rows[0].date)} ~ {preview.rows.reduce((max, r) => r.date > max ? r.date : max, preview.rows[0].date)}
            </div>
          )}
        </div>
      )}

      {emptyState ? (
        <p className="text-sm text-zinc-400">
          データが不足しています。MoneyForward CSVを取り込むか、毎日ダッシュボードを開いてデータを蓄積してください。
        </p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => {
                  const d = new Date(v);
                  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
                width={60}
              />
              <Tooltip
                formatter={(value: unknown, name: string) => [
                  formatJpy(Number(value)),
                  name,
                ]}
                labelFormatter={(v: number) => {
                  const d = new Date(v);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                }}
              />
              {keys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={colors[key] ?? "#6B7280"}
                  fill={colors[key] ?? "#6B7280"}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
