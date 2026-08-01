import { useCallback, useEffect, useState } from "react";

/**
 * Participação em licitações — USE Medical
 *
 * Guarda as cotações (licitações) em que o usuário OPTIOU participar.
 * A decisão é 100% do usuário; o sistema apenas persiste a escolha.
 */

const STORAGE_KEY = "use-medical:tender-participation:v1";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function useTenderParticipation() {
  const [participating, setParticipating] = useState<Set<string>>(() => load());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setParticipating(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(participating)));
  }, [participating, hydrated]);

  /** Decide participar de uma cotação. */
  const participate = useCallback((quoteId: string) => {
    setParticipating((prev) => {
      const next = new Set(prev);
      next.add(quoteId);
      return next;
    });
  }, []);

  /** Decide NÃO participar de uma cotação. */
  const withdraw = useCallback((quoteId: string) => {
    setParticipating((prev) => {
      const next = new Set(prev);
      next.delete(quoteId);
      return next;
    });
  }, []);

  /** Alterna a decisão de participação. */
  const toggleParticipation = useCallback((quoteId: string) => {
    setParticipating((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) next.delete(quoteId);
      else next.add(quoteId);
      return next;
    });
  }, []);

  /** Marca várias de uma vez (seleção em lote). */
  const participateMany = useCallback((ids: string[]) => {
    setParticipating((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const withdrawMany = useCallback((ids: string[]) => {
    setParticipating((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const isParticipating = useCallback(
    (quoteId: string) => participating.has(quoteId),
    [participating],
  );

  return {
    participating,
    hydrated,
    participate,
    withdraw,
    toggleParticipation,
    participateMany,
    withdrawMany,
    isParticipating,
  };
}
