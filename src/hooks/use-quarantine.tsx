import { useEffect, useState } from "react";
import {
  listQuarantine,
  subscribeQuarantine,
  type QuarantineItem,
} from "@/lib/medical/quarantine";

export function useQuarantine() {
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(listQuarantine());
    setHydrated(true);
    return subscribeQuarantine(() => setItems(listQuarantine()));
  }, []);

  return { items, hydrated };
}
