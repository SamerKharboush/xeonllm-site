// The token stream: while the model writes, an ink line runs from the machine to
// the page and the words appear glyph by glyph. No UI — the writing is the readout.
import { el, f, pen } from '../ink/ink.ts';
import { ACCENT, clamp, ease, lerp, seeded, smooth } from './kit.ts';

export type Phase = 'idle' | 'loading' | 'writing' | 'done';

export interface Tokens {
  g: SVGGElement;
  /** `fresh` is 1 on the frame the phase changed: nothing carries over, nothing fades. */
  draw(t: number, dt: number, phase: Phase, u: number, wind: number, fresh: number): void;
}

const X0 = 664;
const X1 = 902;
const BASE1 = 258;
const BASE2 = 300;
const GLYPH_H = 19;

interface Glyph {
  d: string;
  len: number;
}

/** One line of invented handwriting: glyph strokes on a baseline, seeded so it never changes. */
function buildLine(seed: number, x0: number, x1: number, base: number, count: number): Glyph[] {
  const r = seeded(seed);
  const out: Glyph[] = [];
  const span = (x1 - x0) / count;
  for (let i = 0; i < count; i++) {
    const x = x0 + i * span + r(-0.8, 0.8);
    const h = GLYPH_H * r(0.7, 1.05);
    const kind = Math.floor(r(0, 7));
    const w = span * r(0.5, 0.78);
    const y = base;
    let d: string;
    if (kind === 0) {
      d = `M${f(x)} ${f(y)} L${f(x + r(-1, 1))} ${f(y - h)} M${f(x)} ${f(y - h * 0.55)} q${f(w * 0.5)} ${f(-h * 0.3)} ${f(w)} 0`;
    } else if (kind === 1) {
      d = `M${f(x)} ${f(y)} q0 ${f(-h * 0.9)} ${f(w * 0.5)} ${f(-h * 0.85)} q${f(w * 0.5)} 0 ${f(w * 0.5)} ${f(h * 0.85)}`;
    } else if (kind === 2) {
      d = `M${f(x)} ${f(y - h * 0.8)} q${f(w * 0.55)} ${f(h * 0.2)} ${f(w * 0.4)} ${f(h * 0.8)} q${f(-w * 0.1)} ${f(h * 0.5)} ${f(-w * 0.35)} ${f(h * 0.2)}`;
    } else if (kind === 3) {
      d = `M${f(x)} ${f(y - h * 0.9)} L${f(x + w * 0.7)} ${f(y - h * 0.9)} M${f(x + w * 0.35)} ${f(y - h)} L${f(x + w * 0.3)} ${f(y)}`;
    } else if (kind === 4) {
      d = `M${f(x)} ${f(y - h * 0.5)} q${f(w * 0.25)} ${f(-h * 0.45)} ${f(w * 0.5)} 0 q${f(w * 0.25)} ${f(h * 0.45)} ${f(w * 0.5)} 0`;
    } else if (kind === 5) {
      // a bowl with a stem
      d = `M${f(x)} ${f(y - h)} L${f(x)} ${f(y)} M${f(x)} ${f(y - h * 0.7)} q${f(w)} ${f(h * 0.2)} ${f(w * 0.2)} ${f(h * 0.7)}`;
    } else {
      // a stem with a foot
      d = `M${f(x)} ${f(y - h)} L${f(x + r(-1.4, 1.4))} ${f(y)} q${f(w * 0.3)} ${f(1.5)} ${f(w * 0.6)} 0`;
    }
    out.push({ d, len: Math.max(10, w * 2.6) });
  }
  return out;
}

export function createTokens(parent: Element): Tokens {
  const g = el('g', {}, parent);

  // the board on the wall: what the machine writes on
  el('path', {
    d: 'M636 190 L912 190 L912 342 L636 342Z',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linejoin': 'round',
  }, g);
  [656, 892].forEach((x) => el('circle', { cx: x, cy: 196, r: 2.2, fill: 'currentColor' }, g));
  const rules = pen(g, 0.55);
  rules.setAttribute('d', `M650 ${BASE1 + 18} L900 ${BASE1 + 18} M650 ${BASE2 + 18} L${X0 + (X1 - X0) * 0.6} ${BASE2 + 18}`);

  const lines = [
    { glyphs: buildLine(7, X0, X1, BASE1, 16), x1: X1, base: BASE1 },
    { glyphs: buildLine(23, X0, X0 + (X1 - X0) * 0.72, BASE2, 11), x1: X0 + (X1 - X0) * 0.72, base: BASE2 },
  ];

  const nodes = lines.map((ln) =>
    ln.glyphs.map((gl) => {
      const n = el('path', {
        d: gl.d,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': `${f(gl.len)} ${f(gl.len)}`,
        'stroke-dashoffset': f(gl.len),
      }, g);
      return n;
    }),
  );

  const dot = el('circle', { cx: f(X1 + 8), cy: f(BASE1 - 3), r: 2.1, fill: 'currentColor', opacity: 0 }, g);


  const caret = el('path', { d: 'M0 0 l0 -24', fill: 'none', stroke: ACCENT, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0 }, g);

  const flow = el('path', {
    d: 'M512 322 Q568 312 620 292 Q648 282 660 268',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.2,
  }, g);
  const sparks = [0, 1, 2].map(() => el('circle', { r: 1.9, fill: ACCENT, opacity: 0 }, g));

  return {
    g,
    draw(t, dt, phase, u, wind, fresh) {
      const write = phase === 'writing';
      const done = phase === 'done';

      // how much of each line exists
      const shown = lines.map((ln, li) => {
        const n = ln.glyphs.length;
        if (write) {
          const local = li === 0 ? clamp(u / 0.7, 0, 1) : clamp((u - 0.72) / 0.28, 0, 1);
          return Math.min(n, Math.floor(local * (n + 1)));
        }
        return done ? n : 0;
      });

      lines.forEach((ln, li) => {
        nodes[li].forEach((n, i) => {
          const len = ln.glyphs[i].len;
          let cur = Number(n.getAttribute('stroke-dashoffset'));
          // a phase change starts a clean sheet
          if (fresh && i >= shown[li]) cur = len;
          if (i < shown[li]) {
            n.setAttribute('stroke-dashoffset', f(fresh ? len : Math.max(0, cur - dt * len * 5.5)));
            n.setAttribute('opacity', 1);
          } else {
            n.setAttribute('stroke-dashoffset', f(len));
            n.setAttribute('opacity', 0);
          }
        });
      });

      dot.setAttribute('opacity', f(done ? 1 : shown[0] >= lines[0].glyphs.length ? smooth(0.62, 0.72, u) : 0));

      // the caret rides the end of whichever line is being written
      const second = shown[1] > 0 && shown[1] < lines[1].glyphs.length;
      const ln = lines[second ? 1 : 0];
      const n = shown[second ? 1 : 0];
      const x = lerp(ln.glyphs[0] ? X0 : X0, ln.x1, n / ln.glyphs.length);
      const wob = Math.sin(t * 9) * 0.7 + wind * 1.4;
      caret.setAttribute('d', `M${f(x + 4 + wob)} ${f(ln.base + 5)} l0 -25`);
      caret.setAttribute('opacity', f(write ? 0.5 + 0.35 * Math.sin(t * 6) : 0));

      // ink arriving at the page
      flow.setAttribute('opacity', write ? 0.2 : 0.08);
      const dash = 14;
      flow.setAttribute('stroke-dasharray', `${dash} ${dash}`);
      flow.setAttribute('stroke-dashoffset', f(-((t * 52) % (dash * 2))));
      sparks.forEach((s, i) => {
        const v = (t * 0.9 + i / 3) % 1;
        s.setAttribute('cx', f(lerp(516, 658, v) + Math.sin(v * 6 + i) * 2));
        s.setAttribute('cy', f(lerp(320, 270, ease(v)) + Math.sin(v * 9 + i) * 2));
        s.setAttribute('opacity', f(write ? Math.sin(Math.PI * v) * 0.8 : 0));
      });
    },
  };
}
