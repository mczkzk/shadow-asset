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

const AREA_COLORS: Record<string, string> = {
  "投資信託": "#4F46E5",
  "株式": "#059669",
  "暗号資産": "#D97706",
  "ゴールド": "#CA8A04",
  "債券": "#8B5CF6",
  "その他": "#6B7280",
};

interface ChartRow {
  date: string;
  [key: string]: string | number;
}

function buildChartData(snapshots: Snapshot[]): {
  data: ChartRow[];
  keys: string[];
} {
  const allKeys = new Set<string>();
  const data: ChartRow[] = [];

  for (const s of snapshots) {
    const parsed: unknown = JSON.parse(s.breakdown_json || "[]");
    const row: ChartRow = { date: s.date };

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.name && typeof item.value === "number" && item.value > 0) {
          row[item.name] = (Number(row[item.name]) || 0) + item.value;
          allKeys.add(item.name);
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

  return { data, keys };
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
      setError(`CSV読込失敗: ${e}`);
    } finally {
      setImporting(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setError(null);
    try {
      await applyMfImport(preview.rows);
      setApplied(true);
      reload();
    } catch (e) {
      setError(`適用失敗: ${e}`);
    }
  };

  const all = useMemo(
    () => (snapshots ?? []).slice().reverse(),
    [snapshots]
  );

  const { data, keys } = useMemo(
    () => all.length < 2 ? { data: [], keys: [] } : buildChartData(all),
    [all]
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  const emptyState = all.length < 2;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">資産推移</h2>
        <button
          onClick={handlePickCsv}
          disabled={importing}
          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
        >
          {importing ? "読込中..." : "MF CSV取込"}
        </button>
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
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  適用する
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
              期間: {preview.rows[preview.rows.length - 1].date} ~ {preview.rows[0].date}
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
                formatter={(value: unknown, name: string) => [
                  formatJpy(Number(value)),
                  name,
                ]}
                labelFormatter={(label: unknown) => String(label)}
              />
              {keys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={AREA_COLORS[key] ?? "#6B7280"}
                  fill={AREA_COLORS[key] ?? "#6B7280"}
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
