import { useState, useEffect, useCallback } from "react";
import { formatJpy } from "@/lib/format";
import { getSetting, setSetting } from "@/lib/api";

interface TargetRow {
  label: string;
  target: number;
  actual: number;
  description: string;
}

function DiffBadge({ diff }: { diff: number }) {
  if (diff >= 0) {
    return (
      <span className="text-xs font-medium text-emerald-600">
        {diff === 0 ? "OK" : `+${formatJpy(diff)} OK`}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-500">
      {formatJpy(diff)} 不足
    </span>
  );
}

interface TargetJudgmentProps {
  emergencyFundActual: number;
  cashActual: number;
  totalExcludingEmergency: number;
}

const CASH_MONTH_OPTIONS = [0, 6, 12, 24, 36] as const;

export default function TargetJudgment({
  emergencyFundActual,
  cashActual,
  totalExcludingEmergency,
}: TargetJudgmentProps) {
  const [monthlyExpense, setMonthlyExpense] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [cashMonths, setCashMonths] = useState<number>(12);

  useEffect(() => {
    Promise.all([
      getSetting("monthly_expense"),
      getSetting("cash_position_months"),
    ]).then(([expense, months]) => {
      if (expense != null) {
        const num = Number(expense);
        setMonthlyExpense(num);
        setInputValue(String(num));
      }
      if (months != null) {
        setCashMonths(Number(months));
      }
    });
  }, []);

  const save = useCallback(async () => {
    const num = Number(inputValue);
    if (Number.isNaN(num) || num <= 0) return;
    await setSetting("monthly_expense", String(num));
    setMonthlyExpense(num);
    setIsEditing(false);
  }, [inputValue]);

  const handleCashMonthsChange = useCallback(async (months: number) => {
    setCashMonths(months);
    await setSetting("cash_position_months", String(months));
  }, []);

  if (monthlyExpense == null && !isEditing) {
    return (
      <div className="h-full rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700">目標判定</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700"
          >
            月の生活費を設定
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          月の生活費を設定すると、生活防衛資金・現金・FIRE目標の過不足を判定します
        </p>
      </div>
    );
  }

  const expense = monthlyExpense ?? 0;
  const targets: TargetRow[] = [
    {
      label: "生活防衛資金",
      target: expense * 10000 * 6,
      actual: emergencyFundActual,
      description: "生活費 × 6ヶ月",
    },
    {
      label: "FIRE目標額",
      target: expense * 10000 * 12 * 25,
      actual: totalExcludingEmergency,
      description: "年間生活費 × 25年 (4%ルール)",
    },
  ];

  const cashTarget = expense * 10000 * cashMonths;
  const cashDiff = cashActual - cashTarget;
  const cashProgress = cashTarget > 0 ? Math.min(cashActual / cashTarget, 1) : 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">目標判定</h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-24 rounded border border-zinc-300 px-2 py-1 text-right text-xs"
              placeholder="25"
              autoFocus
            />
            <span className="text-xs text-zinc-400">万円/月</span>
            <button
              onClick={save}
              className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
            >
              保存
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setInputValue(String(monthlyExpense ?? ""));
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            生活費: {expense}万円/月
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {targets.map((row) => {
          const diff = row.actual - row.target;
          const progress = row.target > 0 ? Math.min(row.actual / row.target, 1) : 0;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-zinc-700">
                    {row.label}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400">
                    {row.description}
                  </span>
                </div>
                <DiffBadge diff={diff} />
              </div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-zinc-100">
                  <div
                    className={`h-2 rounded-full ${diff >= 0 ? "bg-emerald-500" : "bg-amber-400"}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="w-48 text-right text-xs text-zinc-500">
                  {formatJpy(row.actual)} / {formatJpy(row.target)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Cash position with selectable months */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">
                現金ポジション
              </span>
              <select
                value={cashMonths}
                onChange={(e) => handleCashMonthsChange(Number(e.target.value))}
                className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500"
              >
                {CASH_MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "判定しない" : `生活費 × ${m}ヶ月`}
                  </option>
                ))}
              </select>
            </div>
            {cashMonths > 0 && <DiffBadge diff={cashDiff} />}
          </div>
          {cashMonths > 0 && (
            <div className="mt-1 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-zinc-100">
                <div
                  className={`h-2 rounded-full ${cashDiff >= 0 ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${cashProgress * 100}%` }}
                />
              </div>
              <div className="w-48 text-right text-xs text-zinc-500">
                {formatJpy(cashActual)} / {formatJpy(cashTarget)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
