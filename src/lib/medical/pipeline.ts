import type { QuoteStatus } from "./types";

export const PIPELINE: QuoteStatus[] = [
  "aguardando_precificacao",
  "em_negociacao",
  "enviado",
  "ganho",
];

export function nextStatus(current: QuoteStatus): QuoteStatus | null {
  if (current === "perdido" || current === "ganho") return null;
  const idx = PIPELINE.indexOf(current);
  if (idx < 0 || idx >= PIPELINE.length - 1) return null;
  return PIPELINE[idx + 1];
}

export function prevStatus(current: QuoteStatus): QuoteStatus | null {
  if (current === "perdido") return "aguardando_precificacao";
  const idx = PIPELINE.indexOf(current);
  if (idx <= 0) return null;
  return PIPELINE[idx - 1];
}

export type SlaBucket = "todos" | "atrasado" | "risco" | "no_prazo";

export function slaBucketOf(deadlineIso: string): Exclude<SlaBucket, "todos"> {
  const h = (new Date(deadlineIso).getTime() - Date.now()) / 3_600_000;
  if (h < 0) return "atrasado";
  if (h < 4) return "risco";
  return "no_prazo";
}

export const SLA_LABEL: Record<SlaBucket, string> = {
  todos: "SLA: todos",
  atrasado: "Atrasado",
  risco: "Em risco (<4h)",
  no_prazo: "No prazo",
};
