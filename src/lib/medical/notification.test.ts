import { describe, expect, it } from "vitest";
import { sendApprovalNotification } from "./notification";

describe("notification", () => {
  it("logs approval requests without throwing", async () => {
    await expect(sendApprovalNotification("Q-123", 3, 1500, "Needs approval for price")).resolves.toBeUndefined();
  });
});
