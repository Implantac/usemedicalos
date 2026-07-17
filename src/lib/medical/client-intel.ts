// Client Intelligence — agrega histórico de wins/losses por cliente e sugere tier.
// Mock: opera sobre quotes do localStorage. Migração Cloud: materialized view
// `client_intelligence` reagregada por trigger em `quotes.status`.

import type { ClientTier, Quote, SourcePlatform } from "./types";

export interface ClientProfile {
  customer_key: string;      // nome normalizado
  customer_name: string;     // primeiro nome canônico visto
  total_quotes: number;
  wins: number;
  losses: number;
  win_rate: number;          // 0..1
  avg_ticket: number;        // ticket médio ganho
  last_seen: string;         // ISO
  preferred_platforms: SourcePlatform[];
  suggested_tier: ClientTier;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function quoteTotal(q: Quote): number {
  return q.items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
}

export function suggestTier(winRate: number, sampleSize: number): ClientTier {
  if (sampleSize < 2) return "C";
  if (winRate >= 0.6 && sampleSize >= 3) return "A";
  if (winRate >= 0.3) return "B";
  return "C";
}

export function buildClientProfiles(quotes: Quote[]): Map<string, ClientProfile> {
  type Bucket = { name: string; quotes: Quote[]; platforms: Map<SourcePlatform, number> };
  const buckets = new Map<string, Bucket>();

  for (const q of quotes) {
    const key = normalize(q.customer_name);
    if (!key) continue;
    const cur: Bucket = buckets.get(key) ?? { name: q.customer_name, quotes: [], platforms: new Map() };
    cur.quotes.push(q);
    const p = q.portal_meta?.source_platform;
    if (p) cur.platforms.set(p, (cur.platforms.get(p) ?? 0) + 1);
    buckets.set(key, cur);
  }

  const out = new Map<string, ClientProfile>();
  for (const [key, b] of buckets) {
    const total = b.quotes.length;
    const wins = b.quotes.filter((q) => q.status === "ganho");
    const losses = b.quotes.filter((q) => q.status === "perdido").length;
    const winRate = total > 0 ? wins.length / total : 0;
    const avgTicket = wins.length ? wins.reduce((s, q) => s + quoteTotal(q), 0) / wins.length : 0;
    const lastSeen = b.quotes.reduce((max, q) => (q.received_at > max ? q.received_at : max), b.quotes[0].received_at);
    const platforms = Array.from(b.platforms.entries())
      .sort((a, z) => z[1] - a[1])
      .slice(0, 3)
      .map(([p]) => p);

    out.set(key, {
      customer_key: key,
      customer_name: b.name,
      total_quotes: total,
      wins: wins.length,
      losses,
      win_rate: Math.round(winRate * 100) / 100,
      avg_ticket: Math.round(avgTicket * 100) / 100,
      last_seen: lastSeen,
      preferred_platforms: platforms,
      suggested_tier: suggestTier(winRate, total),
    });
  }
  return out;
}

export function profileFor(quotes: Quote[], customerName: string): ClientProfile | null {
  const profiles = buildClientProfiles(quotes);
  return profiles.get(normalize(customerName)) ?? null;
}
