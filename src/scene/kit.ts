// Shared constants and small helpers for the XeonLLM desk scene.
// Everything is drawn in scene coordinates: one pen weight, one paper, one accent.

// setAttribute here takes numbers as well as strings — the DOM stringifies them.
declare global {
  interface Element {
    setAttribute(qualifiedName: string, value: string | number): void;
  }
}

export const W = 960;
export const H = 520;

export const FLOOR = 440;        // floor line
export const DESK = 366;         // desk surface (top edge)
export const SP = 2.2;           // scene pen (a figure here is ~190 tall)
export const DP = 0.95;          // detail pen: vents, tiles, key ticks

export const INK = '#1c1c1c';
export const PAPER = '#fdfcf8';
export const ACCENT = '#b3412d'; // the one flat accent (sweater, LED)
export const INDIGO = '#34507a'; // second accent, small props only
export const WARM = '#f0a24e';   // lamp / LED light

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const ease = (t: number): number => smooth(0, 1, t);
export const wobble = (t: number, k = 1): number =>
  Math.sin(t * 1.3 * k) * 0.6 + Math.sin(t * 2.7 * k + 1.7) * 0.3 + Math.sin(t * 5.1 * k + 4.1) * 0.1;

/** Seeded random: the static drawing is identical on every load. */
export function seeded(seed = 11): (a?: number, b?: number) => number {
  let s = seed;
  return (a = 0, b = 1) => {
    s = (s * 16807) % 2147483647;
    return a + ((s - 1) / 2147483646) * (b - a);
  };
}

export const hex = (h: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
export const rgb = (c: readonly number[]): string => `rgb(${c.map((v) => Math.round(v)).join(',')})`;
export const mix = (a: readonly number[], b: readonly number[], t: number): number[] =>
  a.map((v, i) => v + (b[i] - v) * t);

/** Closed ellipse as a path (so it can be paper-filled and pen-stroked). */
export const oval = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${(cx - rx).toFixed(2)} ${cy.toFixed(2)} a${rx} ${ry} 0 1 0 ${(2 * rx).toFixed(2)} 0 a${rx} ${ry} 0 1 0 ${(-2 * rx).toFixed(2)} 0Z`;

export const rect = (x0: number, y0: number, x1: number, y1: number): string =>
  `M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} L${x0} ${y1}Z`;

/** Rounded rect path. */
export function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): string {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  return `M${x0 + rr} ${y0} L${x1 - rr} ${y0} Q${x1} ${y0} ${x1} ${y0 + rr} L${x1} ${y1 - rr} Q${x1} ${y1} ${x1 - rr} ${y1} L${x0 + rr} ${y1} Q${x0} ${y1} ${x0} ${y1 - rr} L${x0} ${y0 + rr} Q${x0} ${y0} ${x0 + rr} ${y0}Z`;
}
