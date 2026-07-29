// Copiloto de Resposta Assistida — Camada 6 da USE Medical.
//
// A partir de uma Quote, gera drafts prontos para envio (WhatsApp, e-mail,
// resumo executivo) já com preços recalculados pelo motor, disclaimers de
// compliance (CMED, ANVISA) e talking points baseados no perfil do cliente
// (tier, win-rate histórico, ticket médio). 100% determinístico, roda no
// client. Migra 1:1 para uma edge function quando Cloud estiver ativo.
//
// Filtros de propósito (visão USE Medical):
//  ✅ Reduz tempo de resposta (rascunho pronto em 1 clique)
//  ✅ Aumenta win-rate (personaliza tom por tier e histórico)
//  ✅ Reduz retrabalho (cita disclaimers e SKUs corretos)

import type { ClientProfile } from "./client-intel";
import { buildClientProfiles } from "./client-intel";
import { checkQuote } from "./compliance";
import { calculateSuggestedPrice } from "./pricing-engine";
import { itemMargin, quoteTotals } from "./pricing";
import type { Product, Quote, QuoteItem } from "./types";

export type CopilotChannel = "whatsapp" | "email" | "resumo";

export interface CopilotTalkingPoint {
  kind: "opportunity" | "risk" | "context";
  message: string;
}

export interface CopilotDraft {
  quote_id: string;
  channel: CopilotChannel;
  subject?: string;              // usado no e-mail
  body: string;                  // texto pronto para envio
  confidence: number;            // 0..1 — chance estimada de conversão
  talking_points: CopilotTalkingPoint[];
  disclaimers: string[];
  total: number;
  margin: number;                // margem consolidada
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function normalizedName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Repriça itens usando o motor de precificação e devolve itens finais + margem.
 * Não muta a quote original.
 */
export function repriceForResponse(
  quote: Quote,
  products: Product[],
  opts: { minMargin?: number; targetMargin?: number } = {},
): { items: QuoteItem[]; total: number; margin: number } {
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const items = quote.items.map((it) => {
    const p = bySku.get(it.sku);
    if (!p) return it;
    const br = calculateSuggestedPrice(p, {
      tier: quote.client_tier,
      quantity: it.quantity,
      minMargin: opts.minMargin,
      targetMargin: opts.targetMargin,
    });
    return { ...it, unit_price: br.suggested_price, cost_price: p.cost_price };
  });
  const totals = quoteTotals(items);
  return { items, total: totals.total, margin: totals.margin };
}

/**
 * Calcula um score de confiança 0..1 combinando:
 *  - win-rate histórico do cliente
 *  - margem final (quanto mais folga, mais posso barganhar)
 *  - situação de compliance (bloqueia se houver risk)
 */
export function computeConfidence(params: {
  profile?: ClientProfile;
  margin: number;
  complianceOk: boolean;
}): number {
  if (!params.complianceOk) return 0.15;
  const winRate = params.profile?.win_rate ?? 0.35; // baseline conservador
  const sample = params.profile?.total_quotes ?? 0;
  const historyWeight = sample >= 3 ? 0.55 : sample >= 1 ? 0.35 : 0.2;
  const marginBoost = Math.min(0.3, Math.max(0, params.margin - 0.12) * 1.5);
  const base = 0.4 + historyWeight * winRate + marginBoost;
  return Math.max(0.05, Math.min(0.95, base));
}

/**
 * Gera talking points curtos para o vendedor levar para a conversa.
 */
export function buildTalkingPoints(params: {
  quote: Quote;
  profile?: ClientProfile;
  margin: number;
  complianceRisks: string[];
}): CopilotTalkingPoint[] {
  const out: CopilotTalkingPoint[] = [];
  const p = params.profile;
  if (p && p.total_quotes >= 2) {
    out.push({
      kind: "context",
      message: `Histórico: ${p.wins}/${p.total_quotes} ganhos (${pct(p.win_rate)}), ticket médio ${brl(p.avg_ticket)}.`,
    });
  } else {
    out.push({
      kind: "context",
      message: "Cliente novo na base — tratar como Tier C até confirmar volume.",
    });
  }

  if (params.quote.client_tier === "A") {
    out.push({ kind: "opportunity", message: "Tier A: pode oferecer condição especial (frete ou pgto 30d)." });
  }
  if (params.margin >= 0.25) {
    out.push({ kind: "opportunity", message: `Margem folgada (${pct(params.margin)}) — há espaço para desconto se pedirem.` });
  } else if (params.margin < 0.15) {
    out.push({ kind: "risk", message: `Margem apertada (${pct(params.margin)}) — não descontar sem aprovação.` });
  }
  for (const r of params.complianceRisks) {
    out.push({ kind: "risk", message: r });
  }
  if (params.quote.priority === "urgente") {
    out.push({ kind: "opportunity", message: "SLA urgente — enfatizar disponibilidade imediata para fechar rápido." });
  }
  return out.slice(0, 6);
}

function complianceDisclaimers(quote: Quote): { risks: string[]; disclaimers: string[] } {
  const report = checkQuote(quote);
  const risks: string[] = [];
  const disclaimers: string[] = [];
  for (const check of report.checks) {
    if (check.status === "warning") {
      risks.push(`${check.sku}: ${check.message}`);
    } else if (check.status === "blocked") {
      risks.push(`⚠ ${check.sku}: BLOQUEIO — ${check.message}`);
      disclaimers.push(`${check.sku}: sujeito a revisão de compliance antes do envio.`);
    }
  }
  return { risks, disclaimers };
}

// ---------- Geradores por canal ----------

export function buildWhatsAppDraft(
  quote: Quote,
  items: QuoteItem[],
  ctx: { profile?: ClientProfile; margin: number; total: number; risks: string[]; disclaimers: string[] },
): CopilotDraft {
  const firstName = normalizedName(quote.customer_name);
  const lines: string[] = [];
  lines.push(`Olá, ${firstName}! Aqui é da USE Medical.`);
  lines.push(`Segue nossa proposta para a cotação recebida:`);
  lines.push("");
  for (const it of items) {
    lines.push(`• ${it.name} (${it.sku}) — ${it.quantity} un × ${brl(it.unit_price)}`);
  }
  lines.push("");
  lines.push(`Total: *${brl(ctx.total)}*`);
  if (quote.client_tier === "A") lines.push("Condição especial Tier A já aplicada.");
  lines.push("");
  if (ctx.disclaimers.length) lines.push("Obs: " + ctx.disclaimers.join(" "));
  lines.push("Fico à disposição para fechar hoje. 🙌");
  return {
    quote_id: quote.id,
    channel: "whatsapp",
    body: lines.join("\n"),
    confidence: computeConfidence({ profile: ctx.profile, margin: ctx.margin, complianceOk: ctx.risks.filter((r) => r.startsWith("⚠")).length === 0 }),
    talking_points: buildTalkingPoints({ quote, profile: ctx.profile, margin: ctx.margin, complianceRisks: ctx.risks }),
    disclaimers: ctx.disclaimers,
    total: ctx.total,
    margin: ctx.margin,
  };
}

export function buildEmailDraft(
  quote: Quote,
  items: QuoteItem[],
  ctx: { profile?: ClientProfile; margin: number; total: number; risks: string[]; disclaimers: string[] },
): CopilotDraft {
  const firstName = normalizedName(quote.customer_name);
  const subject = `Proposta USE Medical — ${quote.customer_name} — ${brl(ctx.total)}`;
  const rows = items
    .map((it) => `  · ${it.name} (${it.sku}) — ${it.quantity} un × ${brl(it.unit_price)} = ${brl(it.unit_price * it.quantity)}`)
    .join("\n");
  const body = [
    `Prezado(a) ${firstName},`,
    "",
    `Agradecemos o contato. Segue nossa proposta comercial:`,
    "",
    rows,
    "",
    `Total geral: ${brl(ctx.total)}`,
    quote.client_tier === "A" ? `Condição Tier A aplicada.` : "",
    "",
    ctx.disclaimers.length ? `Observações de compliance:\n${ctx.disclaimers.map((d) => `  - ${d}`).join("\n")}` : "",
    `Validade: 72h. Prazo de entrega negociado após confirmação.`,
    "",
    "Atenciosamente,",
    "Equipe Comercial — USE Medical",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    quote_id: quote.id,
    channel: "email",
    subject,
    body,
    confidence: computeConfidence({ profile: ctx.profile, margin: ctx.margin, complianceOk: ctx.risks.filter((r) => r.startsWith("⚠")).length === 0 }),
    talking_points: buildTalkingPoints({ quote, profile: ctx.profile, margin: ctx.margin, complianceRisks: ctx.risks }),
    disclaimers: ctx.disclaimers,
    total: ctx.total,
    margin: ctx.margin,
  };
}

export function buildExecutiveSummary(
  quote: Quote,
  items: QuoteItem[],
  ctx: { profile?: ClientProfile; margin: number; total: number; risks: string[]; disclaimers: string[] },
): CopilotDraft {
  const lines = [
    `Cliente: ${quote.customer_name} (${quote.customer_segment}) — Tier ${quote.client_tier ?? "?"}.`,
    `Itens: ${items.length}. Total: ${brl(ctx.total)}. Margem consolidada: ${pct(ctx.margin)}.`,
    ctx.profile
      ? `Histórico: ${ctx.profile.wins}/${ctx.profile.total_quotes} ganhos (${pct(ctx.profile.win_rate)}).`
      : `Sem histórico prévio na base.`,
    ctx.risks.length ? `Riscos: ${ctx.risks.join(" | ")}` : `Sem riscos de compliance.`,
    `Recomendação: ${ctx.margin >= 0.2 ? "avançar para envio" : ctx.margin >= 0.12 ? "enviar como está, sem descontos" : "escalar para gestor antes de enviar"}.`,
  ];
  return {
    quote_id: quote.id,
    channel: "resumo",
    body: lines.join("\n"),
    confidence: computeConfidence({ profile: ctx.profile, margin: ctx.margin, complianceOk: ctx.risks.filter((r) => r.startsWith("⚠")).length === 0 }),
    talking_points: buildTalkingPoints({ quote, profile: ctx.profile, margin: ctx.margin, complianceRisks: ctx.risks }),
    disclaimers: ctx.disclaimers,
    total: ctx.total,
    margin: ctx.margin,
  };
}

export interface CopilotBundle {
  quote: Quote;
  profile?: ClientProfile;
  whatsapp: CopilotDraft;
  email: CopilotDraft;
  resumo: CopilotDraft;
  total: number;
  margin: number;
}

/**
 * Ponto de entrada único: dado (quote, products, history), devolve os três
 * drafts prontos e todo o contexto para renderização.
 */
export function generateCopilot(
  quote: Quote,
  products: Product[],
  history: Quote[],
  opts: { minMargin?: number; targetMargin?: number } = {},
): CopilotBundle {
  const repriced = repriceForResponse(quote, products, opts);
  const profiles = buildClientProfiles(history);
  const key = quote.customer_name.trim().toLowerCase().replace(/\s+/g, " ");
  const profile = profiles.get(key);
  const { risks, disclaimers } = complianceDisclaimers({ ...quote, items: repriced.items });
  const ctx = { profile, margin: repriced.margin, total: repriced.total, risks, disclaimers };
  return {
    quote: { ...quote, items: repriced.items },
    profile,
    whatsapp: buildWhatsAppDraft(quote, repriced.items, ctx),
    email: buildEmailDraft(quote, repriced.items, ctx),
    resumo: buildExecutiveSummary(quote, repriced.items, ctx),
    total: repriced.total,
    margin: repriced.margin,
  };
}

// Utilitário para calcular margem por item (usado por UI de destaque).
export function itemMarginList(items: QuoteItem[]): number[] {
  return items.map((it) => itemMargin(it));
}
