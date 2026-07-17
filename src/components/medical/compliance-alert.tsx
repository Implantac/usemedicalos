import { AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ComplianceReport, ComplianceStatus } from "@/lib/medical/compliance";
import { cn } from "@/lib/utils";

const CFG: Record<ComplianceStatus, { icon: typeof CheckCircle2; label: string; cls: string }> = {
  ok: { icon: CheckCircle2, label: "Compliance ANVISA/CMED OK", cls: "border-success/30 bg-success/10 text-success" },
  warning: { icon: ShieldAlert, label: "Atenção regulatória", cls: "border-warning/40 bg-warning/10 text-warning-foreground" },
  blocked: { icon: AlertOctagon, label: "Bloqueio regulatório", cls: "border-danger/40 bg-danger/10 text-danger" },
};

export function ComplianceAlert({ report }: { report: ComplianceReport }) {
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
            <ul className="mt-2 space-y-0.5">
              {report.checks
                .filter((c) => c.status !== "ok")
                .map((c) => (
                  <li key={c.sku} className="text-[11px]">
                    <span className="font-semibold">{c.sku}</span> — {c.reason}
                    {c.cmed_pmc ? ` · PMC ${c.cmed_pmc.toFixed(2)}` : ""}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
