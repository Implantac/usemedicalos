import { useCallback, useEffect, useState } from "react";
import {
  fireOverdue,
  listLogs,
  listSubscriptions,
  subscribeOutbound,
  type OutboundLog,
  type OutboundSubscription,
} from "@/lib/medical/outbound-webhooks";
import { slaBucketOf } from "@/lib/medical/pipeline";
import { useQuotes } from "@/hooks/use-quotes";

export function useOutboundWebhooks() {
  const { quotes } = useQuotes();
  const [subs, setSubs] = useState<OutboundSubscription[]>([]);
  const [logs, setLogs] = useState<OutboundLog[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSubs(listSubscriptions());
      setLogs(listLogs());
    };
    sync();
    setHydrated(true);
    return subscribeOutbound(sync);
  }, []);

  // Auto-dispatch: verifica cotações atrasadas a cada 30s.
  useEffect(() => {
    if (!hydrated) return;
    if (subs.filter((s) => s.enabled).length === 0) return;
    const tick = () =>
      fireOverdue(
        quotes,
        (q) =>
          (q.status === "aguardando_precificacao" || q.status === "em_negociacao") &&
          slaBucketOf(q.sla_deadline) === "atrasado",
      );
    void tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [quotes, subs, hydrated]);

  const test = useCallback(async () => {
    const target = quotes[0];
    if (!target) return 0;
    return fireOverdue([target], () => true);
  }, [quotes]);

  return { subs, logs, hydrated, test };
}
