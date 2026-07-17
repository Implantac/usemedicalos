import { describe, it, expect } from "vitest";
import { nextStatus, prevStatus, slaBucketOf } from "./pipeline";

describe("pipeline", () => {
  it("avança pelo fluxo do pipeline", () => {
    expect(nextStatus("aguardando_precificacao")).toBe("em_negociacao");
    expect(nextStatus("em_negociacao")).toBe("enviado");
    expect(nextStatus("enviado")).toBe("ganho");
  });

  it("não avança de estados terminais", () => {
    expect(nextStatus("ganho")).toBeNull();
    expect(nextStatus("perdido")).toBeNull();
  });

  it("volta um passo, e perdido volta para aguardando", () => {
    expect(prevStatus("enviado")).toBe("em_negociacao");
    expect(prevStatus("aguardando_precificacao")).toBeNull();
    expect(prevStatus("perdido")).toBe("aguardando_precificacao");
  });
});

describe("slaBucketOf", () => {
  const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  it("classifica atrasado / risco / no prazo", () => {
    expect(slaBucketOf(inHours(-1))).toBe("atrasado");
    expect(slaBucketOf(inHours(2))).toBe("risco");
    expect(slaBucketOf(inHours(10))).toBe("no_prazo");
  });
});
