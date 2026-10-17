import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, toApiError } from '../api/client';

/** Loads data once (and on demand). Exposes loading / refreshing / error for pull-to-refresh and retry UI. */
export function useApi<R>(fn: () => Promise<R>, deps: unknown[] = []) {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const run = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true); else setRefreshing(true);
    try {
      const r = await fn();
      if (alive.current) { setData(r); setError(null); }
    } catch (e) {
      if (alive.current) setError(toApiError(e));
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run('initial'); }, [run]);
  return { data, error, loading, refreshing, reload: () => run('initial'), refresh: () => run('refresh') };
}
