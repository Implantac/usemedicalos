import { describe, expect, it } from "vitest";
import {
  applyReturnToQuote,
  csvEscape,
  detectTemplate,
  exportQuotesToCsv,
  generateCsv,
  parseCsv,
  parseCsvReturn,
  parseCsvToQuoteDraft,
} from "./csv-bridge";
import type { Quote } from "./types";

function q(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    tenant_id: "t1",
    owner_id: "u1",
    source_type: "edi",
    status: "em_negociacao",
    priority: "normal",
    customer_name: "Hospital X",
    customer_segment: "Hospital",
    received_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 86_400_000).toISOString(),
    original_payload: "",
    keywords: [],
    items: [
      { product_id: "S1", sku: "S1", name: "Seringa", quantity: 10, unit_price: 100, cost_price: 60 },
      { product_id: "S2", sku: "S2", name: "Luvas", quantity: 5, unit_price: 50, cost_price: 30 },
    ],
    ...overrides,
  };
}

describe("csv-bridge", () => {
  it("csvEscape handles quotes, commas and newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape('com "aspas"')).toBe('"com ""aspas"""');
    expect(csvEscape("com, vírgula")).toBe('"com, vírgula"');
    expect(csvEscape("com\nquebra")).toBe('"com\nquebra"');
    expect(csvEscape(null)).toBe("");
  });

  it("parseCsv parses simple rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(["a", "b", "c"]);
    expect(rows[1]).toEqual(["1", "2", "3"]);
  });

  it("parseCsv handles quoted fields with commas and newlines", () => {
    const rows = parseCsv('a,"b,c",d\n1,"linha\nquebra",2');
    expect(rows[0]).toEqual(["a", "b,c", "d"]);
    expect(rows[1]).toEqual(["1", "linha\nquebra", "2"]);
  });

  it("detectTemplate identifies Protheus headers", () => {
    const id = detectTemplate(["Cliente", "Descrição", "Qtd", "Preço", "Custo"]);
    expect(id).toBe("protheus");
  });

  it("detectTemplate falls back to generic for unknown headers", () => {
    const id = detectTemplate(["foo", "bar", "baz"]);
    expect(id).toBe("generic");
  });

  it("generateCsv produces BOM + header + rows", () => {
    const csv = generateCsv(
      [{ cliente: "Hospital A", sku: "S1", preco: 100 }],
      [
        { key: "cliente", label: "Cliente" },
        { key: "sku", label: "SKU" },
        { key: "preco", label: "Preço" },
      ],
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Cliente,SKU,Preço");
    expect(csv).toContain("Hospital A,S1,100");
  });

  it("exportQuotesToCsv flattens items with margin and status", () => {
    const csv = exportQuotesToCsv([q()], "protheus");
    expect(csv).toContain("Cliente,Segmento,SKU");
    expect(csv).toContain("Hospital X,Hospital,S1,Seringa,10,100,60,40.0%,em_negociacao");
    expect(csv).toContain("S2,Luvas,5,50,30,40.0%,em_negociacao");
  });

  it("parseCsvToQuoteDraft imports Protheus-style CSV", () => {
    const csv = [
      "Cliente,Segmento,SKU,Descrição,Quantidade,Preço,Custo",
      "Hospital Alfa,Hospital,A1,Agulha,100,5.5,3.0",
      "Hospital Alfa,Hospital,A2,Gaze,200,2.0,1.2",
    ].join("\n");
    const res = parseCsvToQuoteDraft(csv);
    expect(res.ok).toBe(true);
    expect(res.templateId).toBe("protheus");
    expect(res.draft?.customer_name).toBe("Hospital Alfa");
    expect(res.draft?.customer_segment).toBe("Hospital");
    expect(res.draft?.items).toHaveLength(2);
    expect(res.draft?.items[0]).toMatchObject({ sku: "A1", quantity: 100, unit_price: 5.5, cost_price: 3.0 });
  });

  it("parseCsvToQuoteDraft skips rows without SKU and reports errors", () => {
    const csv = ["Cliente,SKU,Descrição,Qtd,Preço", "Hospital B,S1,Seringa,10,100", ""].join("\n");
    const res = parseCsvToQuoteDraft(csv);
    expect(res.ok).toBe(true);
    expect(res.report.importedItems).toBe(1);
  });

it("parseCsvToQuoteDraft returns error on empty CSV", () => {
    const res = parseCsvToQuoteDraft("");
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  // ================= Melhoria #7 — Retorno do ERP =================

  it("parseCsvReturn parses updated cost, stock and status", () => {
    const csv = [
      "SKU,Custo Atualizado,Estoque,Status do Pedido",
      "S1,55,120,Faturado",
      "S2,28,80,Em separação",
    ].join("\n");
    const res = parseCsvReturn(csv);
    expect(res.ok).toBe(true);
    expect(res.rows).toHaveLength(2);
    expect(res.report.total).toBe(2);
    expect(res.report.withCost).toBe(2);
    expect(res.report.withStock).toBe(2);
    expect(res.report.withStatus).toBe(2);
    expect(res.rows[0]).toMatchObject({ sku: "S1", cost_price: 55, stock: 120, order_status: "Faturado" });
  });

it("parseCsvReturn handles Brazilian decimal format", () => {
    // Vírgula dentro de campo exige aspas (delimitador CSV).
    const csv = ["Código,Custo", 'S1,"1.234,56"', "S2,5,50"].join("\n");
    // "Código" normaliza para "codigo" → alias de sku; "Custo" → cost_price.
    // "1.234,56" → 1234.56
    const res = parseCsvReturn(csv);
    expect(res.ok).toBe(true);
    expect(res.rows[0].cost_price).toBe(1234.56);
  });

  it("parseCsvReturn returns error when SKU column missing", () => {
    const csv = ["Custo,Estoque", "55,120"].join("\n");
    const res = parseCsvReturn(csv);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("parseCsvReturn returns error on empty CSV", () => {
    const res = parseCsvReturn("");
    expect(res.ok).toBe(false);
  });

  it("applyReturnToQuote updates cost prices and reports applied items", () => {
    const quote = q();
    const res = applyReturnToQuote(quote, [
      { sku: "S1", cost_price: 55, stock: 120 },
    ]);
    expect(res.updatedItems).toBe(1);
    expect(quote.items[0].cost_price).toBe(55);
    expect(res.applied[0]).toMatchObject({ sku: "S1", cost_price: 55, stock: 120 });
  });

  it("applyReturnToQuote transitions status when ERP says faturado", () => {
    const quote = q(); // status: em_negociacao
    const res = applyReturnToQuote(quote, [
      { sku: "S1", order_status: "Faturado" },
      { sku: "S2", order_status: "Faturado" },
    ]);
    expect(res.updatedStatuses).toHaveLength(1);
    expect(res.updatedStatuses[0]).toEqual({ from: "em_negociacao", to: "ganho" });
    expect(quote.status).toBe("ganho");
  });

  it("applyReturnToQuote ignores return rows for unknown SKUs", () => {
    const quote = q();
    const res = applyReturnToQuote(quote, [{ sku: "NAO_EXISTE", cost_price: 1 }]);
    expect(res.updatedItems).toBe(0);
    expect(quote.items[0].cost_price).toBe(60); // inalterado
  });
});

