import type { Priority } from "./types";

const URGENT_KEYWORDS = ["urgente", "urgência", "asap", "emergência", "hoje", "imediato"];
const HIGH_KEYWORDS = ["cirurgia", "uti", "alta complexidade", "prioridade", "amanhã"];
const COMPLEX_KEYWORDS = ["licitação", "pregão", "edital", "consignado", "importado"];

export interface Classification {
  priority: Priority;
  keywords: string[];
}

export function classify(payload: string): Classification {
  const text = payload.toLowerCase();
  const matched = new Set<string>();

  let priority: Priority = "normal";

  for (const kw of URGENT_KEYWORDS) if (text.includes(kw)) { matched.add(kw); priority = "urgente"; }
  if (priority !== "urgente") {
    for (const kw of HIGH_KEYWORDS) if (text.includes(kw)) { matched.add(kw); priority = "alta"; }
  } else {
    for (const kw of HIGH_KEYWORDS) if (text.includes(kw)) matched.add(kw);
  }
  for (const kw of COMPLEX_KEYWORDS) if (text.includes(kw)) matched.add(kw);

  return { priority, keywords: Array.from(matched) };
}

// SLA por prioridade (em horas)
export function slaHoursFor(priority: Priority): number {
  switch (priority) {
    case "urgente": return 2;
    case "alta": return 8;
    case "normal": return 24;
    case "baixa": return 72;
  }
}
