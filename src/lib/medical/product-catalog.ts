/**
 * Catálogo de produtos mutável em runtime.
 *
 * Wrapper sobre PRODUCTS (mock-data.ts) + localStorage para persistência.
 * Permite adicionar produtos rapidamente durante o fluxo de cotação,
 * sem precisar sair do drawer ou recarregar a página.
 *
 * No Cloud, este módulo será substituído por queries TanStack Query
 * contra a tabela `products`.
 */

import { useCallback, useEffect, useState } from "react";
import type { Product } from "./types";
import { PRODUCTS } from "./mock-data";

const STORAGE_KEY = "use-medical:catalog-additions:v1";
const CHANGE_EVENT = "use-medical:catalog:change";

// ---------- Persistência ----------

function loadAdditions(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

function saveAdditions(products: Product[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// ---------- API pública ----------

/**
 * Gera um ID único para produto.
 */
function nextProductId(): string {
  const existing = loadAdditions();
  const max = existing.reduce((m, p) => {
    const n = parseInt(p.id.replace("p_custom_", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `p_custom_${max + 1}`;
}

/**
 * Adiciona um produto ao catálogo (produtos base + adições).
 * Persiste em localStorage e dispara evento para re-renderizar hooks.
 */
export function addProduct(
  sku: string,
  name: string,
  costPrice: number,
  unit: string = "un",
): Product {
  const additions = loadAdditions();

  // Evita duplicata de SKU
  const existing = getAllProducts().find((p) => p.sku.toUpperCase() === sku.toUpperCase());
  if (existing) return existing;

  const product: Product = {
    id: nextProductId(),
    sku: sku.toUpperCase(),
    name,
    cost_price: costPrice,
    last_suggested_price: costPrice * 1.3, // margem padrão 30%
    unit,
    tax_rate: 0.12,
    logistics_rate: 0.03,
    cmed_ceiling: undefined,
    market_avg: undefined,
    compliance_flags: { anvisa: true },
  };

  saveAdditions([...additions, product]);
  return product;
}

/**
 * Retorna todos os produtos (base + adições).
 */
export function getAllProducts(): Product[] {
  return [...PRODUCTS, ...loadAdditions()];
}

/**
 * Busca um produto por SKU (case-insensitive).
 */
export function getProductBySku(sku: string): Product | undefined {
  return getAllProducts().find((p) => p.sku.toUpperCase() === sku.toUpperCase());
}

/**
 * Busca um produto por ID.
 */
export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((p) => p.id === id);
}

/**
 * Remove um produto adicionado (não afeta produtos base).
 */
export function removeAddedProduct(id: string): boolean {
  const before = loadAdditions().length;
  saveAdditions(loadAdditions().filter((p) => p.id !== id));
  return loadAdditions().length < before;
}

// ---------- Hook React ----------

export function useProductCatalog() {
  const [catalog, setCatalog] = useState<Product[]>(() => getAllProducts());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => {
      setCatalog(getAllProducts());
      setVersion((v) => v + 1);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const add = useCallback(
    (sku: string, name: string, costPrice: number, unit?: string): Product => {
      const p = addProduct(sku, name, costPrice, unit);
      setCatalog(getAllProducts());
      setVersion((v) => v + 1);
      return p;
    },
    [],
  );

  const getBySku = useCallback(
    (sku: string): Product | undefined =>
      catalog.find((p) => p.sku.toUpperCase() === sku.toUpperCase()),
    [catalog],
  );

  const getById = useCallback(
    (id: string): Product | undefined => catalog.find((p) => p.id === id),
    [catalog],
  );

  const remove = useCallback((id: string): boolean => {
    const ok = removeAddedProduct(id);
    if (ok) {
      setCatalog(getAllProducts());
      setVersion((v) => v + 1);
    }
    return ok;
  }, []);

  return {
    catalog,
    version,
    add,
    getBySku,
    getById,
    remove,
  };
}
