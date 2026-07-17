import { describe, it, expect } from "vitest";
import { classify, slaHoursFor } from "./classifier";

describe("classifier", () => {
  it("detecta urgência acima de alta complexidade", () => {
    const r = classify("Cirurgia URGENTE, precisamos hoje");
    expect(r.priority).toBe("urgente");
    expect(r.keywords).toEqual(expect.arrayContaining(["urgente", "hoje", "cirurgia"]));
  });

  it("detecta alta prioridade sem urgência", () => {
    const r = classify("Paciente da UTI, alta complexidade");
    expect(r.priority).toBe("alta");
  });

  it("cai em normal quando não há palavras-chave", () => {
    const r = classify("Pedido padrão de material");
    expect(r.priority).toBe("normal");
    expect(r.keywords).toEqual([]);
  });

  it("captura keywords de complexidade sem alterar prioridade", () => {
    const r = classify("Item de licitação e importado");
    expect(r.priority).toBe("normal");
    expect(r.keywords).toEqual(expect.arrayContaining(["licitação", "importado"]));
  });

  it("SLA em horas por prioridade", () => {
    expect(slaHoursFor("urgente")).toBe(2);
    expect(slaHoursFor("alta")).toBe(8);
    expect(slaHoursFor("normal")).toBe(24);
    expect(slaHoursFor("baixa")).toBe(72);
  });
});
