import { beforeEach, describe, expect, it } from "vitest";
import { appendActivity, getActivitiesFor, loadActivities, saveActivities } from "./activity";

// jsdom-like localStorage shim for node env
class MemStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

beforeEach(() => {
  // @ts-expect-error test shim
  globalThis.window = { localStorage: new MemStorage() };
  window.localStorage.clear();
});

describe("activity log", () => {
  it("append adds entries at the top with generated id + timestamp", () => {
    const a = appendActivity({ quote_id: "q1", type: "created", message: "hi" });
    expect(a.id).toMatch(/^act_/);
    expect(a.created_at).toBeTruthy();
    const b = appendActivity({ quote_id: "q1", type: "status_changed", message: "moved" });
    const list = loadActivities();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it("filters by quote id", () => {
    appendActivity({ quote_id: "q1", type: "created", message: "a" });
    appendActivity({ quote_id: "q2", type: "created", message: "b" });
    expect(getActivitiesFor("q1")).toHaveLength(1);
    expect(getActivitiesFor("q2")).toHaveLength(1);
    expect(getActivitiesFor("q3")).toHaveLength(0);
  });

  it("caps stored entries at 500", () => {
    const many = Array.from({ length: 550 }, (_, i) => ({
      id: `x${i}`,
      quote_id: "q",
      type: "created" as const,
      message: `m${i}`,
      created_at: new Date().toISOString(),
    }));
    saveActivities(many);
    expect(loadActivities()).toHaveLength(500);
  });
});
