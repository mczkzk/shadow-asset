import { useState, useEffect, useCallback } from "react";
import { formatJpy } from "@/lib/format";
import { getSetting, setSetting } from "@/lib/api";

const SETTING_KEYS = {
  MONTHLY_EXPENSE: "monthly_expense",
  EMERGENCY_FUND_MONTHS: "emergency_fund_months",
  CASH_POSITION_MONTHS: "cash_position_months",
  GOV_BOND_MONTHS: "gov_bond_months",
  BOND_TARGET_PCT: "bond_target_pct",
  GOLD_TARGET_PCT: "gold_target_pct",
  CRYPTO_TARGET_PCT: "crypto_target_pct",
  FOREX_TARGET_PCT: "forex_deposit_target_pct",
  INSURANCE_TARGET_PCT: "insurance_target_pct",
  REAL_ESTATE_TARGET_PCT: "real_estate_target_pct",
} as const;

const GREEN_THRESHOLD = 10; // ±10% 以内 → 緑
const AMBER_THRESHOLD = 25; // ±25% 以内 → 黄
const NOISE_THRESHOLD = 0.005; // 総資産の0.5%未満の乖離はノイズとして無視

type DeviationLevel = "green" | "amber" | "red";

function classifyDeviation(actual: number, target: number, total?: number): DeviationLevel {
  if (target === 0) return actual === 0 ? "green" : "red";
  if (target < 0) return "green";
  const absDiff = Math.abs(actual - target);
  if (total && total > 0 && absDiff / total < NOISE_THRESHOLD) return "green";
  const pct = (absDiff / target) * 100;
  if (pct <= GREEN_THRESHOLD) return "green";
  if (pct <= AMBER_THRESHOLD) return "amber";
  return "red";
}

const LEVEL_COLORS = {
  green: "text-emerald-600",
  amber: "text-amber-500",
  red: "text-red-500",
} as const;

const BAR_COLORS = {
  green: "bg-emerald-500",
  amber: "bg-amber-400",
  red: "bg-red-400",
} as const;

// FIRE専用: 超えれば超えるほどOK
function FireDiffBadge({ diff }: { diff: number }) {
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

// アロケーション目標: 目標値からの乖離率で3色表示
function DeviationBadge({ level, diff }: { level: DeviationLevel; diff: number }) {
  const label =
    level === "green"
      ? "OK"
      : level === "amber"
        ? "要調整"
        : "大幅乖離";
  const sign = diff >= 0 ? "+" : "";
  return (
    <span className={`text-xs font-medium ${LEVEL_COLORS[level]}`}>
      {sign}{formatJpy(diff)} {label}
    </span>
  );
}

function ProgressBar({ actual, target, barColorClass }: { actual: number; target: number; barColorClass: string }) {
  const progress = target > 0 ? Math.min(actual / target, 1) : actual > 0 ? 1 : 0;
  return (
    <div className="mt-1 flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-zinc-100">
        <div
          className={`h-2 rounded-full ${barColorClass}`}
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
  total: number;
  options?: readonly number[];
  onMonthsChange: (months: number) => void;
}

const MONTH_OPTIONS = [0, 6, 12, 24, 36] as const;

function MonthSelectRow({ label, months, actual, expense, total, options = MONTH_OPTIONS, onMonthsChange }: MonthSelectRowProps) {
  const target = expense * 10000 * months;
  const level = classifyDeviation(actual, target, total);
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
            {options.map((m) => (
              <option key={m} value={m}>
                {`生活費 × ${m}ヶ月`}
              </option>
            ))}
          </select>
        </div>
        <DeviationBadge level={level} diff={actual - target} />
      </div>
      <ProgressBar actual={actual} target={target} barColorClass={BAR_COLORS[level]} />
    </div>
  );
}

interface PercentInputRowProps {
  label: string;
  targetPct: number | null;
  actual: number;
  filteredTotal: number;
  onTargetPctChange: (pct: number | null) => void;
}

function PercentInputRow({ label, targetPct, actual, filteredTotal, onTargetPctChange }: PercentInputRowProps) {
  const [inputValue, setInputValue] = useState(targetPct != null ? String(targetPct) : "");

  useEffect(() => {
    setInputValue(targetPct != null ? String(targetPct) : "");
  }, [targetPct]);

  const active = targetPct != null;
  const target = active ? filteredTotal * targetPct / 100 : 0;
  const level = classifyDeviation(actual, target, filteredTotal);

  function commit() {
    if (inputValue === "") {
      onTargetPctChange(null);
      return;
    }
    const num = Number(inputValue);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      setInputValue(targetPct != null ? String(targetPct) : "");
      return;
    }
    onTargetPctChange(num);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700">{label}</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-14 rounded border border-zinc-200 px-1.5 py-0.5 text-right text-xs text-zinc-500"
              placeholder="-"
            />
            <span className="text-xs text-zinc-400">%</span>
          </div>
        </div>
        {active && <DeviationBadge level={level} diff={actual - target} />}
      </div>
      {active && <ProgressBar actual={actual} target={target} barColorClass={BAR_COLORS[level]} />}
    </div>
  );
}

interface TargetJudgmentProps {
  emergencyFundActual: number;
  cashActual: number;
  govBondActual: number;
  bondActual: number;
  goldActual: number;
  cryptoActual: number;
  forexActual: number;
  insuranceActual: number;
  realEstateActual: number;
  totalExcludingEmergency: number;
}

export default function TargetJudgment({
  emergencyFundActual,
  cashActual,
  govBondActual,
  bondActual,
  goldActual,
  cryptoActual,
  forexActual,
  insuranceActual,
  realEstateActual,
  totalExcludingEmergency,
}: TargetJudgmentProps) {
  const [monthlyExpense, setMonthlyExpense] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [emergencyMonths, setEmergencyMonths] = useState<number>(6);
  const [cashMonths, setCashMonths] = useState<number>(12);
  const [govBondMonths, setGovBondMonths] = useState<number>(0);
  const [bondPct, setBondPct] = useState<number | null>(null);
  const [goldPct, setGoldPct] = useState<number | null>(null);
  const [cryptoPct, setCryptoPct] = useState<number | null>(null);
  const [forexPct, setForexPct] = useState<number | null>(null);
  const [insurancePct, setInsurancePct] = useState<number | null>(null);
  const [realEstatePct, setRealEstatePct] = useState<number | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getSetting(SETTING_KEYS.MONTHLY_EXPENSE),
      getSetting(SETTING_KEYS.EMERGENCY_FUND_MONTHS),
      getSetting(SETTING_KEYS.CASH_POSITION_MONTHS),
      getSetting(SETTING_KEYS.GOV_BOND_MONTHS),
      getSetting(SETTING_KEYS.BOND_TARGET_PCT),
      getSetting(SETTING_KEYS.GOLD_TARGET_PCT),
      getSetting(SETTING_KEYS.CRYPTO_TARGET_PCT),
      getSetting(SETTING_KEYS.FOREX_TARGET_PCT),
      getSetting(SETTING_KEYS.INSURANCE_TARGET_PCT),
      getSetting(SETTING_KEYS.REAL_ESTATE_TARGET_PCT),
    ]).then(([expense, emergency, cash, govBond, bond, gold, crypto, forex, insurance, realEstate]) => {
      if (expense.status === "fulfilled" && expense.value != null) {
        const num = Number(expense.value);
        setMonthlyExpense(num);
        setInputValue(String(num));
      }
      if (emergency.status === "fulfilled" && emergency.value != null) setEmergencyMonths(Number(emergency.value));
      if (cash.status === "fulfilled" && cash.value != null) setCashMonths(Number(cash.value));
      if (govBond.status === "fulfilled" && govBond.value != null) setGovBondMonths(Number(govBond.value));
      if (bond.status === "fulfilled" && bond.value != null && bond.value !== "") setBondPct(Number(bond.value));
      if (gold.status === "fulfilled" && gold.value != null && gold.value !== "") setGoldPct(Number(gold.value));
      if (crypto.status === "fulfilled" && crypto.value != null && crypto.value !== "") setCryptoPct(Number(crypto.value));
      if (forex.status === "fulfilled" && forex.value != null && forex.value !== "") setForexPct(Number(forex.value));
      if (insurance.status === "fulfilled" && insurance.value != null && insurance.value !== "") setInsurancePct(Number(insurance.value));
      if (realEstate.status === "fulfilled" && realEstate.value != null && realEstate.value !== "") setRealEstatePct(Number(realEstate.value));
    });
  }, []);

  const save = useCallback(async () => {
    const num = Number(inputValue);
    if (Number.isNaN(num) || num <= 0) return;
    await setSetting(SETTING_KEYS.MONTHLY_EXPENSE, String(num));
    setMonthlyExpense(num);
    setIsEditing(false);
  }, [inputValue]);

  const handleSettingChange = useCallback(async <T extends number | null>(key: string, setter: (v: T) => void, value: T) => {
    setter(value);
    await setSetting(key, value != null ? String(value) : "");
  }, []);

  if (monthlyExpense == null && !isEditing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
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
  const fireTarget = expense * 10000 * 12 * 25;
  const fireDiff = totalExcludingEmergency - fireTarget;

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
        <div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-zinc-700">FIRE目標額</span>
              <span className="ml-2 text-xs text-zinc-400">年間生活費 × 25年 (4%ルール)</span>
            </div>
            <FireDiffBadge diff={fireDiff} />
          </div>
          <ProgressBar actual={totalExcludingEmergency} target={fireTarget} barColorClass={fireDiff >= 0 ? "bg-emerald-500" : "bg-amber-400"} />
        </div>

        <MonthSelectRow
          label="生活防衛資金"
          months={emergencyMonths}
          actual={emergencyFundActual}
          expense={expense}
          total={totalExcludingEmergency}
          options={[0, 3, 6, 9, 12]}
          onMonthsChange={(m) => handleSettingChange(SETTING_KEYS.EMERGENCY_FUND_MONTHS, setEmergencyMonths, m)}
        />

        <MonthSelectRow
          label="現金ポジション"
          months={cashMonths}
          actual={cashActual}
          expense={expense}
          total={totalExcludingEmergency}
          onMonthsChange={(m) => handleSettingChange(SETTING_KEYS.CASH_POSITION_MONTHS, setCashMonths, m)}
        />

        <MonthSelectRow
          label="個人向け国債"
          months={govBondMonths}
          actual={govBondActual}
          expense={expense}
          total={totalExcludingEmergency}
          onMonthsChange={(m) => handleSettingChange(SETTING_KEYS.GOV_BOND_MONTHS, setGovBondMonths, m)}
        />

        <PercentInputRow
          label="債券"
          targetPct={bondPct}
          actual={bondActual}
          filteredTotal={totalExcludingEmergency}
          onTargetPctChange={(p) => handleSettingChange(SETTING_KEYS.BOND_TARGET_PCT, setBondPct, p)}
        />

        <PercentInputRow
          label="ゴールド"
          targetPct={goldPct}
          actual={goldActual}
          filteredTotal={totalExcludingEmergency}
          onTargetPctChange={(p) => handleSettingChange(SETTING_KEYS.GOLD_TARGET_PCT, setGoldPct, p)}
        />

        <PercentInputRow
          label="暗号資産"
          targetPct={cryptoPct}
          actual={cryptoActual}
          filteredTotal={totalExcludingEmergency}
          onTargetPctChange={(p) => handleSettingChange(SETTING_KEYS.CRYPTO_TARGET_PCT, setCryptoPct, p)}
        />

        <PercentInputRow
          label="外貨預金"
          targetPct={forexPct}
          actual={forexActual}
          filteredTotal={totalExcludingEmergency}
          onTargetPctChange={(p) => handleSettingChange(SETTING_KEYS.FOREX_TARGET_PCT, setForexPct, p)}
        />

        <PercentInputRow
          label="不動産"
          targetPct={realEstatePct}
          actual={realEstateActual}
          filteredTotal={totalExcludingEmergency}
          onTargetPctChange={(p) => handleSettingChange(SETTING_KEYS.REAL_ESTATE_TARGET_PCT, setRealEstatePct, p)}
        />

        <PercentInputRow
          label="保険"
          targetPct={insurancePct}
          actual={insuranceActual}
          filteredTotal={totalExcludingEmergency}
          onTargetPctChange={(p) => handleSettingChange(SETTING_KEYS.INSURANCE_TARGET_PCT, setInsurancePct, p)}
        />
      </div>
    </div>
  );
}
