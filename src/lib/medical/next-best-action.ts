// Next Best Action — fila única de trabalho, transversal a todas as telas.
// Responde: "o que eu faço AGORA para ganhar mais dinheiro no menor tempo?"
// Determinístico: mesma entrada => mesma ordem (testável, auditável).

import type { Quote } from "./types";
import { quoteTotals } from "./pricing";
import { slaState } from "@/components/medical/sla-indicator";
import { estimateWinChance } from "./command-center";
import { buildClientProfiles } from "./client-intel";

export type NbaKind = "precificar" | "responder" | "negociar" | "resgatar" | "revisar_margem";

export interface NextBestAction {
  quote: Quote;
  kind: NbaKind;
  label: string;
  reason: string;
  impact: number; // R$ de lucro esperado em jogo
  urgency: "critica" | "alta" | "normal";
  score: number;
  to: string; // rota destino
}

const KIND_LABEL: Record<NbaKind, string> = {
  precificar: "Precificar agora",
  responder: "Enviar resposta",
  negociar: "Avançar negociação",
  resgatar: "Resgatar cotação",
  revisar_margem: "Revisar margem",
};

const KIND_WEIGHT: Record<NbaKind, number> = {
  precificar: 1.25,
  responder: 1.15,
  negociar: 1.0,
  resgatar: 0.9,
  revisar_margem: 1.3,
};

function classifyAction(quote: Quote, margin: number, slaTone: string): NbaKind | null {
  if (margin < 0.08 && quote.status !== "ganho" && quote.status !== "perdido") return "revisar_margem";
  switch (quote.status) {
    case "pending_review":
    case "aguardando_precificacao":
      return "precificar";
    case "enviado":
      return slaTone === "danger" ? "resgatar" : "responder";
    case "em_negociacao":
      return "negociar";
    default:
      return null;
  }
}

export function computeNextBestActions(quotes: Quote[], limit = 5): NextBestAction[] {
  const profiles = buildClientProfiles(quotes);
  const out: NextBestAction[] = [];

  for (const quote of quotes) {
    const totals = quoteTotals(quote.items);
    const sla = slaState(quote.sla_deadline);
    const kind = classifyAction(quote, totals.margin, sla.tone);
    if (!kind) continue;

    const winChance = estimateWinChance(quote, profiles);
    const impact = totals.revenue * Math.max(totals.margin, 0.02) * winChance;
    const urgencyMult = sla.tone === "danger" ? 1.5 : sla.tone === "warning" ? 1.2 : 1;
    const score = impact * urgencyMult * KIND_WEIGHT[kind];

    const bits: string[] = [];
    if (sla.tone === "danger") bits.push("SLA estourando");
    else if (sla.tone === "warning") bits.push("SLA em risco");
    if (kind === "revisar_margem") bits.push(`margem ${Math.round(totals.margin * 100)}%`);
    else if (winChance >= 0.65) bits.push(`${Math.round(winChance * 100)}% de chance`);
    const p = profiles.get(quote.customer_name.trim().toLowerCase().replace(/\s+/g, " "));
    if (p && p.wins >= 2) bits.push(`${p.wins} vitórias com o cliente`);

    out.push({
      quote,
      kind,
      label: KIND_LABEL[kind],
      reason: bits.slice(0, 3).join(" · ") || "oportunidade aberta",
      impact,
      urgency: sla.tone === "danger" ? "critica" : sla.tone === "warning" ? "alta" : "normal",
      score,
      to: kind === "precificar" || kind === "revisar_margem" ? "/inbox" : "/copiloto",
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function totalAtStake(actions: NextBestAction[]): number {
  return actions.reduce((s, a) => s + a.impact, 0);
}
