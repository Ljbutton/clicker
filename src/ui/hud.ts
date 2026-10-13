// DOM overlay: dialogue, choices, notices, QTE prompts, explore labels, fades.
import { audio } from '../audio/audio';
import type { QteKey } from '../core/types';

export const auto = {
  on: false,
  rng: Math.random,
  /** Probability an automated QTE fails (to exercise retry paths). */
  failRate: 0,
  log: [] as string[],
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, parent?: HTMLElement, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

const KEY_LABEL: Record<QteKey, string> = { action: 'E', up: '▲', down: '▼', left: '◀', right: '▶' };
const KEY_CODES: Record<QteKey, string[]> = {
  action: ['KeyE', 'Space', 'Enter'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

export class Hud {
  root: HTMLDivElement;
  sub: HTMLDivElement;
  subName: HTMLDivElement;
  subText: HTMLDivElement;
  subMore: HTMLDivElement;
  caption: HTMLDivElement;
  choices: HTMLDivElement;
  timerBar: HTMLDivElement;
  notices: HTMLDivElement;
  titleCard: HTMLDivElement;
  fader: HTMLDivElement;
  qteLayer: HTMLDivElement;
  objective: HTMLDivElement;
  labels: HTMLDivElement;
  items: HTMLDivElement;
  pauseBtn: HTMLButtonElement;
  textSpeed = 55;
  timersOn = true;
  qteAssist = false;
  skipping = false;
  private advanceCb: (() => void) | null = null;
  onPause: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'hud', parent);
    this.labels = el('div', 'labels', this.root);
    this.objective = el('div', 'objective hidden', this.root);
    this.items = el('div', 'items', this.root);
    this.notices = el('div', 'notices', this.root);
    this.qteLayer = el('div', 'qte-layer', this.root);
    this.caption = el('div', 'caption hidden', this.root);
    this.sub = el('div', 'subtitle hidden', this.root);
    this.subName = el('div', 'sub-name', this.sub);
    this.subText = el('div', 'sub-text', this.sub);
    this.subMore = el('div', 'sub-more', this.sub, '▼');
    this.choices = el('div', 'choices hidden', this.root);
    this.timerBar = el('div', 'timer', this.root);
    this.titleCard = el('div', 'title-card hidden', this.root);
    this.fader = el('div', 'fader', this.root);
    this.pauseBtn = el('button', 'pause-btn', this.root, '❚❚');
    this.pauseBtn.title = 'Menu (Esc)';
    this.pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onPause?.(); });

    // advancing: click anywhere / space / enter
    this.root.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button, .choice, .qte-btn, .label, .craft')) return;
      this.advance();
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Escape') { this.onPause?.(); return; }
      if (e.code === 'Space' || e.code === 'Enter') this.advance();
    });
  }

  private advance() { const cb = this.advanceCb; if (cb) cb(); }

  hideAll() {
    this.sub.classList.add('hidden');
    this.caption.classList.add('hidden');
    this.choices.classList.add('hidden');
    this.objective.classList.add('hidden');
    this.labels.innerHTML = '';
    this.qteLayer.innerHTML = '';
    this.timerBar.style.width = '0';
  }

  /** Show a line of dialogue with a typewriter effect; resolves when the player advances. */
  async say(name: string, text: string, color: string, voice = 1, onMouth?: (open: number) => void, think = false): Promise<void> {
    this.caption.classList.add('hidden');
    this.sub.classList.remove('hidden');
    this.sub.classList.toggle('think', think);
    this.subName.textContent = name;
    this.subName.style.color = color;
    this.subName.style.display = name ? '' : 'none';
    this.subText.textContent = '';
    this.subMore.style.visibility = 'hidden';
    if (auto.on) { this.subText.textContent = text; auto.log.push(`${name}: ${text}`); await sleep(1); onMouth?.(0); return; }
    let done = false;
    let shown = 0;
    const speed = this.textSpeed;
    await new Promise<void>((res) => {
      const finish = () => { done = true; this.subText.textContent = text; this.subMore.style.visibility = 'visible'; onMouth?.(0); };
      this.advanceCb = () => {
        if (!done) { finish(); return; }
        this.advanceCb = null;
        audio.sfx('tick');
        res();
      };
      if (speed <= 0) { finish(); return; }
      let last = performance.now();
      let acc = 0;
      const tick = (now: number) => {
        if (done) return;
        acc += ((now - last) / 1000) * speed;
        last = now;
        const n = Math.min(text.length, Math.floor(acc));
        if (n > shown) {
          shown = n;
          this.subText.textContent = text.slice(0, n);
          const ch = text[n - 1];
          if (/[a-z]/i.test(ch)) {
            if (n % 3 === 0) audio.sfx('blip', voice);
            onMouth?.(n % 4 < 2 ? 2 : 1);
          } else onMouth?.(0);
        }
        if (n >= text.length) { finish(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    this.sub.classList.add('hidden');
  }

  async narrate(text: string): Promise<void> {
    this.sub.classList.add('hidden');
    this.caption.classList.remove('hidden');
    this.caption.textContent = text;
    if (auto.on) { auto.log.push(`[${text}]`); await sleep(1); this.caption.classList.add('hidden'); return; }
    await new Promise<void>((res) => {
      const t0 = performance.now();
      this.advanceCb = () => { if (performance.now() - t0 < 250) return; this.advanceCb = null; res(); };
    });
    this.caption.classList.add('hidden');
  }

  /** Show choices; resolves with the index chosen, or -1 on timeout. */
  choose(opts: string[], timer = 0, prompt?: string): Promise<number> {
    this.sub.classList.add('hidden');
    if (auto.on) {
      const i = Math.floor(auto.rng() * opts.length);
      auto.log.push(`> ${opts[i]}`);
      return sleep(1).then(() => i);
    }
    this.choices.innerHTML = '';
    this.choices.classList.remove('hidden');
    this.choices.classList.toggle('four', opts.length > 2);
    if (prompt) el('div', 'choice-prompt', this.choices, prompt);
    const grid = el('div', 'choice-grid', this.choices);
    return new Promise((res) => {
      let finished = false;
      let raf = 0;
      const done = (i: number) => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        this.timerBar.style.width = '0';
        const btns = grid.querySelectorAll('.choice');
        btns.forEach((b, k) => b.classList.add(k === i ? 'picked' : 'faded'));
        audio.sfx(i >= 0 ? 'select' : 'tick');
        setTimeout(() => { this.choices.classList.add('hidden'); res(i); }, i >= 0 ? 380 : 150);
      };
      let focus = -1;
      const btns = opts.map((o, i) => {
        const b = el('button', 'choice', grid);
        el('span', 'choice-key', b, String(i + 1));
        el('span', 'choice-text', b, o);
        b.addEventListener('click', (e) => { e.stopPropagation(); done(i); });
        b.addEventListener('pointerenter', () => { focus = i; mark(); audio.sfx('hover'); });
        return b;
      });
      const mark = () => btns.forEach((b, k) => b.classList.toggle('focus', k === focus));
      const onKey = (e: KeyboardEvent) => {
        const n = Number(e.key);
        if (n >= 1 && n <= opts.length) { done(n - 1); return; }
        if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD', 'Tab'].includes(e.code)) { focus = (focus + 1) % opts.length; mark(); e.preventDefault(); }
        else if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) { focus = (focus - 1 + opts.length) % opts.length; mark(); e.preventDefault(); }
        else if ((e.code === 'Enter' || e.code === 'Space') && focus >= 0) { done(focus); e.preventDefault(); }
      };
      window.addEventListener('keydown', onKey);
      if (timer > 0 && this.timersOn) {
        const t0 = performance.now();
        const tick = (now: number) => {
          const left = 1 - (now - t0) / (timer * 1000);
          this.timerBar.style.width = `${Math.max(0, left) * 100}%`;
          if (left <= 0) { done(-1); return; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    });
  }

  notice(text: string, kind: 'remember' | 'item' | 'info' = 'remember') {
    if (auto.on) { auto.log.push(`(${text})`); return; }
    const n = el('div', `notice ${kind}`, this.notices);
    el('span', 'notice-icon', n, kind === 'remember' ? '◆' : kind === 'item' ? '✚' : '●');
    el('span', '', n, text);
    audio.sfx(kind === 'remember' ? 'remember' : 'item');
    setTimeout(() => n.classList.add('out'), 3200);
    setTimeout(() => n.remove(), 3900);
  }

  async title(text: string, sub?: string, hold = 2.6) {
    this.titleCard.innerHTML = '';
    if (sub) el('div', 'tc-sub', this.titleCard, sub);
    el('div', 'tc-main', this.titleCard, text);
    this.titleCard.classList.remove('hidden');
    if (auto.on) { auto.log.push(`== ${sub ?? ''} ${text}`); await sleep(1); this.titleCard.classList.add('hidden'); return; }
    await sleep(hold * 1000);
    this.titleCard.classList.add('hidden');
    await sleep(500);
  }

  async fade(dir: 'in' | 'out', dur = 0.6) {
    this.fader.style.transition = `opacity ${dur}s ease`;
    this.fader.style.opacity = dir === 'out' ? '1' : '0';
    if (!auto.on) await sleep(dur * 1000);
  }
  fadeInstant(dir: 'in' | 'out') {
    this.fader.style.transition = 'none';
    this.fader.style.opacity = dir === 'out' ? '1' : '0';
  }

  setObjective(text: string | null) {
    if (!text) { this.objective.classList.add('hidden'); return; }
    this.objective.textContent = text;
    this.objective.classList.remove('hidden');
  }

  /**
   * Quick-time event. Resolves true on success.
   * pos: function returning screen position to anchor the prompt.
   */
  qte(kind: 'press' | 'dir' | 'mash' | 'seq', keys: QteKey[], time: number, text: string, count: number, pos: () => { x: number; y: number } | null): Promise<boolean> {
    if (auto.on) {
      const ok = auto.rng() >= auto.failRate;
      auto.log.push(`QTE ${kind} ${keys.join(',')} ${ok ? 'ok' : 'FAIL'}`);
      return sleep(1).then(() => ok);
    }
    if (this.qteAssist) time *= 1.8;
    if (this.qteAssist && kind === 'mash') count = Math.ceil(count * 0.6);
    this.qteLayer.innerHTML = '';
    const box = el('div', `qte ${kind}`, this.qteLayer);
    const label = el('div', 'qte-text', box, text);
    const btnRow = el('div', 'qte-keys', box);
    const ring = el('div', 'qte-ring', box);
    const bar = el('div', 'qte-mash', box);
    const fill = el('div', 'qte-mash-fill', bar);
    if (kind !== 'mash') bar.style.display = 'none';
    audio.sfx('qte');
    return new Promise((res) => {
      let idx = 0;
      let presses = 0;
      let finished = false;
      let t0 = performance.now();
      let raf = 0;
      const btns: HTMLButtonElement[] = [];
      const render = () => {
        btnRow.innerHTML = '';
        btns.length = 0;
        const list = kind === 'seq' ? keys : [keys[0]];
        list.forEach((k, i) => {
          const b = el('button', 'qte-btn' + (kind === 'seq' && i < idx ? ' done' : '') + (kind === 'seq' && i === idx ? ' cur' : ''), btnRow, KEY_LABEL[k]);
          b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); press(k); });
          btns.push(b);
        });
      };
      const finish = (ok: boolean) => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        box.classList.add(ok ? 'ok' : 'bad');
        audio.sfx(ok ? 'ok' : 'fail');
        setTimeout(() => { box.remove(); res(ok); }, ok ? 260 : 420);
      };
      const press = (k: QteKey) => {
        if (finished) return;
        if (kind === 'mash') {
          if (k !== keys[0]) return;
          presses++;
          audio.sfx('mash');
          fill.style.width = `${Math.min(100, (presses / count) * 100)}%`;
          box.classList.remove('pulse'); void box.offsetWidth; box.classList.add('pulse');
          if (presses >= count) finish(true);
          return;
        }
        const want = kind === 'seq' ? keys[idx] : keys[0];
        if (k === want) {
          if (kind === 'seq' && idx < keys.length - 1) { idx++; t0 = performance.now(); audio.sfx('ok'); render(); return; }
          finish(true);
        } else if (!this.qteAssist) finish(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        for (const k of Object.keys(KEY_CODES) as QteKey[]) if (KEY_CODES[k].includes(e.code)) { e.preventDefault(); press(k); return; }
      };
      window.addEventListener('keydown', onKey);
      render();
      const total = kind === 'mash' ? time : time;
      const tick = (now: number) => {
        const left = 1 - (now - t0) / (total * 1000);
        ring.style.setProperty('--p', String(Math.max(0, left)));
        const p = pos();
        if (p) { box.style.left = `${Math.max(90, Math.min(window.innerWidth - 90, p.x))}px`; box.style.top = `${Math.max(120, Math.min(window.innerHeight - 160, p.y))}px`; }
        if (left <= 0) { finish(false); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      void label;
    });
  }

  /** Death / failure screen. */
  async failScreen() {
    if (auto.on) return;
    const d = el('div', 'fail-screen', this.root);
    el('div', 'fail-main', d, 'You were overwhelmed');
    el('div', 'fail-sub', d, 'Rewinding…');
    await sleep(1600);
    d.classList.add('out');
    await sleep(400);
    d.remove();
  }

  setItems(items: Array<{ id: string; name: string; icon: HTMLCanvasElement }>) {
    this.items.innerHTML = '';
    for (const it of items) {
      const s = el('div', 'item', this.items);
      s.title = it.name;
      const c = it.icon.cloneNode(true) as HTMLCanvasElement;
      c.getContext('2d')!.drawImage(it.icon, 0, 0);
      s.appendChild(c);
    }
  }
}

export function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
