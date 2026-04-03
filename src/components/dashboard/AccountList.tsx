"use client";

import { formatJpy, formatNumber } from "@/lib/format";
import type { AccountWithHoldings } from "@/lib/types";

interface AccountListProps {
  accounts: AccountWithHoldings[];
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  nisa: "NISA",
  ideco: "iDeCo",
  tokutei: "特定口座",
  us_stock: "米国株",
  crypto: "仮想通貨",
  gold: "ゴールド",
  dc: "確定拠出年金",
};

export default function AccountList({ accounts }: AccountListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700">口座別詳細</h2>
      {accounts.map((account) => (
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
          <div className="divide-y divide-zinc-50">
            {account.holdings.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-5 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-700">{h.name}</p>
                  <p className="text-xs text-zinc-400">
                    {h.ticker}
                    {h.estimated_quantity != null && (
                      <span className="ml-2 text-amber-500">
                        推定 {formatNumber(h.estimated_quantity, 0)}
                      </span>
                    )}
                    {h.estimated_quantity == null && (
                      <span className="ml-2">
                        {formatNumber(h.quantity, h.quantity % 1 === 0 ? 0 : 8)}
                      </span>
                    )}
                    {h.monthly_amount && (
                      <span className="ml-2 text-indigo-400">
                        積立 {formatJpy(h.monthly_amount)}/月
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {h.value_jpy != null ? (
                    <p className="font-medium text-zinc-800">
                      {formatJpy(h.value_jpy)}
                    </p>
                  ) : (
                    <p className="text-zinc-400">価格取得不可</p>
                  )}
                  {h.price != null && (
                    <p className="text-xs text-zinc-400">
                      @{h.currency === "USD" ? "$" : ""}
                      {formatNumber(h.price, 2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {account.holdings.length === 0 && (
              <p className="px-5 py-3 text-sm text-zinc-400">銘柄なし</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
