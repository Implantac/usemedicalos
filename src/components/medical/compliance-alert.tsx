import { AlertOctagon, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ComplianceReport, ComplianceStatus } from "@/lib/medical/compliance";
import { cn } from "@/lib/utils";

const CFG: Record<ComplianceStatus, { icon: typeof CheckCircle2; label: string; cls: string }> = {
  ok: { icon: CheckCircle2, label: "Compliance ANVISA/CMED OK", cls: "border-success/30 bg-success/10 text-success" },
  warning: { icon: ShieldAlert, label: "Atenção regulatória", cls: "border-warning/40 bg-warning/10 text-warning-foreground" },
  blocked: { icon: AlertOctagon, label: "Bloqueio regulatório", cls: "border-danger/40 bg-danger/10 text-danger" },
  overridden: { icon: ShieldCheck, label: "Liberado por gestor", cls: "border-primary/40 bg-primary/10 text-primary" },
};

interface Props {
  report: ComplianceReport;
  onOverride?: (sku: string) => void;
  onRevoke?: (sku: string) => void;
}

export function ComplianceAlert({ report, onOverride, onRevoke }: Props) {
  const cfg = CFG[report.status];
  const Icon = cfg.icon;
  return (
    <div className={cn("rounded-md border p-3 text-xs", cfg.cls)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">{cfg.label}</div>
          <div className="mt-0.5 opacity-90">{report.summary}</div>
          {report.status !== "ok" && (
            <ul className="mt-2 space-y-1">
              {report.checks
                .filter((c) => c.status !== "ok")
                .map((c) => (
                  <li key={c.sku} className="flex items-start justify-between gap-2 text-[11px]">
                    <div className="min-w-0">
                      <span className="font-semibold">{c.sku}</span> — {c.reason}
                      {c.cmed_pmc ? ` · PMC ${c.cmed_pmc.toFixed(2)}` : ""}
                    </div>
                    {c.status === "blocked" && onOverride && (
                      <button
                        type="button"
                        onClick={() => onOverride(c.sku)}
                        className="shrink-0 rounded border border-current/40 px-1.5 py-0.5 text-[10px] font-bold uppercase hover:bg-current/10"
                      >
                        Liberar (gestor)
                      </button>
                    )}
                    {c.status === "overridden" && onRevoke && (
                      <button
                        type="button"
                        onClick={() => onRevoke(c.sku)}
                        className="shrink-0 rounded border border-current/40 px-1.5 py-0.5 text-[10px] font-bold uppercase hover:bg-current/10"
                      >
                        Revogar
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
