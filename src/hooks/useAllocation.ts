import { useState, useEffect, useCallback } from "react";
import type { AllocationData } from "@/lib/types";
import { fetchAllocation } from "@/lib/api";

function useAllocation() {
  const [data, setData] = useState<AllocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchAllocation());
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

export { useAllocation };
