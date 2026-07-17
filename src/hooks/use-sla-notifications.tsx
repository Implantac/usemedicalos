import { useCallback, useEffect, useRef, useState } from "react";
import { useQuotes } from "@/hooks/use-quotes";
import { slaBucketOf } from "@/lib/medical/pipeline";

const STORAGE_KEY = "use-medical:notif-enabled";
const SEEN_KEY = "use-medical:notif-seen";

type Permission = "default" | "granted" | "denied" | "unsupported";

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set).slice(-200)));
  } catch {
    /* noop */
  }
}

export function useSlaNotifications() {
  const { quotes } = useQuotes();
  const [permission, setPermission] = useState<Permission>("default");
  const [enabled, setEnabled] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as Permission);
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    seenRef.current = readSeen();
  }, []);

  const request = useCallback(async () => {
    if (permission === "unsupported") return false;
    const res = await Notification.requestPermission();
    setPermission(res as Permission);
    if (res === "granted") {
      localStorage.setItem(STORAGE_KEY, "1");
      setEnabled(true);
      return true;
    }
    return false;
  }, [permission]);

  const disable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "0");
    setEnabled(false);
  }, []);

  useEffect(() => {
    if (!enabled || permission !== "granted") return;
    const overdue = quotes.filter(
      (q) =>
        (q.status === "aguardando_precificacao" || q.status === "em_negociacao") &&
        slaBucketOf(q.sla_deadline) === "atrasado",
    );
    const seen = seenRef.current;
    const fresh = overdue.filter((q) => !seen.has(q.id));
    if (fresh.length === 0) return;

    fresh.slice(0, 3).forEach((q) => {
      try {
        new Notification("USE Medical — SLA atrasado", {
          body: `${q.customer_name} · #${q.id.slice(0, 8)}`,
          tag: `sla-${q.id}`,
          icon: "/pwa-192.png",
        });
      } catch {
        /* noop */
      }
      seen.add(q.id);
    });
    writeSeen(seen);
  }, [quotes, enabled, permission]);

  return { permission, enabled, request, disable };
}
