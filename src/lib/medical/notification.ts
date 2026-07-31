// Lightweight mock notification sender used in development/testing.
export async function sendApprovalNotification(
  quoteId: string,
  itemsCount: number,
  revenue: number,
  reason?: string,
): Promise<void> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 250));

  // In a real integration this would call an external API (email/Slack).
  // For now we log to console so devs can observe the event.
  // Format revenue for readability
  const rev = revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  console.info(`[mock-notification] Approval requested for ${quoteId}: ${itemsCount} items · ${rev} · reason: ${reason || "<none>"}`);
}
