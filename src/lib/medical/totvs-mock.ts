import type { Quote } from "./types";

// Mock de integração com TOTVS Protheus (SD/OM módulo comercial).
// Simula latência e retorna número de pedido fictício.

export interface TotvsResponse {
  ok: boolean;
  order_id: string;
  synced_at: string;
  message: string;
}

export async function sendToTotvs(quote: Quote): Promise<TotvsResponse> {
  await new Promise((r) => setTimeout(r, 900));
  const order_id = `PRT-${Date.now().toString().slice(-8)}`;
  return {
    ok: true,
    order_id,
    synced_at: new Date().toISOString(),
    message: `Pedido ${order_id} criado no TOTVS Protheus para ${quote.customer_name}.`,
  };
}

export async function fetchTotvsCustomer(name: string) {
  await new Promise((r) => setTimeout(r, 400));
  return {
    code: `CLI-${Math.floor(Math.random() * 9000 + 1000)}`,
    name,
    credit_limit: 250_000,
    credit_used: Math.floor(Math.random() * 180_000),
    status: "ativo" as const,
  };
}
