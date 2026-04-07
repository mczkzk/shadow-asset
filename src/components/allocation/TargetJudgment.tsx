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

function ProgressBar({ actual, target }: { actual: number; target: number }) {
  const diff = actual - target;
  const progress = target > 0 ? Math.min(actual / target, 1) : 0;
  return (
    <div className="mt-1 flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-zinc-100">
        <div
          className={`h-2 rounded-full ${diff >= 0 ? "bg-emerald-500" : "bg-amber-400"}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="w-48 text-right text-xs text-zinc-500">
        {formatJpy(actual)} / {formatJpy(target)}
      </div>
    </div>
  );
}

interface MonthSelectRowProps {
  label: string;
  months: number;
  actual: number;
  expense: number;
  onMonthsChange: (months: number) => void;
}

const MONTH_OPTIONS = [0, 6, 12, 24, 36] as const;

function MonthSelectRow({ label, months, actual, expense, onMonthsChange }: MonthSelectRowProps) {
  const target = expense * 10000 * months;
  const diff = actual - target;
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700">{label}</span>
          <select
            value={months}
            onChange={(e) => onMonthsChange(Number(e.target.value))}
            className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "判定しない" : `生活費 × ${m}ヶ月`}
              </option>
            ))}
          </select>
        </div>
        {months > 0 && <DiffBadge diff={diff} />}
      </div>
      {months > 0 && <ProgressBar actual={actual} target={target} />}
    </div>
  );
}

interface TargetJudgmentProps {
  emergencyFundActual: number;
  cashActual: number;
  govBondActual: number;
  totalExcludingEmergency: number;
}

export default function TargetJudgment({
  emergencyFundActual,
  cashActual,
  govBondActual,
  totalExcludingEmergency,
}: TargetJudgmentProps) {
  const [monthlyExpense, setMonthlyExpense] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [cashMonths, setCashMonths] = useState<number>(12);
  const [govBondMonths, setGovBondMonths] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      getSetting("monthly_expense"),
      getSetting("cash_position_months"),
      getSetting("gov_bond_months"),
    ]).then(([expense, cash, bond]) => {
      if (expense != null) {
        const num = Number(expense);
        setMonthlyExpense(num);
        setInputValue(String(num));
      }
      if (cash != null) setCashMonths(Number(cash));
      if (bond != null) setGovBondMonths(Number(bond));
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

  const handleGovBondMonthsChange = useCallback(async (months: number) => {
    setGovBondMonths(months);
    await setSetting("gov_bond_months", String(months));
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

  return (
    <div className="h-full rounded-xl border border-zinc-200 bg-white p-6">
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
              <ProgressBar actual={row.actual} target={row.target} />
            </div>
          );
        })}

        <MonthSelectRow
          label="現金ポジション"
          months={cashMonths}
          actual={cashActual}
          expense={expense}
          onMonthsChange={handleCashMonthsChange}
        />

        <MonthSelectRow
          label="個人向け国債"
          months={govBondMonths}
          actual={govBondActual}
          expense={expense}
          onMonthsChange={handleGovBondMonthsChange}
        />
      </div>
    </div>
  );
}
