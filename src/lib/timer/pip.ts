/**
 * Pop-out timer: a floating picture-in-picture window that stays on top of
 * other apps (messages, music, Instagram). Phones only allow this for video,
 * so the timer is drawn onto a canvas and played as a live, silent video.
 *
 * Support varies by phone and browser; `pipSupported()` hides the button
 * where it can't work.
 */
import type { Runner } from './runner';
import { colorFor, formatClock } from './model';

const W = 640;
const H = 360;

export function pipSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const v = document.createElement('video') as any;
  const canvasOk = typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;
  const standard = !!(document as any).pictureInPictureEnabled && typeof v.requestPictureInPicture === 'function';
  const safari = typeof v.webkitSupportsPresentationMode === 'function' && v.webkitSupportsPresentationMode('picture-in-picture');
  return canvasOk && (standard || safari);
}

let active: TimerPip | null = null;

export function isPipOpen(): boolean {
  return !!active?.open;
}

export class TimerPip {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private video = document.createElement('video');
  private runner: Runner;
  open = false;
  private onClose?: () => void;

  constructor(runner: Runner, onClose?: () => void) {
    this.runner = runner;
    this.onClose = onClose;
    this.canvas.width = W;
    this.canvas.height = H;
    const v = this.video;
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    // Must be in the page (not display:none) for some browsers to allow PiP.
    Object.assign(v.style, { position: 'fixed', width: '2px', height: '2px', bottom: '0', left: '0', opacity: '0.01', pointerEvents: 'none' });
    v.addEventListener('leavepictureinpicture', () => this.closed());
    v.addEventListener('webkitpresentationmodechanged', () => {
      if ((v as any).webkitPresentationMode !== 'picture-in-picture') this.closed();
    });
    runner.on(() => { if (this.open) this.draw(); });
  }

  /** Must be called from a tap. */
  async show(): Promise<boolean> {
    if (active && active !== this) active.close();
    active = this;
    this.draw();
    const v = this.video as any;
    if (!v.srcObject) v.srcObject = (this.canvas as any).captureStream(10);
    if (!v.isConnected) document.body.appendChild(v);
    try {
      await v.play();
      if (typeof v.requestPictureInPicture === 'function' && (document as any).pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      } else if (typeof v.webkitSetPresentationMode === 'function') {
        v.webkitSetPresentationMode('picture-in-picture');
      } else {
        return false;
      }
      this.open = true;
      this.wireMediaSession();
      return true;
    } catch {
      this.open = false;
      return false;
    }
  }

  close() {
    const v = this.video as any;
    try {
      if ((document as any).pictureInPictureElement === v) (document as any).exitPictureInPicture();
      else if (v.webkitPresentationMode === 'picture-in-picture') v.webkitSetPresentationMode('inline');
    } catch {}
    this.closed();
  }

  private closed() {
    if (!this.open) return;
    this.open = false;
    if (active === this) active = null;
    this.onClose?.();
  }

  /** Play/pause and skip buttons in the floating window control the timer. */
  private wireMediaSession() {
    const ms = (navigator as any).mediaSession;
    if (!ms) return;
    const r = this.runner;
    const set = (action: string, fn: () => void) => { try { ms.setActionHandler(action, fn); } catch {} };
    set('play', () => { if (r.engine.status === 'paused') r.toggle(); });
    set('pause', () => { if (r.engine.status === 'running') r.toggle(); });
    set('nexttrack', () => r.skip());
    set('previoustrack', () => r.back());
    this.updateMetadata();
  }

  private updateMetadata() {
    const ms = (navigator as any).mediaSession;
    const step = this.runner.engine.current;
    if (!ms || !step || typeof (window as any).MediaMetadata !== 'function') return;
    try {
      ms.metadata = new (window as any).MediaMetadata({ title: step.name, artist: this.runner.timer.timerName, album: 'Strength B.I.B.L.E. Timer' });
      ms.playbackState = this.runner.engine.status === 'paused' ? 'paused' : 'playing';
    } catch {}
  }

  private lastState = '';

  draw() {
    const { engine, timer } = this.runner;
    const step = engine.current;
    const c = this.ctx;
    const paused = engine.status === 'paused';
    const done = engine.status === 'done';
    const color = step ? colorFor(step) : '#b8f52c';

    c.fillStyle = '#0f1115';
    c.fillRect(0, 0, W, H);
    c.globalAlpha = paused ? 0.12 : 0.28;
    c.fillStyle = color;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;

    // Progress bar along the bottom
    if (step && !done) {
      const left = engine.msLeft() / 1000;
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(0, H - 14, W, 14);
      c.fillStyle = color;
      c.fillRect(0, H - 14, W * (1 - left / step.duration), 14);
    }

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '700 34px Inter, system-ui, sans-serif';
    c.fillStyle = '#f5f7fa';
    const round = step?.totalRoundCount && step.totalRoundCount > 1 ? `  ·  ${step.roundNumber}/${step.totalRoundCount}` : '';
    c.fillText(done ? timer.timerName : `${step?.name ?? ''}${round}`, W / 2, 52, W - 40);

    c.font = '800 168px Inter, system-ui, sans-serif';
    c.fillStyle = paused ? '#9aa4b2' : color;
    c.fillText(done ? 'Done' : formatClock(engine.msLeft() / 1000), W / 2, 184, W - 30);

    c.font = '600 28px Inter, system-ui, sans-serif';
    c.fillStyle = '#cbd2dc';
    const next = engine.next;
    const footer = paused ? 'PAUSED' : done ? 'Nice work' : next ? `Next: ${next.name} ${formatClock(next.duration)}` : 'Last interval';
    c.fillText(footer, W / 2, 300, W - 40);

    const state = `${engine.index}:${engine.status}`;
    if (state !== this.lastState) {
      this.lastState = state;
      this.updateMetadata();
    }
  }
}
