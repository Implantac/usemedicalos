// HMAC-SHA256 helpers para assinar/verificar payloads de ingestão ERP.
// Usa Web Crypto (disponível no Worker + browser). Timing-safe compare.

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function signPayload(secret: string, body: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `sha256=${toHex(sig)}`;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySignature(
  secret: string,
  body: string,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = await signPayload(secret, body);
  return timingSafeEqual(expected, signatureHeader);
}
