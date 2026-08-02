import { describe, expect, it } from "vitest";
import { bionexoToIngestPayload, bionexoToQuote } from "./bionexo";

const SAMPLE_BIONEXO = {
  id: "BX-2026-0042",
  hospital: { nome: "Hospital Santa Clara", segmento: "Hospital privado" },
  itens: [
    { codigo: "SUT-3-0-CT", descricao: "Fio de Sutura 3-0", quantidade: 40, preco_alvo: 27.9 },
    { codigo: "GZE-EST-10", descricao: "Gaze Estéril", quantidade: 500, preco_alvo: 1.85 },
  ],
};

describe("ecosystem/bionexo", () => {
  it("converte payload válido em IngestPayload", () => {
    const r = bionexoToIngestPayload(SAMPLE_BIONEXO);
    expect(r.ok).toBe(true);
    expect(r.payload).toBeDefined();
    expect(r.payload!.source_platform).toBe("bionexo");
    expect(r.payload!.portal_reference).toBe("BX-2026-0042");
    expect(r.payload!.customer_name).toBe("Hospital Santa Clara");
    expect(r.payload!.items).toHaveLength(2);
    expect(r.payload!.items[0].sku).toBe("SUT-3-0-CT");
    expect(r.payload!.items[0].quantity).toBe(40);
    expect(r.payload!.items[0].target_price).toBe(27.9);
  });

  it("rejeita payload sem id/hospital/itens", () => {
    expect(bionexoToIngestPayload({}).ok).toBe(false);
    expect(bionexoToIngestPayload({ id: "x", itens: [] }).ok).toBe(false);
    expect(bionexoToIngestPayload({ id: "x", hospital: { nome: "H" }, itens: [] }).ok).toBe(false);
  });

  it("rejeita item com SKU vazio ou quantidade inválida", () => {
    const r = bionexoToIngestPayload({
      id: "x",
      hospital: { nome: "H" },
      itens: [{ codigo: "", descricao: "Sem sku", quantidade: 1 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("SKU vazio");
  });

  it("bionexoToQuote gera Quote com origin_partner_id", () => {
    const r = bionexoToQuote(SAMPLE_BIONEXO, {
      tenantId: "tnt_use_medical",
      ownerId: "u_ana",
      partnerId: "bionexo",
    });
    expect(r.ok).toBe(true);
    expect(r.quote).toBeDefined();
    expect(r.quote!.origin_partner_id).toBe("bionexo");
    expect(r.quote!.source_type).toBe("portal");
    expect(r.quote!.customer_name).toBe("Hospital Santa Clara");
    expect(r.quote!.items).toHaveLength(2);
  });
});

