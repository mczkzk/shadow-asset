import { useState, useEffect, useCallback } from "react";
import type { PortfolioData, Snapshot } from "@/lib/types";
import { fetchPortfolio, getSnapshots } from "@/lib/api";

function usePortfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPortfolio();
      setData(result);
      setRefreshCount((c) => c + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refresh: load, refreshCount };
}

function useSnapshots(days = 90, refreshCount = 0) {
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSnapshots(days)
      .then(setSnapshots)
      .finally(() => setIsLoading(false));
  }, [days, refreshCount]);

  return { snapshots, isLoading };
}

export { usePortfolio, useSnapshots };
