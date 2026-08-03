import { useCallback, useEffect, useState } from "react";

/**
 * Metas diárias configuráveis por vendedor (persistidas em localStorage).
 * Padrão: R$ 1.500 de comissão/dia.
 */

const STORAGE_KEY = "use-medical:owner-goals:v1";
const DEFAULT_GOAL = 1500;

type GoalsMap = Record<string, number>;

function load(): GoalsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GoalsMap) : {};
  } catch {
    return {};
  }
}

export function useOwnerGoals() {
  const [goals, setGoals] = useState<GoalsMap>(() => load());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  const getGoal = useCallback((ownerId: string): number => goals[ownerId] ?? DEFAULT_GOAL, [goals]);

  const setGoal = useCallback((ownerId: string, value: number) => {
    setGoals((prev) => ({ ...prev, [ownerId]: value }));
  }, []);

  const resetGoal = useCallback((ownerId: string) => {
    setGoals((prev) => {
      const next = { ...prev };
      delete next[ownerId];
      return next;
    });
  }, []);

  return { getGoal, setGoal, resetGoal, DEFAULT_GOAL };
}
