/**
 * Achievements — Gamificação do Painel do Vendedor (USE Medical)
 *
 * Avalia as cotações de um vendedor e devolve badges de conquista
 * baseadas em comportamento real (velocidade, precisão, consistência,
 * volume e foco em SLA). Sem dados de duração separados, usamos o
 * recorte de SLA como proxy para "tempo de resposta".
 */

import type { Quote } from "./types";
import { quoteTotals } from "./pricing";
import { slaState } from "@/components/medical/sla-indicator";

export type AchievementId =
  "speed" | "precision" | "consistency" | "rocket" | "focus" | "resilience";

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  unlocked: boolean;
  /** 0..1 — quanto falta para desbloquear (para UX de progresso). */
  progress: number;
}

const GOAL = 1500; // meta diária de comissão (referência)

/**
 * Calcula a lista de conquistas para um vendedor a partir das cotações.
 */
export function computeAchievements(ownerId: string, quotes: Quote[]): Achievement[] {
  const mine = quotes.filter((q) => q.owner_id === ownerId);

  const won = mine.filter((q) => q.status === "ganho");
  const closed = mine.filter((q) => q.status === "ganho" || q.status === "perdido");

  // --- Precisão: margem média dos itens > 20% ---
  const margins = mine.map((q) => quoteTotals(q.items).margin).filter((m) => m > 0);
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const precision = avgMargin >= 0.2;

  // --- Velocidade: respondeu antes do SLA (proxy) em cotações não fechadas ---
  const open = mine.filter(
    (q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao",
  );
  const onTime = open.filter((q) => slaState(q.sla_deadline).tone === "ok").length;
  const speed = open.length > 0 && onTime / open.length >= 0.8;

  // --- Consistência: 5 dias seguidos batendo a meta diária de comissão ---
  const consistency = consecutiveGoalStreak(mine, GOAL) >= 5;

  // --- Rocket: 5+ cotações ganhas no mês atual ---
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const wonThisMonth = won.filter((q) => new Date(q.received_at).getTime() >= monthStart).length;
  const rocket = wonThisMonth >= 5;

  // --- Foco: 100% de SLA em cotações abertas ---
  const focus = open.length > 0 && open.every((q) => slaState(q.sla_deadline).tone === "ok");

  // --- Resiliência: tem histórico de perdas mas segue com pipeline ativo ---
  const lost = closed.filter((q) => q.status === "perdido").length;
  const resilience =
    lost >= 2 && mine.some((q) => q.status === "em_negociacao" || q.status === "enviado");

  return [
    {
      id: "speed",
      name: "Velocidade",
      description: "Respondeu 80%+ das cotações dentro do prazo de SLA.",
      unlocked: speed,
      progress: open.length ? onTime / open.length : 0,
    },
    {
      id: "precision",
      name: "Precisão",
      description: "Margem média dos itens acima de 20%.",
      unlocked: precision,
      progress: Math.min(1, avgMargin / 0.2),
    },
    {
      id: "consistency",
      name: "Consistência",
      description: "Bateu a meta diária 5 dias seguidos.",
      unlocked: consistency,
      progress: Math.min(1, consecutiveGoalStreak(mine, GOAL) / 5),
    },
    {
      id: "rocket",
      name: "Foguete",
      description: "5+ cotações ganhas no mês atual.",
      unlocked: rocket,
      progress: Math.min(1, wonThisMonth / 5),
    },
    {
      id: "focus",
      name: "Foco em SLA",
      description: "100% das cotações abertas dentro do prazo.",
      unlocked: focus,
      progress: open.length ? onTime / open.length : 0,
    },
    {
      id: "resilience",
      name: "Resiliência",
      description: "Segue com pipeline ativo mesmo após perdas.",
      unlocked: resilience,
      progress: resilience ? 1 : 0,
    },
  ];
}

/** Conta quantos dias consecutivos (até hoje) o vendedor bateu a meta diária. */
export function consecutiveGoalStreak(quotes: Quote[], goal: number): number {
  const byDay = new Map<string, number>();
  for (const q of quotes) {
    const c = quoteTotals(q.items).revenue;
    const day = new Date(q.received_at).toDateString();
    byDay.set(day, (byDay.get(day) ?? 0) + c);
  }
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Percorre de hoje para trás enquanto a meta for batida.
  for (let i = 0; i < 365; i++) {
    const day = cursor.toDateString();
    const total = byDay.get(day) ?? 0;
    if (total >= goal) {
      streak++;
    } else if (i > 0) {
      // Para no primeiro dia (anterior a hoje) que não bateu a meta.
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
