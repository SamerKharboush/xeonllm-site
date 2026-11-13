// Page wiring: the hero drawing, plus small drawn icons for the feature cards.
import './style.css';
import { createHero } from './scene/hero.ts';

const stage = document.querySelector<HTMLElement>('#hero-stage');
if (stage) {
  const hero = createHero(stage);
  hero.start();

  // ?zoom=3&x=130&y=360 — magnify one point of the drawing, for checking a pose
  const q = new URLSearchParams(location.search);
  if (q.has('zoom')) {
    const z = Number(q.get('zoom')) || 2;
    const x = Number(q.get('x')) || 480;
    const y = Number(q.get('y')) || 260;
    stage.style.overflow = 'hidden';
    hero.svg.style.transformOrigin = `${(x / 960) * 100}% ${(y / 520) * 100}%`;
    hero.svg.style.transform = `scale(${z})`;
  }
}

// --- feature icons: one pen, 1.6 stroke, 34×34
const ICONS: Record<string, string> = {
  chat: 'M6 8h22v14H14l-6 5v-5H6z M11 13h12 M11 17h8',
  models: 'M5 12l12-6 12 6-12 6z M5 12v9l12 6 12-6v-9 M17 18v9',
  agent: 'M17 5v6 M8 11h18v12H8z M12 15h2 M20 15h2 M12 23v4 M22 23v4',
  server: 'M5 7h24v8H5z M5 19h24v8H5z M9 11h.1 M9 23h.1 M20 11h5 M20 23h5',
  gpu: 'M6 10h22v14H6z M11 15h12v6H11z M10 24v4 M17 24v4 M24 24v4',
  bench: 'M5 27h24 M8 27V9 M8 9l16 4 M8 27l6-8 4 4 8-11',
};

document.querySelectorAll<HTMLElement>('.ico').forEach((node) => {
  const d = ICONS[node.dataset.ico ?? ''];
  if (!d) return;
  node.innerHTML = `<svg viewBox="0 0 34 34" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
});
