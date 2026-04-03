"use client";

import useSWR from "swr";
import type { AccountWithHoldings, CategoryBreakdown, Snapshot } from "@/lib/types";

interface PortfolioData {
  total_jpy: number;
  usd_jpy: number;
  gold_usd_oz: number;
  accounts: AccountWithHoldings[];
  breakdown: CategoryBreakdown[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function usePortfolio() {
  const { data, error, isLoading, mutate } = useSWR<PortfolioData>(
    "/api/prices",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  return { data, error, isLoading, mutate };
}

function useSnapshots(days = 90) {
  const { data, error, isLoading } = useSWR<Snapshot[]>(
    `/api/snapshots?days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { snapshots: data, error, isLoading };
}

export { usePortfolio, useSnapshots };
export type { PortfolioData };
