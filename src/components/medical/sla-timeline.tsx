import type { DailyPoint } from "@/lib/medical/analytics";

export function SlaTimeline({ data }: { data: DailyPoint[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.received, d.sent)));
  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Cotações recebidas × respondidas
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" />Recebidas</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" />Respondidas</span>
        </div>
      </div>
      <div className="flex h-40 items-end gap-1">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end gap-0.5">
              <div
                className="flex-1 rounded-t bg-primary/80"
                style={{ height: `${(d.received / max) * 100}%` }}
                title={`${d.day}: ${d.received} recebidas`}
              />
              <div
                className="flex-1 rounded-t bg-success/80"
                style={{ height: `${(d.sent / max) * 100}%` }}
                title={`${d.day}: ${d.sent} respondidas`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
