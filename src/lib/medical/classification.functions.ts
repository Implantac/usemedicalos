import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Lógica de Classificação de Itens
 * Centraliza o cruzamento de dados entre o item da cotação e o "ERP" (mock).
 */

export interface ItemClassification {
  classification: "can_attend" | "partial" | "no_stock" | "not_found";
  availableStock: number;
  attendQty: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  suggestedPrice?: number;
  matchedSku?: string;
  confidence: "high" | "medium" | "low";
}

export const classifyQuoteItem = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      sku: z.string(),
      quantity: z.number(),
      name: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    // Simula latência de processamento de IA/ERP
    // Em um cenário real, aqui consultaríamos o banco de dados do ERP
    
    // Mock de estoque e histórico baseado no SKU
    // SKUs terminados em par: tem estoque. Ímpar: sem estoque.
    const hasStock = parseInt(data.sku.replace(/\D/g, "") || "0") % 2 === 0;
    const stockQty = hasStock ? 1500 : 0;
    
    let classification: ItemClassification["classification"] = "can_attend";
    let attendQty = data.quantity;

    if (!hasStock) {
      classification = "no_stock";
      attendQty = 0;
    } else if (stockQty < data.quantity) {
      classification = "partial";
      attendQty = stockQty;
    }

    // Sugestão de preço baseada em "histórico" fictício
    const basePrice = 100;
    const suggestedPrice = basePrice * (1 + (Math.random() * 0.2 - 0.1));

    return {
      classification,
      availableStock: stockQty,
      attendQty,
      lastSalePrice: basePrice * 0.95,
      lastSaleDate: "2026-07-15",
      suggestedPrice,
      matchedSku: data.sku,
      confidence: "high",
    } as ItemClassification;
  });
