import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Entry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

const CHANGELOG: Entry[] = [
  {
    version: "0.14.0",
    date: "2026-07-18",
    title: "Produtividade & Descoberta",
    items: [
      "Command Palette (⌘K) — busca global de rotas, cotações e tenants",
      "Atalhos de teclado (?) com navegação g+letra (g i, g e, g a…)",
      "Changelog integrado com badge de novidades",
    ],
  },
  {
    version: "0.13.0",
    date: "2026-07-17",
    title: "Painel Executivo",
    items: [
      "Dashboard consolidado: receita em risco, comissões projetadas, throughput",
      "Ranking de clientes e leaderboard de vendedores",
      "Integridade da auditoria em tempo real",
    ],
  },
  {
    version: "0.12.0",
    date: "2026-07-16",
    title: "Cloud Readiness & Governança",
    items: [
      "Repository pattern + feature flag VITE_USE_CLOUD",
      "Painel de compliance por tenant com score A–D",
      "Data residency com purga automática por retention_days",
      "Auditoria imutável com hash-chain djb2",
    ],
  },
  {
    version: "0.11.0",
    date: "2026-07-15",
    title: "Ingestion Engine + Auto-Draft",
    items: [
      "POST /api/v1/ingest com HMAC + rate-limit",
      "Auto-draft de resposta usando o Pricing Engine",
      "Client Intel: win-rate e sugestão de tier por histórico",
      "Browser Agent (extensão Chrome) para portais",
    ],
  },
];

const LS_KEY = "use-medical:changelog-seen:v1";
const LATEST = CHANGELOG[0].version;

export function ChangelogButton() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string>(LATEST);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(LS_KEY);
      setSeen(v ?? "");
    } catch {
      setSeen("");
    }
  }, []);

  const hasNew = seen !== LATEST;

  const markSeen = () => {
    try {
      window.localStorage.setItem(LS_KEY, LATEST);
      setSeen(LATEST);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          markSeen();
        }}
        aria-label="Novidades"
        className="relative inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary-foreground/80 transition-smooth hover:bg-primary-foreground/10 hover:text-primary-foreground"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Novidades</span>
        {hasNew && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand shadow-[0_0_0_2px_var(--color-primary)]" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              O que há de novo
            </DialogTitle>
            <DialogDescription>
              Últimas entregas do Commercial OS. Versão atual: <code className="rounded bg-muted px-1">{LATEST}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {CHANGELOG.map((e, idx) => (
              <div key={e.version} className="rounded-md border border-border/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">v{e.version}</span>
                    <span className="text-sm font-semibold">{e.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {idx === 0 && (
                      <Badge variant="outline" className="border-brand/40 text-brand">
                        novo
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{e.date}</span>
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {e.items.map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
