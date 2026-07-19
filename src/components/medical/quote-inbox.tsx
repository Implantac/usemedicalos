import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, BookmarkPlus, Building2, CheckSquare, Download, FileSpreadsheet, Filter, Layers, Pin, PinOff, Rows3, Search, Share2, Square, Trash2, Undo2, Upload, X } from "lucide-react";
import { useInboxDensity } from "@/hooks/use-inbox-density";

import type { Quote, QuoteStatus } from "@/lib/medical/types";
import { STATUS_LABEL } from "@/lib/medical/types";
import { quoteTotals, formatBRL, formatPct } from "@/lib/medical/pricing";
import { nextStatus, prevStatus, slaBucketOf, SLA_LABEL, type SlaBucket } from "@/lib/medical/pipeline";
import { OWNERS, TENANTS, tenantById, ownerById } from "@/lib/medical/mock-data";
import { slaState } from "./sla-indicator";
import { PriorityBadge, SourceTag, StatusBadge } from "./badges";
import { SlaIndicator } from "./sla-indicator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInboxViews, type InboxSort, type InboxViewState } from "@/hooks/use-inbox-views";
import { decodeViewState, encodeViewState } from "@/lib/medical/view-encoding";

const PRIORITY_RANK = { urgente: 0, alta: 1, normal: 2, baixa: 3 } as const;
const ALL_STATUS = Object.keys(STATUS_LABEL) as QuoteStatus[];

const SORT_LABEL: Record<InboxSort, string> = {
  priority: "Prioridade + SLA",
  sla: "SLA mais curto",
  revenue_desc: "Maior receita",
  received_desc: "Mais recente",
};

interface Props {
  quotes: Quote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdvance: (id: string, status: QuoteStatus) => void;
  onTogglePin?: (id: string) => void;
}

export function QuoteInbox({ quotes, selectedId, onSelect, onAdvance, onTogglePin }: Props) {
  const [q, setQ] = useState("");
  const [tenant, setTenant] = useState<string>("todos");
  const [owner, setOwner] = useState<string>("todos");
  const [sla, setSla] = useState<SlaBucket>("todos");
  const [statuses, setStatuses] = useState<Set<QuoteStatus>>(new Set());
  const [sort, setSort] = useState<InboxSort>("priority");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { density, setDensity } = useInboxDensity();
  const foco = density === "foco";


  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const { views, saveView, deleteView } = useInboxViews();
  const fileRef = useRef<HTMLInputElement | null>(null);


  const currentState = (): InboxViewState => ({
    q, tenant, owner, sla, statuses: Array.from(statuses), sort,
  });

  const applyState = (s: InboxViewState) => {
    setQ(s.q ?? "");
    setTenant(s.tenant ?? "todos");
    setOwner(s.owner ?? "todos");
    setSla(s.sla ?? "todos");
    setStatuses(new Set(s.statuses ?? []));
    setSort(s.sort ?? "priority");
  };

  // Aplica ?view=<base64> ao montar (compartilhamento entre dispositivos)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get("view");
    if (!encoded) return;
    const state = decodeViewState(encoded);
    if (!state) { toast.error("Link de visualização inválido"); return; }
    applyState(state);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", url.toString());
    toast("Visualização carregada do link");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const toggleStatus = (s: QuoteStatus) => {
    setActiveViewId(null);
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const clearFilters = () => {
    setQ(""); setTenant("todos"); setOwner("todos"); setSla("todos");
    setStatuses(new Set()); setSort("priority"); setActiveViewId(null);
  };

  const handleSaveView = () => {
    const name = viewName.trim();
    if (!name) { toast.error("Dê um nome à visualização"); return; }
    const v = saveView(name, currentState());
    setActiveViewId(v.id);
    setSaveOpen(false);
    setViewName("");
    toast.success(`Visualização "${v.name}" salva`);
  };

  const handleLoadView = (id: string) => {
    if (id === "__none__") { setActiveViewId(null); return; }
    const v = views.find((x) => x.id === id);
    if (!v) return;
    applyState(v.state);
    setActiveViewId(v.id);
    toast(`Visualização "${v.name}" aplicada`);
  };

  const handleDeleteView = () => {
    if (!activeViewId) return;
    const v = views.find((x) => x.id === activeViewId);
    deleteView(activeViewId);
    setActiveViewId(null);
    if (v) toast(`Visualização "${v.name}" removida`);
  };

  const handleShare = async () => {
    const encoded = encodeViewState(currentState());
    const url = new URL(window.location.href);
    url.searchParams.set("view", encoded);
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado — abra em outro dispositivo para carregar os filtros");
    } catch {
      toast(link);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(views, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inbox-views-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${views.length} visualização(ões) exportada(s)`);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [];
      let n = 0;
      for (const v of list) {
        if (v && typeof v.name === "string" && v.state) {
          saveView(v.name, v.state as InboxViewState);
          n++;
        }
      }
      if (n === 0) toast.error("Nenhuma visualização válida no arquivo");
      else toast.success(`${n} visualização(ões) importada(s)`);
    } catch {
      toast.error("Arquivo JSON inválido");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };



  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = quotes
      .filter((x) => tenant === "todos" || x.tenant_id === tenant)
      .filter((x) => owner === "todos" || x.owner_id === owner)
      .filter((x) => statuses.size === 0 || statuses.has(x.status))
      .filter((x) => sla === "todos" || slaBucketOf(x.sla_deadline) === sla)
      .filter((x) =>
        !needle
          ? true
          : x.customer_name.toLowerCase().includes(needle) ||
            x.id.toLowerCase().includes(needle) ||
            x.items.some((i) => i.sku.toLowerCase().includes(needle) || i.name.toLowerCase().includes(needle)),
      );

    return list.sort((a, b) => {
      // Pinned quotes sempre no topo, independente do modo de ordenação.
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      switch (sort) {
        case "sla":
          return slaState(a.sla_deadline).hours - slaState(b.sla_deadline).hours;
        case "revenue_desc":
          return quoteTotals(b.items).revenue - quoteTotals(a.items).revenue;
        case "received_desc":
          return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
        case "priority":
        default: {
          const pa = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          if (pa !== 0) return pa;
          return slaState(a.sla_deadline).hours - slaState(b.sla_deadline).hours;
        }
      }
    });
  }, [quotes, q, tenant, owner, sla, statuses, sort]);

  const activeCount =
    (tenant !== "todos" ? 1 : 0) +
    (owner !== "todos" ? 1 : 0) +
    (sla !== "todos" ? 1 : 0) +
    (statuses.size > 0 ? 1 : 0) +
    (sort !== "priority" ? 1 : 0) +
    (q.trim() ? 1 : 0);

  // Transições de pipeline com Undo (toast action) — reverte para o status anterior.
  const runTransition = (qt: Quote, to: QuoteStatus, kind: "advance" | "regress" | "lost") => {
    const from = qt.status;
    onAdvance(qt.id, to);
    const msg = `${qt.customer_name}: ${STATUS_LABEL[from]} → ${STATUS_LABEL[to]}`;
    const action = { label: "Desfazer", onClick: () => {
      onAdvance(qt.id, from);
      toast(`${qt.customer_name}: revertido para ${STATUS_LABEL[from]}`);
    }};
    if (kind === "lost") toast.error(`${qt.customer_name} marcado como perdido`, { action });
    else if (kind === "regress") toast(msg, { action });
    else toast.success(msg, { action });
  };

  // Bulk actions — aplica transição em N quotes de uma vez, com Undo em lote.
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelected = () => setSelected(new Set());
  const selectAllVisible = () => setSelected(new Set(filtered.map((x) => x.id)));

  const runBulk = (kind: "advance" | "regress" | "lost") => {
    const targets = filtered.filter((x) => selected.has(x.id));
    if (targets.length === 0) return;
    const snapshots: Array<{ id: string; from: QuoteStatus }> = [];
    let applied = 0;
    for (const qt of targets) {
      const to =
        kind === "advance" ? nextStatus(qt.status) :
        kind === "regress" ? prevStatus(qt.status) :
        "perdido" as QuoteStatus;
      if (!to || to === qt.status) continue;
      snapshots.push({ id: qt.id, from: qt.status });
      onAdvance(qt.id, to);
      applied++;
    }
    if (applied === 0) { toast("Nenhuma cotação elegível para essa ação"); return; }
    const label =
      kind === "advance" ? "avançadas" :
      kind === "regress" ? "revertidas" : "marcadas como perdidas";
    const action = { label: "Desfazer", onClick: () => {
      snapshots.forEach((s) => onAdvance(s.id, s.from));
      toast(`${snapshots.length} cotação(ões) restauradas`);
    }};
    if (kind === "lost") toast.error(`${applied} cotação(ões) ${label}`, { action });
    else toast.success(`${applied} cotação(ões) ${label}`, { action });
    clearSelected();
  };

  const handleAdvance = (e: React.MouseEvent, qt: Quote) => {
    e.stopPropagation();
    const ns = nextStatus(qt.status);
    if (!ns) return;
    runTransition(qt, ns, "advance");
  };

  // Navegação por teclado estilo Gmail/Superhuman:
  //   j / ↓  → próxima linha
  //   k / ↑  → linha anterior
  //   Enter  → abre o drawer da linha em foco
  //   x      → avança pipeline (nextStatus)
  //   Ignora quando usuário está digitando em input/textarea/select/contenteditable.
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (filtered.length === 0) return;
      const idx = selectedId ? filtered.findIndex((x) => x.id === selectedId) : -1;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, idx + 1)] ?? filtered[0];
        onSelect(next.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = filtered[Math.max(0, idx - 1)] ?? filtered[0];
        onSelect(next.id);
      } else if (e.key === "Enter" && idx >= 0) {
        e.preventDefault();
        onSelect(filtered[idx].id);
      } else if (e.key === "x" && idx >= 0) {
        const qt = filtered[idx];
        const ns = nextStatus(qt.status);
        if (!ns) return;
        e.preventDefault();
        runTransition(qt, ns, "advance");
      } else if (e.key === " " && idx >= 0) {
        // Space: toggle selection on focused row (multi-select estilo Gmail)
        e.preventDefault();
        toggleSelected(filtered[idx].id);
      } else if (e.key === "Escape" && selected.size > 0) {
        e.preventDefault();
        clearSelected();
      } else if ((e.key === "A" || e.key === "a") && e.shiftKey) {
        e.preventDefault();
        selectAllVisible();
      } else if (e.key === "p" && idx >= 0 && onTogglePin) {
        e.preventDefault();
        const qt = filtered[idx];
        onTogglePin(qt.id);
        toast(qt.pinned ? `${qt.customer_name} desfixado` : `${qt.customer_name} fixado no topo`);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedId, onSelect, onAdvance, selected.size, onTogglePin]);

  const handleRegress = (e: React.MouseEvent, qt: Quote) => {
    e.stopPropagation();
    const ps = prevStatus(qt.status);
    if (!ps) return;
    runTransition(qt, ps, "regress");
  };

  const handleLost = (e: React.MouseEvent, qt: Quote) => {
    e.stopPropagation();
    runTransition(qt, "perdido", "lost");
  };

  // Wrap setters so manual filter changes clear active view marker
  const wrap = <T,>(setter: (v: T) => void) => (v: T) => { setActiveViewId(null); setter(v); };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b bg-card p-3">
        {/* Saved views bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Bookmark className="h-3 w-3" /> Visualizações
          </span>
          <Select value={activeViewId ?? "__none__"} onValueChange={handleLoadView}>
            <SelectTrigger className="h-8 w-full sm:w-64">
              <SelectValue placeholder={views.length ? "Carregar visualização…" : "Nenhuma salva"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Sem visualização —</SelectItem>
              {views.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-[11px]">
                <BookmarkPlus className="h-3.5 w-3.5" /> Salvar atual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar visualização</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="Ex.: Urgentes em risco - Sudeste"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
                />
                <p className="text-[11px] text-muted-foreground">
                  Salva os filtros atuais (busca, tenant, vendedor, SLA, status) e a ordenação.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveView}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {activeViewId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-[11px] text-danger hover:text-danger"
              onClick={handleDeleteView}
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-[11px]"
              onClick={handleShare}
              title="Copiar link com os filtros atuais"
            >
              <Share2 className="h-3.5 w-3.5" /> Compartilhar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-[11px]"
              onClick={handleExport}
              disabled={views.length === 0}
              title="Baixar todas as visualizações em JSON"
            >
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-[11px]"
              onClick={() => fileRef.current?.click()}
              title="Importar visualizações de um JSON"
            >
              <Upload className="h-3.5 w-3.5" /> Importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
          </div>
        </div>


        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setActiveViewId(null); setQ(e.target.value); }}
              placeholder="Buscar cliente, SKU ou ID…"
              className="h-9 pl-8"
            />
          </div>

          <Select value={tenant} onValueChange={wrap(setTenant)}>
            <SelectTrigger className="h-9 w-full sm:w-52">
              <Building2 className="mr-1.5 h-3.5 w-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tenants</SelectItem>
              {TENANTS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={owner} onValueChange={wrap(setOwner)}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {OWNERS.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sla} onValueChange={wrap((v: string) => setSla(v as SlaBucket))}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SLA_LABEL) as SlaBucket[]).map((s) => (
                <SelectItem key={s} value={s}>{SLA_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={wrap((v: string) => setSort(v as InboxSort))}>
            <SelectTrigger className="h-9 w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as InboxSort[]).map((s) => (
                <SelectItem key={s} value={s}>Ordenar: {SORT_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Filter className="h-3 w-3" /> Status
          </span>
          {ALL_STATUS.map((s) => {
            const active = statuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-smooth press",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 gap-1 px-2 text-[11px]"
              onClick={clearFilters}
              aria-label={`Limpar ${activeCount} filtro(s) ativos`}
              title="Limpar filtros"
            >
              <X className="h-3 w-3" aria-hidden="true" /> Limpar filtros ({activeCount})
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="inline-flex rounded-md border bg-background p-0.5" role="tablist" aria-label="Densidade da inbox">
              <button
                type="button"
                onClick={() => setDensity("foco")}
                aria-pressed={foco}
                title="Modo Foco — 3 colunas essenciais"
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-smooth",
                  foco ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="h-3 w-3" /> Foco
              </button>
              <button
                type="button"
                onClick={() => setDensity("detalhada")}
                aria-pressed={!foco}
                title="Modo Detalhada — todas as metainformações"
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-smooth",
                  !foco ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Rows3 className="h-3 w-3" /> Detalhada
              </button>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium">
              {filtered.length} de {quotes.length}
            </Badge>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/95 px-3 py-2 text-primary-foreground shadow-sm">
          <CheckSquare className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{selected.size} selecionada(s)</span>
          <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={selectAllVisible}>
            Selecionar todas ({filtered.length})
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-[11px]" onClick={() => runBulk("advance")}>
              <ArrowRight className="h-3 w-3" /> Avançar
            </Button>
            <Button size="sm" variant="secondary" className="h-6 gap-1 px-2 text-[11px]" onClick={() => runBulk("regress")}>
              <Undo2 className="h-3 w-3" /> Voltar
            </Button>
            <Button size="sm" variant="destructive" className="h-6 gap-1 px-2 text-[11px]" onClick={() => runBulk("lost")}>
              Marcar perdidas
            </Button>
            <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" onClick={clearSelected}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          </div>
        </div>
      )}

      <ul className="flex-1 divide-y overflow-y-auto">

        {filtered.length === 0 && (
          <li className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma cotação encontrada</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Ajuste os filtros ou limpe a busca para ver todas as cotações do pipeline.
            </p>
            {activeCount > 0 && (
              <Button size="sm" variant="outline" className="mt-1 h-7 gap-1 text-xs" onClick={clearFilters}>
                <X className="h-3 w-3" /> Limpar filtros
              </Button>
            )}
          </li>
        )}
        {filtered.map((qt) => {
          const totals = quoteTotals(qt.items);
          const active = qt.id === selectedId;
          const ns = nextStatus(qt.status);
          const ps = prevStatus(qt.status);
          const t = tenantById(qt.tenant_id);
          const ow = ownerById(qt.owner_id);
          const isSel = selected.has(qt.id);
          return (
            <li key={qt.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(qt.id)}
                onKeyDown={(e) => (e.key === "Enter" ? onSelect(qt.id) : null)}
                className={cn(
                  "group relative w-full cursor-pointer px-3 py-1.5 pl-3.5 text-left transition-colors hover:bg-accent/40",
                  "before:pointer-events-none before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-transparent before:transition-colors",
                  active && "bg-accent/60 before:bg-brand",
                  isSel && "bg-primary/5 before:bg-primary",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    aria-label={isSel ? "Desmarcar cotação" : "Selecionar cotação"}
                    aria-pressed={isSel}
                    onClick={(e) => { e.stopPropagation(); toggleSelected(qt.id); }}
                    className={cn(
                      "mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-opacity hover:text-primary",
                      isSel || selected.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                    )}
                  >
                    {isSel ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {qt.customer_name}
                      </span>
                      {!foco && <SourceTag source={qt.source_type} />}
                      {!foco && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          <Building2 className="h-3 w-3" /> {t.name}
                        </span>
                      )}
                    </div>
                    {!foco && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        #{qt.id.toUpperCase()} · {qt.customer_segment} · {ow.name} · {qt.items.length} item(ns)
                      </p>
                    )}
                    {foco && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        #{qt.id.toUpperCase()} · {ow.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {onTogglePin && (
                      <button
                        type="button"
                        aria-label={qt.pinned ? "Desfixar cotação" : "Fixar cotação no topo"}
                        aria-pressed={!!qt.pinned}
                        title={qt.pinned ? "Desfixar" : "Fixar no topo (p)"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(qt.id);
                          toast(qt.pinned ? `${qt.customer_name} desfixado` : `${qt.customer_name} fixado no topo`);
                        }}
                        className={cn(
                          "shrink-0 rounded p-0.5 transition-opacity hover:text-brand",
                          qt.pinned
                            ? "text-brand opacity-100"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100",
                        )}
                      >
                        {qt.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <SlaIndicator deadline={qt.sla_deadline} compact />
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <PriorityBadge priority={qt.priority} />
                    {!foco && <StatusBadge status={qt.status} />}
                  </div>
                  <div className="num text-right leading-tight">
                    <div className="text-sm font-semibold text-foreground">{formatBRL(totals.revenue)}</div>
                    <div className={cn(
                      "text-[10px] font-medium",
                      totals.margin < 0.12 ? "text-danger" : "text-success",
                    )}>
                      margem {formatPct(totals.margin)}
                    </div>
                  </div>
                </div>

                {(ns || ps) && (!foco || active) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t pt-1.5">
                    {ns && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-6 gap-1 px-2 text-[10px]"
                        onClick={(e) => handleAdvance(e, qt)}
                      >
                        Avançar → {STATUS_LABEL[ns]} <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                    {ps && qt.status !== "aguardando_precificacao" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 px-1.5 text-[10px]"
                        onClick={(e) => handleRegress(e, qt)}
                      >
                        <Undo2 className="h-3 w-3" /> Voltar
                      </Button>
                    )}
                    {qt.status !== "ganho" && qt.status !== "perdido" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 px-1.5 text-[10px] text-danger hover:text-danger"
                        onClick={(e) => handleLost(e, qt)}
                      >
                        Marcar perdido
                      </Button>
                    )}
                  </div>
                )}

              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
