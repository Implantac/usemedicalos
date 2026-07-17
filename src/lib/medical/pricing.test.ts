import { describe, it, expect } from "vitest";
import { itemMargin, itemTotal, itemCost, quoteTotals, suggestPrice, isMarginOk, formatBRL, formatPct } from "./pricing";
import type { QuoteItem } from "./types";

const item = (o: Partial<QuoteItem> = {}): QuoteItem => ({
  product_id: "p1",
  sku: "SKU-1",
  name: "Item",
  quantity: 10,
  unit_price: 100,
  cost_price: 60,
  ...o,
});

describe("pricing", () => {
  it("calcula margem por item", () => {
    expect(itemMargin(item({ unit_price: 100, cost_price: 60 }))).toBeCloseTo(0.4);
    expect(itemMargin(item({ unit_price: 0 }))).toBe(0);
  });

  it("calcula totais e custo", () => {
    expect(itemTotal(item())).toBe(1000);
    expect(itemCost(item())).toBe(600);
  });

  it("agrega totais da cotação", () => {
    const t = quoteTotals([item(), item({ unit_price: 50, cost_price: 50 })]);
    expect(t.revenue).toBe(1500);
    expect(t.cost).toBe(1100);
    expect(t.profit).toBe(400);
    expect(t.margin).toBeCloseTo(400 / 1500);
  });

  it("quoteTotals com lista vazia não divide por zero", () => {
    expect(quoteTotals([])).toEqual({ revenue: 0, cost: 0, profit: 0, margin: 0 });
  });

  it("suggestPrice atinge margem-alvo com desconto de volume", () => {
    const p1 = suggestPrice(item({ quantity: 5 }));
    const p50 = suggestPrice(item({ quantity: 60 }));
    expect(p50).toBeLessThan(p1);
    expect(p1).toBeGreaterThan(60); // maior que o custo
  });

  it("bloqueia margem abaixo de 12%", () => {
    expect(isMarginOk(0.11)).toBe(false);
    expect(isMarginOk(0.12)).toBe(true);
  });

  it("formata BRL e percentuais em pt-BR", () => {
    expect(formatBRL(1234.5)).toMatch(/1\.234,50/);
    expect(formatPct(0.257)).toBe("25.7%");
  });
});
