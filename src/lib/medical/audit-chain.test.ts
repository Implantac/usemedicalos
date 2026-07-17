import { describe, expect, it } from "vitest";
import { GENESIS_HASH, hashActivity, verifyChain } from "./audit-chain";
import type { Activity } from "./activity";

function makeChain(): Activity[] {
  const list: Activity[] = [];
  let prev = GENESIS_HASH;
  for (let i = 0; i < 3; i++) {
    const a: Activity = {
      id: `act_${i}`,
      quote_id: "q1",
      type: "created",
      message: `evento ${i}`,
      created_at: new Date(2024, 0, 1, 12, i).toISOString(),
      prev_hash: prev,
    };
    a.hash = hashActivity(a, prev);
    prev = a.hash!;
    list.push(a);
  }
  return list;
}

describe("audit-chain", () => {
  it("valida uma cadeia íntegra", () => {
    const r = verifyChain(makeChain());
    expect(r.valid).toBe(true);
    expect(r.ok).toBe(3);
  });

  it("detecta tampering em mensagem", () => {
    const chain = makeChain();
    chain[1].message = "adulterado";
    const r = verifyChain(chain);
    expect(r.valid).toBe(false);
    expect(r.broken.some((b) => b.activityId === "act_1")).toBe(true);
  });

  it("detecta remoção de elo intermediário", () => {
    const chain = makeChain();
    const tampered = [chain[0], chain[2]];
    const r = verifyChain(tampered);
    expect(r.valid).toBe(false);
  });
});
