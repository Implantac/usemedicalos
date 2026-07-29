// Orquestração comercial (Camada 4 da visão USE Medical).
// Roteia cotações para o vendedor certo com base em:
//   - especialidade (win-rate por segmento e por keyword da cotação)
//   - carga atual (n de cotações abertas ponderada por SLA)
//   - ticket compatível (ticket médio ganho do vendedor vs valor da cotação)
//   - histórico com o cliente (se já venceu antes com aquele cliente, pesa forte)
//
// Também sabe FATIAR cotações grandes entre múltiplos vendedores usando a
// mesma especialidade — cada fatia é uma sugestão de sub-cotação que o
// gestor pode consolidar no fim.
//
// Puro / sem side-effects. Cloud-ready: em Supabase, vira uma view materializada
// + função RPC `suggest_owner(quote_id)` chamada pelo backend.
//
// Filtros da visão: reduz tempo de resposta (1), reduz retrabalho (4),
// aumenta chance de ganhar por match de especialidade (2).

import type { Owner, Quote, QuoteItem } from "./types";
import { quoteTotals } from "./pricing";

const OPEN_STATUSES = new Set([
  "pending_review",
  "aguardando_precificacao",
  "em_negociacao",
  "enviado",
]);

// ---------------- Especialidade ----------------

export interface OwnerSpecialty {
  owner_id: string;
  wins_total: number;
  losses_total: number;
  win_rate: number;               // 0..1
  avg_ticket_won: number;         // BRL
  by_segment: Map<string, { wins: number; losses: number; win_rate: number }>;
  by_keyword: Map<string, { wins: number; losses: number; win_rate: number }>;
  strong_segments: string[];      // top 3 segmentos com >= 2 wins e win_rate >= 0.4
  strong_keywords: string[];      // top 3 keywords com >= 2 wins e win_rate >= 0.4
}

function bump(
  map: Map<string, { wins: number; losses: number; win_rate: number }>,
  key: string,
  win: boolean,
) {
  const cur = map.get(key) ?? { wins: 0, losses: 0, win_rate: 0 };
  if (win) cur.wins++;
  else cur.losses++;
  const total = cur.wins + cur.losses;
  cur.win_rate = total ? cur.wins / total : 0;
  map.set(key, cur);
}

export function buildOwnerSpecialty(quotes: Quote[], ownerId: string): OwnerSpecialty {
  const closed = quotes.filter(
    (q) => q.owner_id === ownerId && (q.status === "ganho" || q.status === "perdido"),
  );
  const bySegment = new Map<string, { wins: number; losses: number; win_rate: number }>();
  const byKeyword = new Map<string, { wins: number; losses: number; win_rate: number }>();
  let wins = 0;
  let losses = 0;
  let wonRevenue = 0;
  for (const q of closed) {
    const won = q.status === "ganho";
    if (won) {
      wins++;
      wonRevenue += quoteTotals(q.items).revenue;
    } else losses++;
    bump(bySegment, q.customer_segment.toLowerCase().trim() || "outros", won);
    for (const kw of q.keywords ?? []) bump(byKeyword, kw.toLowerCase().trim(), won);
  }
  const strongSegments = [...bySegment.entries()]
    .filter(([, v]) => v.wins >= 2 && v.win_rate >= 0.4)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 3)
    .map(([k]) => k);
  const strongKeywords = [...byKeyword.entries()]
    .filter(([, v]) => v.wins >= 2 && v.win_rate >= 0.4)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 3)
    .map(([k]) => k);
  return {
    owner_id: ownerId,
    wins_total: wins,
    losses_total: losses,
    win_rate: wins + losses ? wins / (wins + losses) : 0,
    avg_ticket_won: wins ? wonRevenue / wins : 0,
    by_segment: bySegment,
    by_keyword: byKeyword,
    strong_segments: strongSegments,
    strong_keywords: strongKeywords,
  };
}

// ---------------- Carga (com peso de SLA) ----------------

export interface OwnerLoad {
  owner_id: string;
  open_count: number;
  urgent_count: number;
  pressure: number; // 0..∞ — 1 quote urgente pesa 2, alta 1.5, normal 1, baixa 0.5
}

const PRESSURE_WEIGHT: Record<Quote["priority"], number> = {
  urgente: 2,
  alta: 1.5,
  normal: 1,
  baixa: 0.5,
};

export function buildOwnerLoad(quotes: Quote[], ownerId: string): OwnerLoad {
  const open = quotes.filter((q) => q.owner_id === ownerId && OPEN_STATUSES.has(q.status));
  const urgent = open.filter((q) => q.priority === "urgente" || q.priority === "alta").length;
  const pressure = open.reduce((s, q) => s + PRESSURE_WEIGHT[q.priority], 0);
  return { owner_id: ownerId, open_count: open.length, urgent_count: urgent, pressure };
}

// ---------------- Sugestão de vendedor ----------------

export interface OwnerSuggestion {
  owner: Owner;
  score: number;              // 0..100+ (não normalizado, comparação relativa)
  reasons: string[];          // ["3 vitórias em Hospital privado", "carga baixa", …]
  breakdown: {
    specialty: number;
    load: number;
    ticket_fit: number;
    history: number;
  };
}

export interface SuggestOptions {
  balanceLoad?: boolean;      // default true — penaliza vendedores lotados
  historyBoost?: number;      // default 20 — bônus por vitória anterior com o mesmo cliente
}

/**
 * Sugere o melhor vendedor para uma cotação.
 * A cotação NÃO precisa ter `owner_id` — só usamos segment/keywords/valor/cliente.
 */
export function suggestOwner(
  quote: Pick<Quote, "customer_name" | "customer_segment" | "keywords" | "items" | "priority">,
  quotes: Quote[],
  owners: Owner[],
  opts: SuggestOptions = {},
): OwnerSuggestion[] {
  const balanceLoad = opts.balanceLoad ?? true;
  const historyBoost = opts.historyBoost ?? 20;
  const revenue = quoteTotals(quote.items).revenue;
  const segment = (quote.customer_segment ?? "").toLowerCase().trim();
  const keywords = (quote.keywords ?? []).map((k) => k.toLowerCase().trim());
  const customerKey = quote.customer_name.trim().toLowerCase().replace(/\s+/g, " ");

  const suggestions: OwnerSuggestion[] = owners.map((owner) => {
    const specialty = buildOwnerSpecialty(quotes, owner.id);
    const load = buildOwnerLoad(quotes, owner.id);
    const reasons: string[] = [];

    // Especialidade (peso: 0..50)
    let specialtyScore = 0;
    const segStat = specialty.by_segment.get(segment);
    if (segStat && segStat.wins >= 2) {
      specialtyScore += Math.min(30, segStat.wins * 6 + segStat.win_rate * 20);
      reasons.push(
        `${segStat.wins} vitória${segStat.wins > 1 ? "s" : ""} em ${quote.customer_segment}`,
      );
    }
    for (const kw of keywords) {
      const s = specialty.by_keyword.get(kw);
      if (s && s.wins >= 1) {
        specialtyScore += Math.min(10, s.wins * 3 + s.win_rate * 6);
      }
    }
    const strongHit = specialty.strong_keywords.find((k) => keywords.includes(k));
    if (strongHit) {
      specialtyScore += 15; // sinal forte de expertise casada
      reasons.push(`especialidade em "${strongHit}"`);
    }

    // Carga (peso: 0..25 — inverso)
    let loadScore = 25;
    if (balanceLoad) {
      loadScore = Math.max(0, 25 - load.pressure * 3.5);
      if (load.open_count === 0) reasons.push("agenda livre");
      else if (load.pressure >= 8) reasons.push(`carga alta (${load.open_count} abertas)`);
    }

    // Fit de ticket (peso: 0..15)
    let ticketFit = 0;
    if (specialty.avg_ticket_won > 0 && revenue > 0) {
      const ratio = Math.min(revenue, specialty.avg_ticket_won) / Math.max(revenue, specialty.avg_ticket_won);
      ticketFit = ratio * 15;
      if (ratio >= 0.7) reasons.push("ticket compatível com histórico");
    }

    // Histórico com o cliente (peso: 0..historyBoost, default 20)
    let history = 0;
    const wonWithCustomer = quotes.filter(
      (q) =>
        q.owner_id === owner.id &&
        q.status === "ganho" &&
        q.customer_name.trim().toLowerCase().replace(/\s+/g, " ") === customerKey,
    ).length;
    if (wonWithCustomer > 0) {
      history = Math.min(historyBoost, wonWithCustomer * 8 + 8);
      reasons.push(
        `${wonWithCustomer} venda${wonWithCustomer > 1 ? "s" : ""} para ${quote.customer_name}`,
      );
    }

    const score = specialtyScore + loadScore + ticketFit + history;
    return {
      owner,
      score: Math.round(score * 10) / 10,
      reasons: reasons.slice(0, 3),
      breakdown: {
        specialty: Math.round(specialtyScore * 10) / 10,
        load: Math.round(loadScore * 10) / 10,
        ticket_fit: Math.round(ticketFit * 10) / 10,
        history: Math.round(history * 10) / 10,
      },
    };
  });

  return suggestions.sort((a, z) => z.score - a.score);
}

// ---------------- Split de cotação grande ----------------

export interface QuoteSplitSlice {
  owner: Owner;
  items: QuoteItem[];
  revenue: number;
  reason: string;
}

export interface QuoteSplit {
  original_quote_id: string;
  slices: QuoteSplitSlice[];
  reason: string;
}

export interface SplitOptions {
  minItemsToSplit?: number;   // default 6 — abaixo disso, não fatia
  maxSlices?: number;         // default 3
  balanceLoad?: boolean;      // default true
}

/**
 * Fatia uma cotação grande entre múltiplos vendedores, agrupando itens por
 * afinidade (mesmo top-suggested owner). Retorna null se não vale a pena
 * fatiar (poucos itens, ou 1 único owner ganha todos).
 */
export function splitLargeQuote(
  quote: Quote,
  quotes: Quote[],
  owners: Owner[],
  opts: SplitOptions = {},
): QuoteSplit | null {
  const minItems = opts.minItemsToSplit ?? 6;
  const maxSlices = opts.maxSlices ?? 3;
  if (quote.items.length < minItems) return null;

  // Para cada item, avaliamos qual owner é melhor tratando-o como "mini cotação".
  const itemOwnerVotes = quote.items.map((item) => {
    const tokens = item.name
      .toLowerCase()
      .split(/[^a-z0-9à-ÿ]+/i)
      .filter((t) => t.length >= 3);
    const mini: Pick<Quote, "customer_name" | "customer_segment" | "keywords" | "items" | "priority"> = {
      customer_name: quote.customer_name,
      customer_segment: quote.customer_segment,
      keywords: [...tokens, ...(quote.keywords ?? [])],
      items: [item],
      priority: quote.priority,
    };
    const [top] = suggestOwner(mini, quotes, owners, { balanceLoad: opts.balanceLoad });
    return { item, ownerId: top?.owner.id ?? owners[0]?.id };
  });

  // Agrupa itens por owner sugerido
  const grouped = new Map<string, QuoteItem[]>();
  for (const v of itemOwnerVotes) {
    if (!v.ownerId) continue;
    const arr = grouped.get(v.ownerId) ?? [];
    arr.push(v.item);
    grouped.set(v.ownerId, arr);
  }

  // Se só um owner ganhou todos os itens → não vale fatiar
  if (grouped.size < 2) return null;

  const slices: QuoteSplitSlice[] = [...grouped.entries()]
    .map(([ownerId, items]) => {
      const owner = owners.find((o) => o.id === ownerId)!;
      const revenue = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
      const specialty = buildOwnerSpecialty(quotes, ownerId);
      const strongHit = specialty.strong_segments.includes(quote.customer_segment.toLowerCase()) ? "especialidade no segmento" : "melhor afinidade por SKU";
      return {
        owner,
        items,
        revenue,
        reason: `${items.length} item(ns) — ${strongHit}`,
      };
    })
    .sort((a, z) => z.revenue - a.revenue)
    .slice(0, maxSlices);

  return {
    original_quote_id: quote.id,
    slices,
    reason: `${quote.items.length} itens · ${slices.length} vendedores especializados`,
  };
}

// ---------------- Utilitário de bulk assignment ----------------

export interface BulkAssignmentPlan {
  quote_id: string;
  from_owner: string;
  to_owner: string;
  score: number;
  reasons: string[];
}

/**
 * Para cada cotação aberta que ainda esteja em `pending_review` ou
 * `aguardando_precificacao`, decide se há um vendedor CLARAMENTE melhor
 * (score >= 15 pontos acima do atual). Retorna só os planos com ganho.
 */
export function planAutoAssignments(
  quotes: Quote[],
  owners: Owner[],
  minAdvantage = 15,
): BulkAssignmentPlan[] {
  const plans: BulkAssignmentPlan[] = [];
  const eligible = quotes.filter(
    (q) => q.status === "pending_review" || q.status === "aguardando_precificacao",
  );
  for (const q of eligible) {
    const suggestions = suggestOwner(q, quotes, owners);
    const top = suggestions[0];
    const current = suggestions.find((s) => s.owner.id === q.owner_id);
    if (!top || !current) continue;
    if (top.owner.id === q.owner_id) continue;
    if (top.score - current.score < minAdvantage) continue;
    plans.push({
      quote_id: q.id,
      from_owner: q.owner_id,
      to_owner: top.owner.id,
      score: top.score,
      reasons: top.reasons,
    });
  }
  return plans;
}
