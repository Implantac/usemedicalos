import { useCallback, useEffect, useState } from "react";
import type { ErpMappingConfig } from "@/lib/medical/erp-mapping";

export interface SavedMapping {
  id: string;
  name: string;
  config: ErpMappingConfig;
  created_at: string;
}

const STORAGE_KEY = "use-medical:erp-mappings:v1";

function load(): SavedMapping[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedMapping[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useErpMappings() {
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMappings(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  }, [mappings, hydrated]);

  const saveMapping = useCallback((name: string, config: ErpMappingConfig): SavedMapping => {
    const m: SavedMapping = {
      id: `m${Date.now().toString(36)}`,
      name: name.trim() || "Mapeamento sem nome",
      config,
      created_at: new Date().toISOString(),
    };
    setMappings((prev) => [m, ...prev.filter((x) => x.name !== m.name)]);
    return m;
  }, []);

  const deleteMapping = useCallback((id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { mappings, hydrated, saveMapping, deleteMapping };
}
