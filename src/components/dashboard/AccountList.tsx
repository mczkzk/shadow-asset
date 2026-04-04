import { formatJpy, formatNumber } from "@/lib/format";
import type { AccountWithHoldings, HoldingWithValue } from "@/lib/types";

function unitLabel(holdingType: string): string {
  if (holdingType === "fund" || holdingType === "dc_fund") return "口";
  if (holdingType === "crypto") return "";
  if (holdingType.startsWith("gold_coin")) return "枚";
  if (holdingType.startsWith("gold_bar")) return "本";
  return "株";
}

interface AccountListProps {
  accounts: AccountWithHoldings[];
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  nisa: "NISA",
  ideco: "iDeCo",
  tokutei: "特定口座",
  crypto: "仮想通貨",
  gold: "ゴールド",
  dc: "確定拠出年金",
};

const HOLDING_GROUP_LABELS: Record<string, string> = {
  fund: "投資信託",
  stock: "個別株・ETF",
  crypto: "仮想通貨",
  gold: "ゴールド",
  dc_fund: "DC年金ファンド",
};

function groupHoldings(
  holdings: HoldingWithValue[]
): { label: string; items: HoldingWithValue[] }[] {
  const groups: Record<string, HoldingWithValue[]> = {};

  for (const h of holdings) {
    let key: string;
    switch (h.holding_type) {
      case "fund":
        key = "fund";
        break;
      case "dc_fund":
        key = "dc_fund";
        break;
      case "crypto":
        key = "crypto";
        break;
      case "gold_coin_1oz":
      case "gold_coin_half_oz":
      case "gold_coin_quarter_oz":
      case "gold_coin_tenth_oz":
      case "gold_bar_5g":
      case "gold_bar_10g":
      case "gold_bar_20g":
      case "gold_bar_50g":
      case "gold_bar_100g":
      case "gold_bar_500g":
      case "gold_bar_1kg":
        key = "gold";
        break;
      default:
        key = "stock";
        break;
    }
    (groups[key] ??= []).push(h);
  }

  const order = ["fund", "stock", "dc_fund", "crypto", "gold"];
  return order
    .filter((k) => groups[k]?.length)
    .map((k) => ({
      label: HOLDING_GROUP_LABELS[k],
      items: groups[k],
    }));
}

function HoldingRow({ h }: { h: HoldingWithValue }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 text-sm">
      <div>
        <p className="font-medium text-zinc-700">{h.name}</p>
        <p className="text-xs text-zinc-400">
          {!h.holding_type.startsWith("gold_") && h.ticker}
          {h.estimated_quantity != null ? (
            <>
              <span className="ml-2 text-amber-500">
                {h.as_of}時点 {formatNumber(h.quantity, h.quantity % 1 === 0 ? 0 : 4)}{unitLabel(h.holding_type)}
                {" "}→ 推定 {formatNumber(h.estimated_quantity, 0)}{unitLabel(h.holding_type)}
              </span>
              <span className="ml-2 text-indigo-400">
                積立 {formatJpy(h.monthly_amount!)}/月
              </span>
            </>
          ) : (
            <span className="ml-2">
              {formatNumber(h.quantity, h.quantity % 1 === 0 ? 0 : 8)}{unitLabel(h.holding_type)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        {h.value_jpy != null ? (
          <p className="font-medium text-zinc-800">{formatJpy(h.value_jpy)}</p>
        ) : (
          <p className="text-zinc-400">価格取得不可</p>
        )}
        {h.price != null && (
          <p className="text-xs text-zinc-400">
            {h.holding_type.startsWith("gold_")
              ? `田中貴金属買取 @${formatNumber(h.price, 0)}円`
              : `@${h.currency === "USD" ? "$" : ""}${formatNumber(h.price, 2)}`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AccountList({ accounts }: AccountListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700">口座別詳細</h2>
      {accounts.map((account) => {
        const groups = groupHoldings(account.holdings);

        return (
          <div
            key={account.id}
            className="rounded-xl border border-zinc-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <div>
                <span className="text-xs text-zinc-400">
                  {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                </span>
                <h3 className="text-sm font-semibold text-zinc-800">
                  {account.name}
                </h3>
              </div>
              <span className="text-base font-bold text-zinc-900">
                {formatJpy(account.total_jpy)}
              </span>
            </div>
            {groups.map((group) => (
              <div key={group.label}>
                {groups.length > 1 && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-1.5">
                    <span className="text-xs font-medium text-zinc-400">
                      {group.label}
                    </span>
                  </div>
                )}
                <div className="divide-y divide-zinc-50">
                  {group.items.map((h) => (
                    <HoldingRow key={h.id} h={h} />
                  ))}
                </div>
              </div>
            ))}
            {account.holdings.length === 0 && (
              <p className="px-5 py-3 text-sm text-zinc-400">銘柄なし</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
