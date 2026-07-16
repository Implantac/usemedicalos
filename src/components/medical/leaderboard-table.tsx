import { Link } from "@tanstack/react-router";
import type { OwnerRow } from "@/lib/medical/analytics";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";


export function LeaderboardTable({ rows }: { rows: OwnerRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card card-shadow">
      <div className="border-b bg-muted/40 px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Performance por vendedor
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/20 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Vendedor</th>
              <th className="px-2 py-2 text-right font-semibold">Cotações</th>
              <th className="px-2 py-2 text-right font-semibold">Pipeline</th>
              <th className="px-2 py-2 text-right font-semibold">Resp. média</th>
              <th className="px-2 py-2 text-right font-semibold">Margem</th>
              <th className="px-2 py-2 text-right font-semibold">Conversão</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.owner.id} className="hover:bg-accent/30">
                <td className="px-3 py-2">
                  <Link
                    to="/vendedor/$ownerId"
                    params={{ ownerId: r.owner.id }}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {r.owner.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{r.owner.name}</div>
                      <div className="text-[10px] text-muted-foreground">{r.owner.territory}</div>
                    </div>
                  </Link>
                </td>

                <td className="px-2 py-2 text-right num font-semibold">{r.count}</td>
                <td className="px-2 py-2 text-right num font-semibold">{formatBRL(r.pipeline)}</td>
                <td className="px-2 py-2 text-right num">{r.avgResponseHours.toFixed(1)}h</td>
                <td className={cn("px-2 py-2 text-right num font-semibold", r.avgMargin < 0.12 ? "text-danger" : "text-success")}>
                  {formatPct(r.avgMargin)}
                </td>
                <td className="px-2 py-2 text-right num font-semibold">{formatPct(r.conversion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
