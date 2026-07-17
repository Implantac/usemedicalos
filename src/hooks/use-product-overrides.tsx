// Overrides editáveis de produto (tax_rate, cmed_ceiling, market_avg, compliance_flags).
// Persistidos em localStorage por SKU. No Cloud → UPDATE em `products` com policy de gestor.

import { useCallback, useEffect, useState } from "react";
import type { ComplianceFlags, Product } from "@/lib/medical/types";

export type ProductOverride = Partial<
  Pick<Product, "cost_price" | "tax_rate" | "logistics_rate" | "cmed_ceiling" | "market_avg">
> & { compliance_flags?: ComplianceFlags };

const KEY = "use-medical:product-overrides";
const EVT = "use-medical:product-overrides-changed";

type OverrideMap = Record<string, ProductOverride>;

function read(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as OverrideMap;
  } catch {
    return {};
  }
}

export function useProductOverrides() {
  const [overrides, setOverrides] = useState<OverrideMap>({});

  useEffect(() => {
    setOverrides(read());
    const handler = () => setOverrides(read());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const save = useCallback((sku: string, patch: ProductOverride) => {
    const current = read();
    current[sku] = { ...current[sku], ...patch };
    localStorage.setItem(KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const clear = useCallback((sku: string) => {
    const current = read();
    delete current[sku];
    localStorage.setItem(KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const applyTo = useCallback(
    (p: Product): Product => ({ ...p, ...overrides[p.sku] }),
    [overrides],
  );

  return { overrides, save, clear, applyTo };
}
