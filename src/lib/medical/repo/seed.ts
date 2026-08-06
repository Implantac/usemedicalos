/**
 * Seed data — tenant piloto + produtos + membros (Melhoria #8).
 *
 * Ao ativar a Lovable Cloud, rode este seed antes do primeiro SELECT
 * autenticado. Ele popula o tenant piloto, os produtos mock e o vínculo
 * tenant_members (admin) para que o RLS por `auth.uid()` funcione.
 *
 * Uso (server context):
 *   import { seedTenant } from "@/lib/medical/repo/seed";
 *   await seedTenant(clientSupabase, { tenantId, adminUserId });
 */

export const PILOT_TENANT = {
  id: "t_piloto",
  name: "Use Distribuidora Piloto",
  cnpj: "00.000.000/0001-00",
  erp_type: "use_sistemas",
};

export const PILOT_PRODUCTS: Array<{
  sku: string;
  name: string;
  cost_price: number;
  unit: string;
}> = [
  { sku: "LUVA-M-100", name: "Luva de Procedimento M (cx 100)", cost_price: 12.5, unit: "cx" },
  { sku: "SER-3ML-100", name: "Seringa 3ml c/ agulha (cx 100)", cost_price: 9.9, unit: "cx" },
  { sku: "GAZE-7.5", name: "Gaze Hidrófila 7,5cm (rolo)", cost_price: 3.2, unit: "un" },
  { sku: "ALG-500", name: "Algodão Hidrófilo 500g", cost_price: 14.0, unit: "un" },
  { sku: "SOR-0.9-250", name: "Soro Fisiológico 0,9% 250ml", cost_price: 2.1, unit: "un" },
];

export interface SeedInput {
  tenantId: string;
  adminUserId: string;
}

/**
 * Insere tenant piloto + produtos + tenant_members.
 * Idempotente: usa upsert com onConflict nas chaves naturais.
 */
export async function seedTenant(client: unknown, input: SeedInput): Promise<void> {
  const sb = client as {
    from: (t: string) => {
      upsert: (
        rows: unknown,
        opts?: { onConflict?: string },
      ) => { select: (cols: string) => Promise<{ error: unknown }> };
    };
  };

  await sb.from("tenants").upsert(PILOT_TENANT, { onConflict: "id" }).select("id");
  await sb.from("products").upsert(
    PILOT_PRODUCTS.map((p) => ({
      tenant_id: input.tenantId,
      sku: p.sku,
      name: p.name,
      cost_price: p.cost_price,
      unit: p.unit,
      tax_rate: 0.18,
      logistics_rate: 0.03,
    })),
    { onConflict: "sku" },
  ).select("id");
  await sb
    .from("tenant_members")
    .upsert({ tenant_id: input.tenantId, user_id: input.adminUserId, role: "admin" }, { onConflict: "tenant_id,user_id" })
    .select("tenant_id");
}
