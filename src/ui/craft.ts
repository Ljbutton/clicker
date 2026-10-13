// 3x3 crafting puzzle. Place items in the grid to match the recipe shape.
import { audio } from '../audio/audio';
import type { CraftSpec } from '../core/types';
import { itemDef, itemIcon } from '../content/items';
import { auto, sleep } from './hud';

function normalize(grid: (string | null)[]): string {
  // trim empty rows/cols so the shape can be placed anywhere
  const rows = [0, 1, 2].map((r) => grid.slice(r * 3, r * 3 + 3));
  let r0 = 0, r1 = 2, c0 = 0, c1 = 2;
  while (r0 <= r1 && rows[r0].every((x) => !x)) r0++;
  while (r1 >= r0 && rows[r1].every((x) => !x)) r1--;
  while (c0 <= c1 && rows.every((r) => !r[c0])) c0++;
  while (c1 >= c0 && rows.every((r) => !r[c1])) c1--;
  const out: string[] = [];
  for (let r = r0; r <= r1; r++) out.push(rows[r].slice(c0, c1 + 1).map((x) => x ?? '.').join(','));
  return out.join('|');
}

export async function runCraft(parent: HTMLElement, spec: CraftSpec): Promise<void> {
  if (auto.on) { auto.log.push(`CRAFT ${spec.result}`); await sleep(1); return; }
  const target: (string | null)[] = spec.recipe.join('').split('').map((ch) => (ch === '.' ? null : spec.key[ch]));
  const want = normalize(target);
  // inventory counts
  const inv = new Map<string, number>();
  for (const it of target) if (it) inv.set(it, (inv.get(it) ?? 0) + 1);
  for (const x of spec.extras ?? []) inv.set(x, (inv.get(x) ?? 0) + 1);
  const grid: (string | null)[] = Array(9).fill(null);
  let selected: string | null = null;

  const wrap = document.createElement('div');
  wrap.className = 'craft';
  wrap.innerHTML = `<div class="craft-panel"><div class="craft-title"></div><div class="craft-body"><div class="craft-grid"></div><div class="craft-arrow">➜</div><div class="craft-out"></div></div><div class="craft-hint"></div><div class="craft-inv"></div><div class="craft-actions"><button class="craft-clear">Clear</button><button class="craft-help">Hint</button></div></div>`;
  parent.appendChild(wrap);
  wrap.querySelector('.craft-title')!.textContent = spec.title;
  const hintEl = wrap.querySelector('.craft-hint') as HTMLDivElement;
  hintEl.textContent = spec.hint;
  const gridEl = wrap.querySelector('.craft-grid') as HTMLDivElement;
  const invEl = wrap.querySelector('.craft-inv') as HTMLDivElement;
  const outEl = wrap.querySelector('.craft-out') as HTMLDivElement;

  return new Promise((resolve) => {
    let solved = false;
    const cells: HTMLButtonElement[] = [];
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('button');
      c.className = 'craft-cell';
      c.addEventListener('click', (e) => {
        e.stopPropagation();
        if (solved) return;
        if (grid[i]) { inv.set(grid[i]!, (inv.get(grid[i]!) ?? 0) + 1); grid[i] = null; audio.sfx('tick'); }
        else if (selected && (inv.get(selected) ?? 0) > 0) { grid[i] = selected; inv.set(selected, inv.get(selected)! - 1); audio.sfx('place'); if (!inv.get(selected)) selected = null; }
        render();
      });
      gridEl.appendChild(c);
      cells.push(c);
    }
    const render = () => {
      cells.forEach((c, i) => {
        c.innerHTML = '';
        if (grid[i]) c.appendChild(itemIcon(grid[i]!, 40).cloneNode(true) as HTMLCanvasElement), (c.lastChild as HTMLCanvasElement).getContext('2d')!.drawImage(itemIcon(grid[i]!, 40), 0, 0);
      });
      invEl.innerHTML = '';
      for (const [id, n] of inv) {
        const b = document.createElement('button');
        b.className = 'craft-item' + (selected === id ? ' sel' : '') + (n <= 0 ? ' empty' : '');
        const ic = itemIcon(id, 40);
        const cv = ic.cloneNode(true) as HTMLCanvasElement;
        cv.getContext('2d')!.drawImage(ic, 0, 0);
        b.appendChild(cv);
        const lab = document.createElement('span');
        lab.textContent = `${itemDef(id).name} ×${n}`;
        b.appendChild(lab);
        b.addEventListener('click', (e) => { e.stopPropagation(); if (n > 0) { selected = id; audio.sfx('hover'); render(); } });
        invEl.appendChild(b);
      }
      outEl.innerHTML = '';
      if (normalize(grid) === want) {
        solved = true;
        const ic = itemIcon(spec.result, 56);
        const cv = ic.cloneNode(true) as HTMLCanvasElement;
        cv.getContext('2d')!.drawImage(ic, 0, 0);
        outEl.appendChild(cv);
        outEl.classList.add('ready');
        audio.sfx('craft');
        hintEl.textContent = `${itemDef(spec.result).name} crafted!`;
        setTimeout(() => { wrap.classList.add('out'); setTimeout(() => { wrap.remove(); resolve(); }, 350); }, 1100);
      }
    };
    let hintLevel = 0;
    (wrap.querySelector('.craft-clear') as HTMLButtonElement).addEventListener('click', (e) => {
      e.stopPropagation();
      if (solved) return;
      for (let i = 0; i < 9; i++) if (grid[i]) { inv.set(grid[i]!, (inv.get(grid[i]!) ?? 0) + 1); grid[i] = null; }
      render();
    });
    (wrap.querySelector('.craft-help') as HTMLButtonElement).addEventListener('click', (e) => {
      e.stopPropagation();
      if (solved) return;
      hintLevel++;
      if (hintLevel === 1) {
        // show ghost of the recipe
        cells.forEach((c, i) => c.classList.toggle('ghost', !!target[i]));
        hintEl.textContent = spec.hint + ' (Highlighted cells need an item.)';
      } else {
        // fill it in
        for (let i = 0; i < 9; i++) if (grid[i]) { inv.set(grid[i]!, (inv.get(grid[i]!) ?? 0) + 1); grid[i] = null; }
        for (let i = 0; i < 9; i++) if (target[i]) { grid[i] = target[i]; inv.set(target[i]!, inv.get(target[i]!)! - 1); }
        render();
      }
    });
    // select first item by default
    selected = [...inv.keys()][0] ?? null;
    render();
  });
}
