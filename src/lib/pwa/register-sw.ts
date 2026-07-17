/**
 * Guarded service-worker registration wrapper.
 *
 * Registers /sw.js ONLY in the published production app. Refuses (and unregisters
 * any existing app SW) in dev, Lovable preview iframes, and when ?sw=off is set.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const hostname = window.location.hostname;
  const inIframe = window.self !== window.top;

  const isPreviewHost =
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");

  const disabled =
    !import.meta.env.PROD ||
    inIframe ||
    isPreviewHost ||
    url.searchParams.get("sw") === "off";

  if (disabled) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((r) => r.active?.scriptURL.endsWith("/sw.js"))
          .map((r) => r.unregister()),
      );
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js");
    wb.addEventListener("waiting", () => {
      wb.messageSkipWaiting();
    });
    wb.addEventListener("controlling", () => {
      // A new SW took control — reload once to pick up fresh assets.
      window.location.reload();
    });
    await wb.register();
  } catch (err) {
    console.warn("[pwa] service worker registration failed", err);
  }
}
