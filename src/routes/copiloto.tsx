import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Copy, Mail, MessageCircle, Sparkles, Radar as RadarIcon } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { PermissionGate } from "@/components/medical/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { PRODUCTS } from "@/lib/medical/mock-data";
import { generateCopilot, type CopilotBundle, type CopilotChannel } from "@/lib/medical/copilot";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/copiloto")({
  head: () => ({
    meta: [
      { title: "Copiloto de resposta — USE Medical" },
      { name: "description", content: "Rascunhos prontos de WhatsApp e e-mail para cada cotação, com preços recalculados, compliance e talking points do cliente." },
      { property: "og:title", content: "Copiloto de resposta — USE Medical" },
      { property: "og:description", content: "Camada 6: resposta assistida. Responda em segundos com contexto completo." },
    ],
  }),
  component: CopilotoPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

function CopilotoPage() {
  return (
    <PermissionGate perm="quotes.respond" title="Copiloto restrito">
      <CopilotoInner />
    </PermissionGate>
  );
}

function CopilotoInner() {
  const { quotes } = useQuotes();
  const { tenant } = useActiveTenant();
  const { config } = useTenantConfig(tenant?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      quotes
        .filter((q) => q.status === "pending_review" || q.status === "aguardando_precificacao" || q.status === "em_negociacao")
        .sort((a, b) => new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime()),
    [quotes],
  );

  const activeId = selectedId ?? candidates[0]?.id ?? null;
  const active = candidates.find((q) => q.id === activeId) ?? null;

  const bundle: CopilotBundle | null = useMemo(() => {
    if (!active) return null;
    return generateCopilot(active, PRODUCTS, quotes, {
      minMargin: config?.minMargin,
      targetMargin: config?.targetMargin,
    });
  }, [active, quotes, config]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster richColors position="top-right" />
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Sparkles className="h-6 w-6 text-primary" />
              Copiloto de resposta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rascunhos prontos com preço, compliance e talking points. Camada 6: Resposta Assistida.
            </p>
          </div>
          <Badge variant="secondary" className="hidden md:inline-flex">
            <RadarIcon className="mr-1 h-3 w-3" /> {candidates.length} cotações elegíveis
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <QuoteList
            candidates={candidates}
            activeId={activeId}
            onSelect={setSelectedId}
          />
          {bundle ? (
            <CopilotWorkspace bundle={bundle} />
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhuma cotação elegível para resposta.{" "}
              <Link to="/inbox" className="underline">Voltar à inbox</Link>.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuoteList({
  candidates,
  activeId,
  onSelect,
}: {
  candidates: ReturnType<typeof useQuotes>["quotes"];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="space-y-2">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Fila do copiloto
      </p>
      <div className="space-y-1.5">
        {candidates.map((q) => {
          const isActive = q.id === activeId;
          const deadline = new Date(q.sla_deadline);
          const hoursLeft = Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60));
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(q.id)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{q.customer_name}</span>
                {q.client_tier && (
                  <Badge variant="outline" className="h-5 shrink-0 text-[10px]">
                    Tier {q.client_tier}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{q.items.length} itens</span>
                <span className={cn(hoursLeft < 4 ? "text-danger" : hoursLeft < 12 ? "text-warning" : "")}>
                  {hoursLeft > 0 ? `${hoursLeft}h SLA` : "SLA vencido"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CopilotWorkspace({ bundle }: { bundle: CopilotBundle }) {
  const [channel, setChannel] = useState<CopilotChannel>("whatsapp");
  const draft = channel === "whatsapp" ? bundle.whatsapp : channel === "email" ? bundle.email : bundle.resumo;
  const [body, setBody] = useState(draft.body);

  // Reset body quando muda o canal ou a quote.
  useMemo(() => setBody(draft.body), [draft.body]);

  const copy = () => {
    navigator.clipboard.writeText(body).then(() => toast.success("Rascunho copiado."));
  };

  const openChannel = () => {
    const text = encodeURIComponent(body);
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    } else if (channel === "email") {
      const subj = encodeURIComponent(draft.subject ?? "Proposta USE Medical");
      window.location.href = `mailto:?subject=${subj}&body=${text}`;
    } else {
      copy();
    }
  };

  const confidenceTone = draft.confidence >= 0.65 ? "text-success" : draft.confidence >= 0.35 ? "text-warning" : "text-danger";

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
          <ChannelPill icon={MessageCircle} label="WhatsApp" active={channel === "whatsapp"} onClick={() => setChannel("whatsapp")} />
          <ChannelPill icon={Mail} label="E-mail" active={channel === "email"} onClick={() => setChannel("email")} />
          <ChannelPill icon={Sparkles} label="Resumo executivo" active={channel === "resumo"} onClick={() => setChannel("resumo")} />
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className={confidenceTone}>Confiança IA: {pct(draft.confidence)}</span>
          </div>
        </div>

        {channel === "email" && draft.subject && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="mr-2 text-xs font-medium uppercase text-muted-foreground">Assunto</span>
            {draft.subject}
          </div>
        )}

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className="font-mono text-sm leading-relaxed"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openChannel}>
            {channel === "whatsapp" ? "Abrir no WhatsApp" : channel === "email" ? "Abrir e-mail" : "Copiar resumo"}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copiar
          </Button>
          <Link
            to="/inbox"
            search={{ open: bundle.quote.id }}
            className="text-xs text-muted-foreground underline"
          >
            Abrir na inbox
          </Link>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Snapshot</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Row k="Total" v={brl(bundle.total)} />
            <Row k="Margem" v={pct(bundle.margin)} tone={bundle.margin < 0.12 ? "danger" : bundle.margin < 0.2 ? "warning" : "ok"} />
            <Row k="Tier" v={bundle.quote.client_tier ?? "—"} />
            <Row
              k="Histórico"
              v={bundle.profile ? `${bundle.profile.wins}/${bundle.profile.total_quotes} · ${pct(bundle.profile.win_rate)}` : "sem histórico"}
            />
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Talking points</p>
          <ul className="mt-2 space-y-2 text-sm">
            {draft.talking_points.map((tp, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={cn(
                    "mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                    tp.kind === "risk" ? "bg-danger" : tp.kind === "opportunity" ? "bg-success" : "bg-muted-foreground",
                  )}
                />
                <span className="text-foreground/90">{tp.message}</span>
              </li>
            ))}
          </ul>
        </div>

        {draft.disclaimers.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-xs text-foreground/80">
            <p className="mb-1 font-medium text-warning-foreground">Disclaimers de compliance</p>
            <ul className="list-disc space-y-1 pl-4">
              {draft.disclaimers.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </section>
  );
}

function ChannelPill({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MessageCircle;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "ok" | "warning" | "danger" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd
        className={cn(
          "text-sm font-medium",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {v}
      </dd>
    </div>
  );
}
