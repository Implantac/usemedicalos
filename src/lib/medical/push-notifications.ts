// Push API + alerta sonoro para SLA (Melhoria #1).
// O VitePWA já gera /sw.js (cache offline). Aqui registramos um subscription
// de Push quando o usuário habilita notificações. Como não há backend de push
// ainda (fica pronto com Lovable Cloud), guardamos a subscription localmente
// para o "showNotification" no SW e tocamos um som no browser como fallback.
//
// Em produção (Cloud ativo), troque o endpoint por um server function que
// persiste a subscription e agenda o disparo via web-push.

const PUSH_KEY = "use-medical:push-subscription:v1";
const SOUND_KEY = "use-medical:sound-enabled:v1";

export interface PushState {
  supported: boolean;
  subscribed: boolean;
  soundEnabled: boolean;
}

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function getPushState(): PushState {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return { supported: false, subscribed: false, soundEnabled: readSound() };
  }
  let subscribed = false;
  try {
    subscribed = !!localStorage.getItem(PUSH_KEY);
  } catch {
    /* noop */
  }
  return { supported: true, subscribed, soundEnabled: readSound() };
}

/** Registra a subscription de push (se disponível) e aplica o som. */
export async function subscribePush(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // VAPID público placeholder — substitua pelo real em produção.
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
      ),
    });
    localStorage.setItem(PUSH_KEY, JSON.stringify(sub.toJSON()));
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(PUSH_KEY);
  } catch {
    /* noop */
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* noop */
  }
}

/** Toca um alerta sonoro (oscilador web) quando notificações estão ativas. */
export function playAlertSound(): void {
  if (typeof window === "undefined" || !readSound()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    // Limpa o contexto após o fim
    setTimeout(() => void ctx.close().catch(() => {}), 700);
  } catch {
    /* noop */
  }
}

/** Converte base64url → Uint8Array (para applicationServerKey). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
