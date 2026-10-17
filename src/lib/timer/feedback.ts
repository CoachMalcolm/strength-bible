/**
 * Everything the timer does to get your attention: beeps, voice, vibration,
 * and keeping the screen awake. All of it fails quietly on devices that
 * don't support a feature.
 *
 * iPhones only allow sound after a tap, so call `unlock()` from the START tap.
 */

let ctx: AudioContext | null = null;

export function unlock() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    // A silent blip fully unlocks audio on iOS.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
  } catch { /* no audio */ }
  // Speech also needs a gesture on some browsers.
  try { if ('speechSynthesis' in window) window.speechSynthesis.getVoices(); } catch {}
}

/** freq in Hz, ms length. */
export function beep(freq = 880, ms = 140, volume = 0.35) {
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {}
}

export const sounds = {
  tick: () => beep(660, 110),
  go: () => { beep(990, 180, 0.45); setTimeout(() => beep(1320, 260, 0.45), 190); },
  halfway: () => { beep(740, 90); setTimeout(() => beep(740, 90), 140); },
  done: () => { [0, 220, 440].forEach((d, i) => setTimeout(() => beep([880, 1100, 1320][i], 260, 0.45), d)); },
};

export function speak(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
  } catch {}
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

export function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch {}
}

// ---- Keep the screen awake while a timer runs ----

let lock: any = null;
let wanted = false;

export async function keepAwake(on: boolean) {
  wanted = on;
  try {
    if (on && 'wakeLock' in navigator && !lock && document.visibilityState === 'visible') {
      lock = await (navigator as any).wakeLock.request('screen');
      lock.addEventListener?.('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch { lock = null; }
}

// The browser drops the wake lock when you leave the page; take it back on return.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wanted) keepAwake(true);
  });
}

export function canKeepAwake(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}
