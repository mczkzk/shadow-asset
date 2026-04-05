import { useState, useEffect, useCallback, useRef } from "react";
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

function useSnapshots(days?: number, refreshCount = 0) {
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prevCount = useRef(refreshCount);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // Skip the re-fetch triggered by initial load's refreshCount change
    if (prevCount.current === 0 && refreshCount === 1) {
      prevCount.current = refreshCount;
      return;
    }
    prevCount.current = refreshCount;

    setIsLoading(true);
    getSnapshots(days)
      .then(setSnapshots)
      .finally(() => setIsLoading(false));
  }, [days, refreshCount, reloadCount]);

  const reload = useCallback(() => setReloadCount((c) => c + 1), []);

  return { snapshots, isLoading, reload };
}

export { usePortfolio, useSnapshots };
