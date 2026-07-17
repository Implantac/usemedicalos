import type { InboxViewState } from "@/hooks/use-inbox-views";

// Encoding helpers for sharing an Inbox view via URL (?view=<base64>).
// Uses URL-safe base64 so the string survives copy/paste in chat & e-mail.

function toBase64Url(str: string): string {
  const b64 = typeof window === "undefined"
    ? Buffer.from(str, "utf8").toString("base64")
    : window.btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof window === "undefined") return Buffer.from(b64, "base64").toString("utf8");
  return decodeURIComponent(escape(window.atob(b64)));
}

export function encodeViewState(state: InboxViewState): string {
  return toBase64Url(JSON.stringify(state));
}

export function decodeViewState(encoded: string): InboxViewState | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as InboxViewState;
  } catch {
    return null;
  }
}
