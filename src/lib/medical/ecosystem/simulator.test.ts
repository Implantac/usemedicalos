import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildExternalQuotePayload,
  buildLocalQuoteFromSimulation,
  sendSimulatedQuote,
  type EcosystemQuoteResponse,
} from "./simulator";
import { getPartner, signForPartner, verifyPartnerSignature } from "./partners";

beforeEach(() => {
  // Garante env limpo para testar o fallback de dev no load do módulo.
  delete process.env.BIONEXO_HMAC_SECRET;
});

afterEach(() => {
  delete process.env.BIONEXO_HMAC_SECRET;
});

describe("ecosystem/simulator", () => {
  it("gera payload válido para cada parceiro", () => {
    for (const pid of ["bionexo", "apoio", "marketplace_demo"] as const) {
      const payload = buildExternalQuotePayload(pid);
      expect(payload.partner_id).toBe(pid);
      expect(payload.external_id).toBeTruthy();
      expect(payload.customer).toHaveProperty("name");
      expect(Array.isArray(payload.items)).toBe(true);
      expect((payload.items as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it("permite sobrescrever cliente, skus e quantidades", () => {
    const payload = buildExternalQuotePayload("bionexo", {
      external_id: "RFQ-ABC-1",
      customer_name: "Hospital Teste",
      skus: ["SER-20ML"],
      quantities: [7],
    }) as {
      external_id: string;
      customer: { name: string };
      items: Array<{ sku: string; quantity: number }>;
    };

    expect(payload.external_id).toBe("RFQ-ABC-1");
    expect(payload.customer.name).toBe("Hospital Teste");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].sku).toBe("SER-20ML");
    expect(payload.items[0].quantity).toBe(7);
  });

  it("payload gerado é assinável e verificável pelo parceiro", () => {
    const payload = buildExternalQuotePayload("bionexo");
    const body = JSON.stringify(payload);
    const sig = signForPartner("bionexo", body);
    expect(sig).toBeTruthy();
    const partner = getPartner("bionexo")!;
    expect(verifyPartnerSignature(partner, body, sig)).toBe(true);
  });

  it("sendSimulatedQuote retorna ok com os campos de resposta", async () => {
    const mockFetch = (async (_url: string, init?: RequestInit) => {
      const rawBody = init?.body as string;
      const signature = (init?.headers as Record<string, string> | undefined)?.[
        "x-partner-signature"
      ];
      const partner = getPartner("marketplace_demo")!;
      const ok = verifyPartnerSignature(partner, rawBody, signature);
      return new Response(
        JSON.stringify({
          ok,
          quote_id: ok ? "qSIM123" : undefined,
          external_id: ok ? "RFQ-SIM" : undefined,
          status: ok ? "pending_review" : undefined,
          origin_partner_id: ok ? "marketplace_demo" : undefined,
          error: ok ? undefined : "Assinatura HMAC inválida",
        } as EcosystemQuoteResponse),
        {
          status: ok ? 201 : 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    const res = await sendSimulatedQuote("marketplace_demo", { fetchImpl: mockFetch });
    expect(res.ok).toBe(true);
    expect(res.quote_id).toBe("qSIM123");
    expect(res.origin_partner_id).toBe("marketplace_demo");
  });

  it("sendSimulatedQuote propaga erro quando HMAC falha", async () => {
    const mockFetch = (async () =>
      new Response(JSON.stringify({ ok: false, error: "Assinatura HMAC inválida" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    const res = await sendSimulatedQuote("apoio", { fetchImpl: mockFetch });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("marca metadata como simulado com o parceiro", () => {
    const payload = buildExternalQuotePayload("bionexo") as {
      metadata: { simulated: boolean; partner: string };
    };
    expect(payload.metadata.simulated).toBe(true);
    expect(payload.metadata.partner).toBe("bionexo");
  });

  it("buildLocalQuoteFromSimulation gera Quote com origin_partner_id", () => {
    const q = buildLocalQuoteFromSimulation("bionexo");
    expect(q).not.toBeNull();
    expect(q!.origin_partner_id).toBe("bionexo");
    expect(q!.source_type).toBe("portal");
    expect(q!.customer_name).toBe("Hospital Santa Clara");
    expect(q!.items.length).toBeGreaterThan(0);
  });

  it("buildLocalQuoteFromSimulation permite overrides", () => {
    const q = buildLocalQuoteFromSimulation("marketplace_demo", {
      customer_name: "Hospital da Simulação",
      skus: ["LUV-CIR-M"],
    });
    expect(q).not.toBeNull();
    expect(q!.origin_partner_id).toBe("marketplace_demo");
    expect(q!.customer_name).toBe("Hospital da Simulação");
    expect(q!.items).toHaveLength(1);
  });
});
