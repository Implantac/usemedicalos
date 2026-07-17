import { AlertOctagon, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import type { ComplianceReport, ComplianceStatus } from "@/lib/medical/compliance";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const CFG: Record<ComplianceStatus, { icon: typeof CheckCircle2; label: string; cls: string; band: string }> = {
  ok: {
    icon: CheckCircle2,
    label: "Checklist de Conformidade — OK",
    cls: "border-success/40 bg-success/5 text-success",
    band: "bg-success",
  },
  warning: {
    icon: ShieldAlert,
    label: "Checklist de Conformidade — Atenção",
    cls: "border-warning/50 bg-warning/10 text-warning-foreground",
    band: "bg-warning",
  },
  blocked: {
    icon: AlertOctagon,
    label: "PRODUTO CONTROLADO — Envio bloqueado",
    cls: "border-danger bg-danger/10 text-danger",
    band: "bg-danger",
  },
  overridden: {
    icon: ShieldCheck,
    label: "Liberado por gestor sob justificativa",
    cls: "border-primary/50 bg-primary/10 text-primary",
    band: "bg-primary",
  },
};

interface Props {
  report: ComplianceReport;
  confirmed?: boolean;
  onConfirmedChange?: (v: boolean) => void;
  onOverride?: (sku: string) => void;
  onRevoke?: (sku: string) => void;
}

export function ComplianceAlert({
  report,
  confirmed = false,
  onConfirmedChange,
  onOverride,
  onRevoke,
}: Props) {
  const cfg = CFG[report.status];
  const Icon = cfg.icon;
  const isBlocked = report.status === "blocked";
  const requiresConfirm =
    report.status === "warning" || report.status === "overridden" || isBlocked;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border-2 shadow-sm",
        cfg.cls,
        isBlocked && "ring-2 ring-danger/40",
      )}
    >
      {/* Faixa lateral proibitiva */}
      <div className={cn("absolute inset-y-0 left-0 w-1.5", cfg.band)} />

      <div className="p-3 pl-4">
        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", isBlocked && "animate-pulse")} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-black uppercase tracking-wide">
                {cfg.label}
              </span>
              {isBlocked && (
                <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-black uppercase text-danger-foreground">
                  ANVISA / CMED
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[12px] opacity-90">{report.summary}</div>

            {/* Checklist detalhado */}
            <ul className="mt-3 space-y-1.5">
              {report.checks.map((c) => {
                const isBad = c.status === "blocked";
                const isWarn = c.status === "warning";
                const isOver = c.status === "overridden";
                const isOk = c.status === "ok";
                const RowIcon = isBad
                  ? XCircle
                  : isWarn
                    ? ShieldAlert
                    : isOver
                      ? ShieldCheck
                      : CheckCircle2;
                return (
                  <li
                    key={c.sku}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px]",
                      isBad && "border-danger/40 bg-danger/10",
                      isWarn && "border-warning/40 bg-warning/10",
                      isOver && "border-primary/40 bg-primary/10",
                      isOk && "border-success/30 bg-success/5",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-1.5">
                      <RowIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-foreground">
                          SKU {c.sku}
                          {c.anvisa_code && (
                            <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-foreground">
                              ANVISA {c.anvisa_code}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {c.reason ?? "Registro válido, dentro do teto CMED"}
                          {c.cmed_pmc ? ` · PMC R$ ${c.cmed_pmc.toFixed(2)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isBad && onOverride && (
                        <button
                          type="button"
                          onClick={() => onOverride(c.sku)}
                          className="rounded border border-current/40 px-1.5 py-0.5 text-[10px] font-bold uppercase hover:bg-current/10"
                        >
                          Liberar (gestor)
                        </button>
                      )}
                      {isOver && onRevoke && (
                        <button
                          type="button"
                          onClick={() => onRevoke(c.sku)}
                          className="rounded border border-current/40 px-1.5 py-0.5 text-[10px] font-bold uppercase hover:bg-current/10"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Confirmação obrigatória */}
            {requiresConfirm && onConfirmedChange && (
              <label
                className={cn(
                  "mt-3 flex cursor-pointer items-start gap-2 rounded-md border-2 border-dashed p-2 text-[11px] font-semibold",
                  isBlocked
                    ? "border-danger/60 bg-danger/5 text-danger"
                    : "border-current/40 bg-background/40",
                )}
              >
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => onConfirmedChange(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  {isBlocked
                    ? "Confirmo ter revisado os bloqueios ANVISA/CMED. Só é possível enviar após liberação do gestor."
                    : "Confirmo que revisei todos os alertas regulatórios desta cotação (responsabilidade legal do vendedor)."}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
