import { useCallback, useState } from 'react';

/**
 * Tracks which entities (by id) currently have an action in flight, so a list
 * of items can show per-row busy state instead of disabling the whole list.
 *
 * Wrap a mutation's `mutate` call:
 *   begin(id);
 *   mutate(args, { onSettled: () => end(id) });
 * …and gate the row's controls with `has(id)`.
 */
export function usePendingIds() {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  const begin = useCallback((id: string) => {
    setIds((prev) => new Set(prev).add(id));
  }, []);

  const end = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { has, begin, end };
}
