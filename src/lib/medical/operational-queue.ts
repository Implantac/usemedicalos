/**
 * Operational Queue — USE Medical
 *
 * Modo "produção comercial": o vendedor não navega por menus, ele diz "próxima".
 * A fila prioriza cotações abertas por urgência de SLA e valor potencial.
 */

import type { Quote } from "./types";
import { itemTotal } from "./pricing";

const OPEN_STATUS = new Set(["pending_review", "aguardando_precificacao", "em_negociacao"]);

export function isOperationallyOpen(q: Quote): boolean {
  return OPEN_STATUS.has(q.status);
}

export function quotePotential(q: Quote): number {
  return q.items.reduce((s, it) => s + itemTotal(it), 0);
}

/** Score determinístico: urgência de SLA dominante, valor como desempate. */
export function operationalScore(q: Quote, now = Date.now()): number {
  const minutesLeft = (new Date(q.sla_deadline).getTime() - now) / 60000;
  const urgency = 1 / Math.max(5, minutesLeft > 0 ? minutesLeft : 1);
  const pinned = q.pinned ? 1 : 0;
  return pinned * 1000 + urgency * 100 + quotePotential(q) / 1_000_000;
}

/** Fila ordenada de cotações operacionais abertas. */
export function operationalQueue(quotes: Quote[], now = Date.now()): Quote[] {
  return quotes
    .filter(isOperationallyOpen)
    .slice()
    .sort((a, b) => operationalScore(b, now) - operationalScore(a, now));
}

/** Próxima cotação da fila, ignorando a que está aberta agora. */
export function nextOperationalQuote(
  quotes: Quote[],
  currentId?: string,
  now = Date.now(),
): Quote | null {
  const queue = operationalQueue(quotes, now).filter((q) => q.id !== currentId);
  return queue[0] ?? null;
}
