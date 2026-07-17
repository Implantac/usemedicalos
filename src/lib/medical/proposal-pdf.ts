import jsPDF from "jspdf";
import type { Quote } from "./types";
import { formatBRL, formatPct, itemMargin, itemTotal, quoteTotals } from "./pricing";
import { STATUS_LABEL, PRIORITY_LABEL, SOURCE_LABEL } from "./types";

// Gera uma proposta em PDF (client-side, sem dependência de servidor).
export function generateProposalPdf(quote: Quote): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 48;

  // Cabeçalho corporativo
  doc.setFillColor(15, 23, 42); // navy
  doc.rect(0, 0, pageW, 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("USE Medical", marginX, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Proposta comercial - distribuicao hospitalar", marginX, 52);
  doc.text(new Date().toLocaleString("pt-BR"), pageW - marginX, 52, { align: "right" });

  y = 100;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Proposta #${quote.id.toUpperCase()}`, marginX, y);

  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${quote.customer_name}`, marginX, y);
  doc.text(`Segmento: ${quote.customer_segment}`, pageW / 2, y);

  y += 14;
  doc.text(`Origem: ${SOURCE_LABEL[quote.source_type]}`, marginX, y);
  doc.text(`Prioridade: ${PRIORITY_LABEL[quote.priority]}`, pageW / 2, y);

  y += 14;
  doc.text(`Status: ${STATUS_LABEL[quote.status]}`, marginX, y);
  doc.text(
    `SLA: ${new Date(quote.sla_deadline).toLocaleString("pt-BR")}`,
    pageW / 2,
    y,
  );

  // Tabela de itens
  y += 26;
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, y - 12, pageW - marginX * 2, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SKU", marginX + 6, y);
  doc.text("Descricao", marginX + 80, y);
  doc.text("Qtd", pageW - marginX - 200, y, { align: "right" });
  doc.text("Unit.", pageW - marginX - 130, y, { align: "right" });
  doc.text("Total", pageW - marginX - 60, y, { align: "right" });
  doc.text("Mg%", pageW - marginX - 6, y, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "normal");
  for (const it of quote.items) {
    if (y > 760) {
      doc.addPage();
      y = 60;
    }
    const name = it.name.length > 44 ? it.name.slice(0, 42) + "…" : it.name;
    doc.text(it.sku, marginX + 6, y);
    doc.text(name, marginX + 80, y);
    doc.text(String(it.quantity), pageW - marginX - 200, y, { align: "right" });
    doc.text(formatBRL(it.unit_price), pageW - marginX - 130, y, { align: "right" });
    doc.text(formatBRL(itemTotal(it)), pageW - marginX - 60, y, { align: "right" });
    doc.text(formatPct(itemMargin(it)), pageW - marginX - 6, y, { align: "right" });
    y += 14;
  }

  // Totais
  const totals = quoteTotals(quote.items);
  y += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, y, pageW - marginX, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Receita total:", pageW - marginX - 180, y, { align: "right" });
  doc.text(formatBRL(totals.revenue), pageW - marginX - 6, y, { align: "right" });
  y += 16;
  doc.text("Margem consolidada:", pageW - marginX - 180, y, { align: "right" });
  doc.text(formatPct(totals.margin), pageW - marginX - 6, y, { align: "right" });

  // Notas
  if (quote.notes) {
    y += 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Observacoes", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(quote.notes, pageW - marginX * 2);
    doc.text(wrapped, marginX, y);
  }

  // Rodape
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Documento gerado pelo USE Medical - proposta valida por 7 dias.",
    marginX,
    doc.internal.pageSize.getHeight() - 24,
  );

  doc.save(`proposta-${quote.id}-${quote.customer_name.replace(/\s+/g, "_")}.pdf`);
}
