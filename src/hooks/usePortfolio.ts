import { useState, useEffect, useCallback } from "react";
import type { PortfolioData, Snapshot } from "@/lib/types";
import { fetchPortfolio, getSnapshots } from "@/lib/api";

function usePortfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPortfolio();
      setData(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

function useSnapshots(days = 90) {
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSnapshots(days)
      .then(setSnapshots)
      .finally(() => setIsLoading(false));
  }, [days]);

  return { snapshots, isLoading };
}

export { usePortfolio, useSnapshots };
