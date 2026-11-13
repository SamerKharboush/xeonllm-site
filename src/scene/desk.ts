// Everything on and around the desk: floor, rug, the desk itself, the keyboard,
// the machine, a shelf of model crates, a plant, a mug, a clock, dust in the air.
import { el, pen, shape, paint, f } from '../ink/ink.ts';
import type { Vec } from '../ink/ink.ts';
import {
  DESK, DP, FLOOR, INDIGO, W, WARM,
  clamp, lerp, oval, rect, roundRect, seeded, smooth, wobble,
} from './kit.ts';

export interface Desk {
  g: SVGGElement;
  /** the machine's front panel, for hit-testing */
  hit: SVGRectElement;
  /** where a model crate leaves the shelf and enters the machine */
  readonly slot: Vec;
  readonly shelf: Vec;
  draw(t: number, dt: number, loadU: number, running: number, wind: number, inMachine: boolean): void;
}

const M = { x0: 390, x1: 510, y0: 286, y1: DESK };
const SHELF = { x0: 356, x1: 542, y: 140 };

export function buildDesk(parent: Element, glow: Element): Desk {
  const g = el('g', {}, parent);

  // ---------------------------------------------------------------- floor
  pen(g, 1.8).setAttribute('d', `M0 ${FLOOR} L${W} ${FLOOR} M0 ${FLOOR + 4} L${W} ${FLOOR + 4}`);

  // ---------------------------------------------------------------- desk
  const top = shape(g, 2.4);
  top.setAttribute('d', roundRect(138, DESK, 604, DESK + 12, 3));
  pen(g, 1.1).setAttribute('d', `M146 ${DESK + 8} L596 ${DESK + 8}`);
  shape(g, 2.1).setAttribute('d', 'M152 377 L163 377 L158 440 L148 440Z M581 377 L592 377 L596 440 L586 440Z');
  pen(g, 1.4).setAttribute('d', 'M158 424 L586 424');

  // ---------------------------------------------------------------- keyboard + mouse
  const kb = shape(g, 1.5);
  kb.setAttribute('d', roundRect(158, DESK - 6, 288, DESK, 2));
  const keys: string[] = [];
  for (let c = 0; c < 13; c++) {
    const x = 165 + c * 9.2;
    keys.push(`M${f(x)} ${DESK - 5.2} l0 2.6`);
  }
  pen(g, 0.55).setAttribute('d', keys.join(' '));
  pen(g, 0.7).setAttribute('d', `M162 ${DESK - 3.4} L282 ${DESK - 3.4} M188 ${DESK - 1.4} L256 ${DESK - 1.4}`);
  const mouse = shape(g, 1.3);
  mouse.setAttribute('d', 'M298 360 q0 -6 5.2 -6 q5.2 0 5.2 6Z');

  // ---------------------------------------------------------------- machine
  const macG = el('g', { style: 'cursor:pointer' }, g);
  const body = shape(macG, 2.4);
  body.setAttribute('d', roundRect(M.x0, M.y0, M.x1, M.y1, 7));
  pen(macG, 1.15).setAttribute('d', `M${M.x0 + 9} ${M.y0 + 9} L${M.x1 - 9} ${M.y0 + 9}`);
  pen(macG, 1.3).setAttribute('d', `M${M.x0 + 30} ${M.y0 + 1} L${M.x1 - 30} ${M.y0 + 1}`);

  const fanC: Vec = [M.x0 + 44, M.y0 + 46];
  const rim = shape(macG, 1.4);
  rim.setAttribute('d', oval(fanC[0], fanC[1], 27, 27));
  const blades = pen(macG, 1.2);
  const hub = el('circle', { cx: f(fanC[0]), cy: f(fanC[1]), r: 3.2, fill: 'currentColor' }, macG);

  const vents: string[] = [];
  for (let i = 0; i < 5; i++) vents.push(`M${M.x1 - 26} ${M.y0 + 28 + i * 6} l16 0`);
  pen(macG, DP).setAttribute('d', vents.join(' '));
  pen(macG, 1.6).setAttribute('d', `M${M.x0 + 9} ${M.y1} l0 3 M${M.x1 - 9} ${M.y1} l0 3`);

  const led = el('circle', { cx: f(M.x0 + 15), cy: f(M.y0 + 16), r: 2.7, fill: 'currentColor', opacity: 0.25 }, macG);
  const ledGlow = el('circle', { cx: f(M.x0 + 15), cy: f(M.y0 + 16), r: 18, fill: 'url(#xl-warm)', opacity: 0 }, glow);
  const ledLight = el('circle', { cx: f(M.x0 + 15), cy: f(M.y0 + 16), r: 4.5, fill: WARM, opacity: 0 }, glow);

  const meter = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round' }, macG);
  pen(macG, 0.9, ).setAttribute('d', `M${fanC[0] - 34} ${M.y1 - 14} L${M.x1 - 15} ${M.y1 - 14}`);
  meter.setAttribute('d', `M${fanC[0] - 34} ${M.y1 - 14} l0 0`);

  const hit = el('rect', { x: M.x0, y: M.y0, width: M.x1 - M.x0, height: M.y1 - M.y0, fill: 'transparent' }, g);
  el('title', {}, hit).textContent = 'Load a model';
  hit.style.cursor = 'pointer';

  // ---------------------------------------------------------------- shelf + model crates
  const shelfG = el('g', {}, g);
  const shelfBoard = shape(shelfG, 2);
  shelfBoard.setAttribute('d', rect(SHELF.x0, SHELF.y, SHELF.x1, SHELF.y + 7));
  pen(shelfG, 1.1).setAttribute('d', `M${SHELF.x0 + 8} ${SHELF.y + 7} l-5 10 M${SHELF.x1 - 8} ${SHELF.y + 7} l5 10`);

  const crateDefs = [
    { label: '3B', w: 42, c: '#cfd3c2' },
    { label: '8B', w: 46, c: '#d3a24c' },
    { label: '35B', w: 54, c: '#c58a4a' },
  ];
  const crates: Array<{ g: SVGGElement; home: Vec }> = [];
  let cx = SHELF.x0 + 12;
  crateDefs.forEach((d) => {
    const cg = el('g', {}, shelfG);
    const bx = paint(cg, d.c, 1.6);
    bx.setAttribute('d', rect(0, 0, d.w, 32));
    pen(cg, 1).setAttribute('d', `M${d.w / 2} 1 L${d.w / 2} 31`);
    const label = el('text', {
      x: d.w / 2, y: 20, 'font-size': 13, 'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
      'text-anchor': 'middle', fill: 'currentColor',
    }, cg);
    label.textContent = d.label;
    cg.setAttribute('transform', `translate(${f(cx)} ${f(SHELF.y - 32)})`);
    crates.push({ g: cg, home: [cx, SHELF.y - 32] });
    cx += d.w + 10;
  });

  // ---------------------------------------------------------------- plant
  const plantG = el('g', {}, g);
  const pot = shape(plantG, 1.8);
  pot.setAttribute('d', 'M544 340 L590 340 L585 366 L549 366Z');
  pen(plantG, 1.1).setAttribute('d', 'M544 346 L590 346');
  const leaf = [0, 1, 2, 3, 4].map(() => pen(plantG, 1.6));
  const vein = [0, 1, 2, 3, 4].map(() => pen(plantG, 0.7));

  // ---------------------------------------------------------------- mug
  const mugG = el('g', {}, g);
  const mug = paint(mugG, INDIGO, 1.7);
  mug.setAttribute('d', 'M330 344 L362 344 L359 366 L333 366Z');
  pen(mugG, 1.5).setAttribute('d', 'M362 349 q9 3 0 11');
  pen(mugG, 0.7).setAttribute('d', 'M330 350 L362 350');
  const steam = [0, 1, 2].map(() => pen(mugG, 1));

  // ---------------------------------------------------------------- clock
  const clockG = el('g', {}, g);
  const rimC = shape(clockG, 2);
  rimC.setAttribute('d', oval(74, 116, 26, 26));
  const ticks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ticks.push(`M${f(74 + Math.sin(a) * 21)} ${f(116 - Math.cos(a) * 21)} L${f(74 + Math.sin(a) * 23.5)} ${f(116 - Math.cos(a) * 23.5)}`);
  }
  pen(clockG, 0.85).setAttribute('d', ticks.join(' '));
  const handH = pen(clockG, 1.5);
  const handM = pen(clockG, 1);
  el('circle', { cx: 74, cy: 116, r: 1.7, fill: 'currentColor' }, clockG);

  // ---------------------------------------------------------------- dust in the air
  const motes = Array.from({ length: 10 }, (_, i) => {
    const r = seeded(31 + i);
    return { n: el('circle', { r: f(0.9 + r(0, 1.1)), fill: 'currentColor', opacity: 0 }, g), x: r(60, 900), y: r(150, 400), ph: r(0, 6.28), sp: r(0.25, 0.7) };
  });

  const fan = { a: 0, v: 0 };

  return {
    g,
    hit,
    slot: [M.x0 + 46, M.y0 - 2],
    shelf: [crates[1].home[0] + 22, SHELF.y - 16],
    draw(t, dt, loadU, running, wind, inMachine) {
      // fan: slow at idle, loud while loading, settled at run speed
      const target = running > 0.5 ? 8.5 : loadU > 0 ? 26 * Math.sin(Math.PI * clamp(loadU, 0, 1)) + 4 : 0.7;
      fan.v = lerp(fan.v, target, Math.min(1, dt * 2.4));
      fan.a += fan.v * dt;
      const bl: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        bl.push(`M${f(fanC[0] + c * 4)} ${f(fanC[1] + s * 4)} Q${f(fanC[0] + c * 15 - s * 7)} ${f(fanC[1] + s * 15 + c * 7)} ${f(fanC[0] + c * 23 - s * 3)} ${f(fanC[1] + s * 23 + c * 3)}`);
      }
      blades.setAttribute('d', bl.join(' '));
      blades.setAttribute('transform', `rotate(${f((fan.a * 180) / Math.PI)} ${f(fanC[0])} ${f(fanC[1])})`);
      hub.setAttribute('r', f(3.2 + Math.sin(t * 2) * 0.15));

      // the machine knocks once as the weights land
      const shake = loadU > 0 ? Math.sin(2 * Math.PI * loadU * 7) * 1.8 * (1 - loadU) : 0;
      macG.setAttribute('transform', `translate(${f(shake)} 0)`);
      const lit = running > 0.5 ? 1 : loadU > 0 ? smooth(0, 0.12, loadU) : 0.16;
      led.setAttribute('opacity', f(0.22 + lit * 0.78));
      ledGlow.setAttribute('opacity', f(lit * 0.7));
      ledLight.setAttribute('opacity', f(lit * 0.5));
      const track = M.x1 - 15 - (fanC[0] - 34);
      const filled = loadU > 0 ? clamp(loadU * 1.12, 0, 1) : running > 0.5 ? 1 : 0.04;
      meter.setAttribute('d', `M${fanC[0] - 34} ${M.y1 - 14} l${f(track * filled)} 0`);

      // one crate rides over and goes in; the shelf is whole again afterwards
      crates.forEach((c, i) => {
        const home = c.home;
        // the 8B crate is the one that gets loaded: it leaves the shelf, goes in
        // the machine, and comes back on the shelf when the next model is picked
        if (i !== 1 || (loadU <= 0 && !inMachine)) {
          c.g.setAttribute('transform', `translate(${f(home[0])} ${f(home[1])})`);
          c.g.setAttribute('opacity', 1);
          return;
        }
        if (inMachine) {
          c.g.setAttribute('opacity', 0);
          return;
        }
        const u = clamp(loadU, 0, 1);
        const x = lerp(home[0], M.x0 + 50, smooth(0, 0.92, u)) + Math.sin(Math.PI * u) * 26;
        const y = lerp(home[1], M.y0 - 26, smooth(0.15, 1, u)) - Math.sin(Math.PI * u) * 20;
        c.g.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(Math.sin(u * Math.PI * 2) * 7 * (1 - u))} 22 16)`);
        c.g.setAttribute('opacity', f(1 - smooth(0.88, 1, u)));
      });

      // plant: leaves curve, and the pointer is wind
      const gust = wind * 6;
      leaf.forEach((n, i) => {
        const k = i / (leaf.length - 1);
        const bx = 566 + (i - 2) * 2;
        const sway = wobble(t * (0.7 + k * 0.35) + i) * 2.6 + gust * (1.4 + k * 1.4);
        const tipX = 566 + (i - 2) * 15 + sway * 1.4;
        const tipY = 308 - Math.abs(i - 1.4) * 7 + Math.sin(t * 1.1 + i) * 1.2 + k * 5;
        n.setAttribute('d', `M${f(bx)} 342 Q${f(bx + (i - 2) * 6)} ${f(320 - k * 6)} ${f(tipX)} ${f(tipY)}`);
        vein[i].setAttribute('d', `M${f(bx)} 340 Q${f(bx + (i - 2) * 4)} ${f(322 - k * 5)} ${f(lerp(bx, tipX, 0.55))} ${f(lerp(342, tipY, 0.55))}`);
      });

      // steam
      steam.forEach((n, i) => {
        const u = (t * 0.42 + i / 3) % 1;
        const y = 340 - u * 46;
        const x = 346 + Math.sin(u * 5 + i * 2.1) * (3 + u * 7) + wind * u * 6;
        n.setAttribute('d', `M${f(x)} ${f(y)} q${f(2.4 + Math.sin(u * 6) * 1.6)} -4 0.6 -8`);
        n.setAttribute('opacity', f(Math.sin(Math.PI * u) * 0.45));
      });

      // clock: a minute hand that sweeps, an hour hand that creeps
      const ma = ((t / 12) % 1) * Math.PI * 2;
      const ha = ((t / 720) % 1) * Math.PI * 2;
      handM.setAttribute('d', `M74 116 L${f(74 + Math.sin(ma) * 19)} ${f(116 - Math.cos(ma) * 19)}`);
      handH.setAttribute('d', `M74 116 L${f(74 + Math.sin(ha) * 12)} ${f(116 - Math.cos(ha) * 12)}`);

      // dust
      motes.forEach((m, i) => {
        const drift = (t * 4 * m.sp) % 60;
        const y = ((m.y - drift) % 300 + 300) % 300 + 120;
        m.n.setAttribute('cx', f(m.x + Math.sin(t * 0.4 + m.ph) * 12 + wind * 5));
        m.n.setAttribute('cy', f(y + Math.sin(t * m.sp + m.ph) * 8));
        m.n.setAttribute('opacity', f(0.05 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.3 + i))));
      });
    },
  };
}
