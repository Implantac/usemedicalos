import type { Quote } from "./types";

// Mock de integração com Use Sistemas (módulo comercial).
// Simula latência, falha transitória e retry/backoff exponencial.

export interface UseSistemasResponse {
  ok: boolean;
  order_id: string;
  message: string;
  attempts: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

// Chance de falha transitória por tentativa (10%). Determinística nos testes se
// callers passarem seu próprio `random`.
function shouldFail(random: () => number): boolean {
  return random() < 0.1;
}

async function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function sendToUseSistemas(
  quote: Quote,
  opts: { maxAttempts?: number; random?: () => number } = {},
): Promise<UseSistemasResponse> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const random = opts.random ?? Math.random;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await delay(300 + Math.floor(random() * 300));
    if (shouldFail(random) && attempt < maxAttempts) {
      lastError = new Error(`Falha transitória (tentativa ${attempt}).`);
      await delay(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      continue;
    }
    const order_id = `US-${Date.now().toString().slice(-6)}-${quote.id.slice(-4).toUpperCase()}`;
    return {
      ok: true,
      order_id,
      message: `Pedido ${order_id} criado no Use Sistemas para ${quote.customer_name}${attempt > 1 ? ` (após ${attempt} tentativas)` : ""}.`,
      attempts: attempt,
    };
  }

  throw lastError ?? new Error("Falha ao integrar com Use Sistemas.");
}

export async function fetchUseSistemasCustomer(name: string) {
  await delay(200);
  return {
    code: `CLI-${Math.floor(Math.random() * 9000 + 1000)}`,
    name,
    credit_limit: 250_000,
    payment_terms: "28 DDL",
  };
}
