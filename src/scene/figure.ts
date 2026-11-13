// The person at the desk. Drawn in scene coordinates, seated side-on: hip on a
// stool, feet planted, hands on the keyboard. The upper body rides on the hip,
// so leaning and breathing come from the pose instead of a free sine.
import { el, pen, shape, blot, paint, limb, solid, joint, shoe, f, PAPER } from '../ink/ink.ts';
import type { Limb, Vec } from '../ink/ink.ts';
import { spring } from '../ink/motion.ts';
import { ACCENT, ease, lerp, wobble } from './kit.ts';

const HIP: Vec = [100, 384];
const SHOULDER: Vec = [116, 334];
const KNEE: Vec = [150, 392];
const ANKLE: Vec = [154, 432];
const HEAD: Vec = [124, 313];
const HAND_NEAR: Vec = [180, 356];
const HAND_FAR: Vec = [166, 352];

export type FigureMode = 'idle' | 'typing' | 'reading';

export interface Figure {
  g: SVGGElement;
  hit: SVGRectElement;
  draw(t: number, dt: number, mode: FigureMode, wind: number): void;
  poke(): void;
}

export function createFigure(parent: Element): Figure {
  const g = el('g', { style: 'cursor:pointer' }, parent);

  // --- stool
  const stool = shape(g, 1.9);
  stool.setAttribute('d', 'M60 390 L124 390 L121 397 L63 397Z');
  pen(g, 1.9).setAttribute('d', 'M68 397 L64 440 M116 397 L120 440 M67 416 L117 416');

  // --- far leg: one stroke behind the near one, so the pair reads as two legs
  const farLeg = pen(g, 1.9);
  farLeg.setAttribute('d', `M${HIP[0] - 7} ${HIP[1]} L${KNEE[0] - 7} ${KNEE[1] + 1} L${ANKLE[0] - 7} ${ANKLE[1]}`);
  const farShoe = blot(g);
  shoe(farShoe, [ANKLE[0] - 7, ANKLE[1]], 0);

  // --- near leg: an open double stroke
  const nearLeg = solid(limb(g, 7.8), 'currentColor');
  nearLeg.draw([HIP, KNEE, ANKLE], [0.4, 1.0]);
  const nearShoe = blot(g);
  shoe(nearShoe, ANKLE, 0);

  // --- the upper body rides on this group (lean, breath)
  const upper = el('g', {}, g);
  const farArm = limb(upper, 5.8);
  const coat = paint(upper, ACCENT, 2.2);
  const fold = pen(upper, 1);
  const collar = pen(upper, 1.2);
  const neck = limb(upper, 4.8);
  const headG = el('g', {}, upper);
  const bun = blot(headG);
  const head = el('ellipse', { rx: 9.2, ry: 11, fill: PAPER, stroke: 'currentColor', 'stroke-width': 2.1 }, headG);
  const hair = blot(headG);
  const strand = pen(headG, 0.9);
  const nearArm = limb(upper, 6.2);
  const handFar = el('ellipse', { rx: 2.1, ry: 1.7, fill: 'currentColor' }, upper);
  const handNear = el('ellipse', { rx: 2.2, ry: 1.8, fill: 'currentColor' }, upper);

  const tap = [spring(190, 15), spring(190, 15), spring(190, 15), spring(190, 15)];
  const strandS = spring(30, 3.4);
  let stretchT = -1;

  const hit = el('rect', { x: 40, y: 274, width: 190, height: 176, fill: 'transparent' }, g);
  el('title', {}, hit).textContent = 'Say hello';

  return {
    g,
    hit,
    poke() {
      if (stretchT < 0) stretchT = 0;
    },
    draw(t, dt, mode, wind) {
      // a stretch: lean back, arm up, hold, back to the keyboard
      let stretch = 0;
      if (stretchT >= 0) {
        stretchT += dt;
        stretch = stretchT < 0.5 ? ease(stretchT / 0.5) : stretchT < 1.7 ? 1 : 1 - ease((stretchT - 1.7) / 0.6);
        if (stretchT > 2.3) stretchT = -1;
      }

      const breathe = wobble(t * 0.55) * 0.9;
      const lean = (mode === 'typing' ? 1.2 : mode === 'reading' ? -3 : -1.4) - stretch * 5.5;
      const turn = mode === 'reading' ? -5 : 0;

      upper.setAttribute(
        'transform',
        `translate(${f(HIP[0])} ${f(HIP[1])}) rotate(${f(lean)} 0 0) translate(${f(-HIP[0])} ${f(-HIP[1])}) translate(0 ${f(breathe * 0.35)})`,
      );

      // coat: shoulders, a leaning chest, a hem that pools on the seat
      coat.setAttribute('d', 'M101 342 Q103 331 113 329 Q121 327 125 336 Q119 353 116 374 Q115 382 112 384 Q100 388 90 384 Q95 364 101 342Z');
      fold.setAttribute('d', 'M108 345 Q103 364 101 382 M101 342 Q106 334 114 332');
      collar.setAttribute('d', 'M108 331 Q113 337 118 331');

      // neck + head
      neck.draw([[114, 332], [119, 323]], [0.2, 0.3]);
      headG.setAttribute('transform', `translate(${f(HEAD[0])} ${f(HEAD[1])}) rotate(${f(turn + breathe * 0.5)} 0 6)`);
      head.setAttribute('cx', 0);
      head.setAttribute('cy', 0);
      // hair: a cap over the crown, a bun at the back
      hair.setAttribute('d', 'M-9.2 -2 A9.2 11 0 0 1 9.2 -2 Q4 -6 -0.5 -5.2 Q-5 -4.4 -9.2 -2Z');
      bun.setAttribute('d', 'M-11.4 -6.4 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0Z');
      const sway = strandS.step(-wind * 5 - lean * 0.5 + wobble(t * 1.7) * 1.1, dt);
      strand.setAttribute('d', `M${f(-8.6)} ${f(-4.6)} Q${f(-12.4 + sway * 0.4)} ${f(-0.6)} ${f(-10.4 + sway)} ${f(4.6 + Math.abs(sway) * 0.2)}`);

      // arms: hands on the keyboard, tapping while the model writes
      const tapY = (i: number): number => (mode === 'typing' ? -Math.abs(Math.sin(t * 7.5 + i * 1.7)) * 1.6 : 0);
      const shoulderN: Vec = [SHOULDER[0] + 2, SHOULDER[1] + 2];
      const shoulderF: Vec = [SHOULDER[0] - 6, SHOULDER[1] + 4];
      tap.forEach((s, i) => s.step(tapY(i), dt));

      const handN: Vec = [HAND_NEAR[0] + stretch * 4, lerp(HAND_NEAR[1] + tap[2].x, HAND_FAR[1] - 38, stretch)];
      const handF: Vec = [HAND_FAR[0] + 3 + stretch * 2, lerp(HAND_FAR[1] + tap[1].x, HAND_FAR[1] - 28, stretch)];
      const arm = (sh: Vec, hand: Vec, node: Limb): void => {
        const l1 = 34, l2 = 31;
        const dist = Math.hypot(hand[0] - sh[0], hand[1] - sh[1]);
        const k = dist > l1 + l2 - 0.5 ? (l1 + l2 - 0.5) / dist : 1;
        const target: Vec = [sh[0] + (hand[0] - sh[0]) * k, sh[1] + (hand[1] - sh[1]) * k];
        const elbow = joint(sh, target, l1, l2, -1);
        node.draw([sh, [elbow[0], elbow[1] + 2], target], [0.3, 0.7]);
      };
      arm(shoulderF, handF, farArm);
      arm(shoulderN, handN, nearArm);
      handFar.setAttribute('cx', f(handF[0]));
      handFar.setAttribute('cy', f(handF[1]));
      handNear.setAttribute('cx', f(handN[0]));
      handNear.setAttribute('cy', f(handN[1]));
    },
  };
}
