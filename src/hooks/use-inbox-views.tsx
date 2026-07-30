import { useCallback, useEffect, useState } from "react";
import type { QuoteStatus } from "@/lib/medical/types";
import type { SlaBucket } from "@/lib/medical/pipeline";

export type InboxSort = "priority" | "sla" | "revenue_desc" | "received_desc";

export interface InboxViewState {
  q: string;
  tenant: string;
  owner: string;
  sla: SlaBucket;
  statuses: QuoteStatus[];
  sort: InboxSort;
}

export interface InboxView {
  id: string;
  name: string;
  state: InboxViewState;
  created_at: string;
}

const STORAGE_KEY = "use-medical:inbox-views:v1";

function load(): InboxView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InboxView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useInboxViews() {
  const [views, setViews] = useState<InboxView[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setViews(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  }, [views, hydrated]);

  const saveView = useCallback((name: string, state: InboxViewState): InboxView => {
    const view: InboxView = {
      id: `v${Date.now().toString(36)}`,
      name: name.trim() || "Visualização sem nome",
      state,
      created_at: new Date().toISOString(),
    };
    setViews((prev) => [view, ...prev.filter((v) => v.name !== view.name)]);
    return view;
  }, []);

  const deleteView = useCallback((id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { views, hydrated, saveView, deleteView };
}
