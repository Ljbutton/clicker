// Title screen, episode select, look picker, settings, pause and summary.
import { audio } from '../audio/audio';
import type { GameState, Settings } from '../core/state';
import type { Episode } from '../core/types';

function h(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as HTMLElement;
}
function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!); }

export class Menu {
  root: HTMLDivElement;
  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'menu-root';
    parent.appendChild(this.root);
  }
  clear() { this.root.innerHTML = ''; this.root.classList.remove('show'); }
  private show(el: HTMLElement) {
    this.root.innerHTML = '';
    this.root.appendChild(el);
    this.root.classList.add('show');
    el.querySelectorAll('button').forEach((b) => b.addEventListener('pointerenter', () => audio.sfx('hover')));
  }

  title(hasSave: boolean, saveInfo: string): Promise<'continue' | 'new' | 'episodes' | 'settings'> {
    const el = h(`
      <div class="menu title-screen">
        <div class="logo"><div class="logo-main">BLOCKBOUND</div><div class="logo-sub">The Fraying</div></div>
        <div class="menu-buttons">
          ${hasSave ? `<button data-a="continue" class="primary">Continue<small>${esc(saveInfo)}</small></button>` : ''}
          <button data-a="new" class="${hasSave ? '' : 'primary'}">New Season</button>
          <button data-a="episodes">Episodes</button>
          <button data-a="settings">Settings</button>
        </div>
        <div class="menu-foot">An original choice-driven adventure in four episodes · Your choices shape the story</div>
      </div>`);
    this.show(el);
    return new Promise((res) => el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { audio.unlock(); audio.sfx('select'); res(b.dataset.a as 'new'); })));
  }

  episodes(eps: Episode[], done: string[]): Promise<string | null> {
    const el = h(`
      <div class="menu episodes">
        <h2>Episodes</h2>
        <div class="ep-list">
          ${eps.map((e) => `
            <button class="ep-card ${done.includes(e.id) ? 'done' : ''}" data-id="${e.id}">
              <div class="ep-num">Episode ${e.number}</div>
              <div class="ep-title">${esc(e.title)}</div>
              <div class="ep-blurb">${esc(e.blurb)}</div>
              ${done.includes(e.id) ? '<div class="ep-done">✓ Completed</div>' : ''}
            </button>`).join('')}
        </div>
        <button class="back" data-id="">Back</button>
      </div>`);
    this.show(el);
    return new Promise((res) => el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { audio.sfx('select'); res(b.dataset.id || null); })));
  }

  pickLook(previews: string[]): Promise<number> {
    const el = h(`
      <div class="menu look">
        <h2>Who is Wren?</h2>
        <p>Choose how Wren looks. You can't change this later in the season.</p>
        <div class="look-list">${previews.map((src, i) => `<button class="look-card" data-i="${i}"><img src="${src}" alt="Look ${i + 1}"/><span>Look ${i + 1}</span></button>`).join('')}</div>
      </div>`);
    this.show(el);
    return new Promise((res) => el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { audio.sfx('select'); res(Number(b.dataset.i)); })));
  }

  settings(s: Settings): Promise<Settings> {
    const el = h(`
      <div class="menu settings">
        <h2>Settings</h2>
        <label>Text speed <input type="range" min="0" max="120" step="5" name="textSpeed" value="${s.textSpeed}"><span class="v"></span></label>
        <label>Music volume <input type="range" min="0" max="1" step="0.05" name="music" value="${s.music}"></label>
        <label>Effects volume <input type="range" min="0" max="1" step="0.05" name="sfx" value="${s.sfx}"></label>
        <label class="check"><input type="checkbox" name="timers" ${s.timers ? 'checked' : ''}> Timed choices</label>
        <label class="check"><input type="checkbox" name="qteAssist" ${s.qteAssist ? 'checked' : ''}> Action assist (slower, forgiving quick-time events)</label>
        <div class="controls-help">
          <b>Controls</b><br>
          Advance: click / tap / Space · Choices: click or 1-4<br>
          Explore: WASD or arrows to walk, click/tap to move, E to interact, Q/C to turn the camera, Shift to run<br>
          Action: press the key shown (E, arrows) or tap the button
        </div>
        <button class="back primary">Done</button>
      </div>`);
    this.show(el);
    const speedV = el.querySelector('.v') as HTMLSpanElement;
    const upd = () => { const v = Number((el.querySelector('[name=textSpeed]') as HTMLInputElement).value); speedV.textContent = v === 0 ? 'Instant' : String(v); };
    upd();
    el.querySelector('[name=textSpeed]')!.addEventListener('input', upd);
    return new Promise((res) => el.querySelector('.back')!.addEventListener('click', () => {
      const g = (n: string) => el.querySelector(`[name=${n}]`) as HTMLInputElement;
      audio.sfx('select');
      res({ textSpeed: Number(g('textSpeed').value), music: Number(g('music').value), sfx: Number(g('sfx').value), timers: g('timers').checked, qteAssist: g('qteAssist').checked });
    }));
  }

  pause(): Promise<'resume' | 'settings' | 'quit'> {
    const el = h(`
      <div class="menu pause">
        <h2>Paused</h2>
        <div class="menu-buttons">
          <button data-a="resume" class="primary">Resume</button>
          <button data-a="settings">Settings</button>
          <button data-a="quit">Save &amp; Quit to Title</button>
        </div>
        <p class="hint">Progress is saved at the start of each scene.</p>
      </div>`);
    this.show(el);
    return new Promise((res) => el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { audio.sfx('select'); res(b.dataset.a as 'resume'); })));
  }

  summary(ep: Episode, state: GameState, next: Episode | null): Promise<'next' | 'menu'> {
    const majors = state.majors[ep.id] ?? [];
    const el = h(`
      <div class="menu summary">
        <div class="sum-head"><div class="ep-num">Episode ${ep.number} complete</div><h2>${esc(ep.title)}</h2></div>
        <h3>Your choices</h3>
        <div class="sum-list">
          ${majors.length ? majors.map((m) => `
            <div class="sum-item">
              <div class="sum-title">${esc(m.title)}</div>
              <div class="sum-opts">${m.options.map((o, i) => `<div class="sum-opt ${i === m.chosen ? 'chosen' : ''}">${i === m.chosen ? '◆ ' : ''}${esc(o)}</div>`).join('')}${m.chosen < 0 ? '<div class="sum-opt chosen">◆ You said nothing</div>' : ''}</div>
            </div>`).join('') : '<p>No major choices recorded.</p>'}
        </div>
        <div class="menu-buttons row">
          ${next ? `<button data-a="next" class="primary">Play Episode ${next.number}: ${esc(next.title)}</button>` : ''}
          <button data-a="menu">Title Screen</button>
        </div>
      </div>`);
    this.show(el);
    return new Promise((res) => el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { audio.sfx('select'); res(b.dataset.a as 'next'); })));
  }

  credits(): Promise<void> {
    const el = h(`
      <div class="menu credits">
        <h2>Blockbound: The Fraying</h2>
        <p>Thank you for playing the season.</p>
        <p class="small">Story, characters, code, art, music and sound are original and generated procedurally in code.<br>Built with three.js.</p>
        <button class="primary">Title Screen</button>
      </div>`);
    this.show(el);
    return new Promise((res) => el.querySelector('button')!.addEventListener('click', () => { audio.sfx('select'); res(); }));
  }
}
