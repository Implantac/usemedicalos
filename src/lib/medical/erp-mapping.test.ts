import { describe, it, expect } from "vitest";
import { applyMapping, getPath, SAMPLE_ERP_PAYLOAD, SAMPLE_MAPPING } from "./erp-mapping";

describe("erp-mapping", () => {
  it("resolve JSONPath simples", () => {
    expect(getPath({ a: { b: [{ c: 42 }] } }, "a.b[0].c")).toBe(42);
    expect(getPath(null, "a.b")).toBeUndefined();
  });

  it("mapeia payload de exemplo com sucesso", () => {
    const r = applyMapping(SAMPLE_ERP_PAYLOAD, SAMPLE_MAPPING);
    expect(r.ok).toBe(true);
    expect(r.draft?.customer_name).toBe("Hospital Beta");
    expect(r.draft?.items).toHaveLength(2);
    expect(r.draft?.items[0].sku).toBe("SUT-3-0-CT");
    expect(r.draft?.items[0].quantity).toBe(30);
  });

  it("acumula erros para campos obrigatórios ausentes", () => {
    const r = applyMapping({ produtos: [] }, SAMPLE_MAPPING);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
