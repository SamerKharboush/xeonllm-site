// The hero card: a desk, a person, a machine that loads a model and writes.
//
//   const hero = createHero(document.querySelector('#hero-stage'));
//   hero.start();     // rAF loop (or window.__step with ?debug)
//
// The cycle: idle → loading (a model crate goes in, the fan spins up) → writing
// (tokens arrive, the page fills) → done (read) → idle.
import { el, inkDefs, run, f } from '../ink/ink.ts';
import { pointerWind } from '../ink/motion.ts';
import { H, PAPER, W, clamp, smooth } from './kit.ts';
import { buildDesk } from './desk.ts';
import { createFigure } from './figure.ts';
import type { FigureMode } from './figure.ts';
import { createTokens } from './tokens.ts';
import type { Phase } from './tokens.ts';

const CYCLE: Record<Phase, number> = { idle: 2.6, loading: 2.4, writing: 7.5, done: 3.4 };

export interface Hero {
  svg: SVGSVGElement;
  start(): void;
}

declare global {
  interface Window {
    /** set by run(?debug); used by scripts/capture.ts for exact stepping */
    __step?: (seconds?: number) => number;
    __hero?: {
      phase: () => Phase;
      jump: (p: Phase) => void;
      draw: (t: number, dt: number) => void;
      stop: () => void;
    };
  }
}

export function createHero(mount: Element): Hero {
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'hero-svg',
    role: 'img',
    'aria-label': 'An ink drawing of a person at a desk: a model slides into the machine, the fan spins up, and the answer is written out in ink.',
  });
  const ink = inkDefs(svg, 'xl');
  // a warm light for the machine LED
  const grad = el('radialGradient', { id: 'xl-warm' }, ink.defs);
  el('stop', { offset: 0, 'stop-color': '#fff1c2', 'stop-opacity': 0.9 }, grad);
  el('stop', { offset: 1, 'stop-color': '#ffd58a', 'stop-opacity': 0 }, grad);

  mount.appendChild(svg);

  const scene = el('g', { filter: ink.filter }, svg);
  const desk = buildDesk(scene, el('g', { style: 'mix-blend-mode:screen;pointer-events:none' }, svg));
  const tokens = createTokens(scene);
  const figure = createFigure(scene);

  const wind = pointerWind(svg, 0.25);
  let phase: Phase = 'idle';
  let pt = 0;

  const onMachine = (): void => {
    phase = 'loading';
    pt = 0;
  };
  desk.hit.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    onMachine();
  });
  desk.hit.style.cursor = 'pointer';
  figure.hit.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    figure.poke();
  });

  const draw = (t: number, dt: number): void => {
    wind.step(t);
    pt += dt;
    if (pt >= CYCLE[phase]) {
      pt = 0;
      phase = phase === 'idle' ? 'loading' : phase === 'loading' ? 'writing' : phase === 'writing' ? 'done' : 'idle';
    }

    const fresh = pt === 0 || dt === 0 ? 1 : 0;
    const u = clamp(pt / CYCLE[phase], 0, 1);
    const loading = phase === 'loading';
    const running = phase === 'writing' || phase === 'done';
    const mode: FigureMode = phase === 'writing' ? 'typing' : phase === 'done' ? 'reading' : 'idle';

    desk.draw(t, dt, loading ? u : 0, running ? 1 : 0, wind.value, phase === 'writing' || phase === 'done');
    tokens.draw(t, dt, phase, u, wind.value, fresh);
    figure.draw(t, dt, mode, wind.value);

    // idle keeps a faint earlier answer on the page; a new phase starts clean
    tokens.g.setAttribute('opacity', f(phase === 'idle' ? 0.16 : 1));
    void smooth;
  };

  return {
    svg,
    start() {
      const stop = run(draw);
      window.__hero = { phase: () => phase, jump: (p: Phase) => { phase = p; pt = 0; }, draw, stop };
    },
  };
}
