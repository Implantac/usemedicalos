// Defesa em profundidade contra escrita cross-tenant.
// Toda mutação em Quote passa por `assertSameTenant`. Se o escopo ativo for
// específico ("tnt_x") e o registro pertencer a outro tenant, jogamos erro
// — mesmo comportamento que RLS terá no Cloud.

import type { Quote } from "./types";

export class CrossTenantWriteError extends Error {
  constructor(
    readonly attemptedTenant: string,
    readonly activeScope: string,
    readonly quoteId?: string,
  ) {
    super(
      `Bloqueio anti-cross-tenant: escopo ativo "${activeScope}" tentou mutar registro do tenant "${attemptedTenant}"${
        quoteId ? ` (quote ${quoteId})` : ""
      }.`,
    );
    this.name = "CrossTenantWriteError";
  }
}

export type ActiveScope = string | "all";

export function isWriteAllowed(quote: Pick<Quote, "tenant_id" | "id">, scope: ActiveScope): boolean {
  if (scope === "all") return true;
  return quote.tenant_id === scope;
}

export function assertSameTenant(
  quote: Pick<Quote, "tenant_id" | "id">,
  scope: ActiveScope,
): void {
  if (!isWriteAllowed(quote, scope)) {
    throw new CrossTenantWriteError(quote.tenant_id, scope, quote.id);
  }
}
