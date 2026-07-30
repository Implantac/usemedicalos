import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "use-medical:read-quotes:v1";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Rastreia quais cotações já foram "lidas" (abertas) pelo usuário.
 * Persistido em localStorage, escopo por navegador — nada é escrito no Quote.
 */
export function useQuoteReads() {
  const [read, setRead] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRead(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...read]));
  }, [read, hydrated]);

  const markRead = useCallback((ids: string[]) => {
    setRead((cur) => {
      const next = new Set(cur);
      let changed = false;
      for (const id of ids) if (!next.has(id)) { next.add(id); changed = true; }
      return changed ? next : cur;
    });
  }, []);

  const markUnread = useCallback((ids: string[]) => {
    setRead((cur) => {
      const next = new Set(cur);
      let changed = false;
      for (const id of ids) if (next.has(id)) { next.delete(id); changed = true; }
      return changed ? next : cur;
    });
  }, []);

  const isRead = useCallback((id: string) => read.has(id), [read]);

  return { read, isRead, markRead, markUnread, hydrated };
}
