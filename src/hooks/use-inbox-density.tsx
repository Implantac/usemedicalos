import { useEffect, useState } from "react";

export type InboxDensity = "foco" | "detalhada";
const KEY = "use-medical:inbox-density";

export function useInboxDensity() {
  const [density, setDensity] = useState<InboxDensity>("foco");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === "foco" || raw === "detalhada") setDensity(raw);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(KEY, density); } catch {}
  }, [density, hydrated]);

  return { density, setDensity };
}
