# XeonLLM — website

The marketing site for [XeonLLM](https://github.com/SamerKharboush/xeonllm), a native macOS app that
runs large language models on Intel Macs with AMD GPUs.

Live: <https://samerkharboush.github.io/xeonllm-site/>

## What is in here

- `index.html` — the page: hero, features, models, pricing, FAQ.
- `src/scene/` — the hero drawing, built with the [line-art animation](https://github.com/JDhruv14/line-art-animation)
  skill's ink library (`src/ink/`): one pen weight, paper fills, open-stroke limbs, a solved gait for
  anything that walks, springs for anything that hangs.
- `src/style.css` — ink-on-paper design tokens. The page background never changes; the drawing lives in
  a card.
- `.github/workflows/pages.yml` — builds and deploys to GitHub Pages on every push to `main`.

## Development

```sh
npm install
npm run dev        # http://localhost:5173/xeonllm-site/
npm run build      # typecheck + production build into dist/
npm run preview    # serve the built site
```

The hero drawing has two debug flags, from the ink library:

- `?debug` — no `requestAnimationFrame`; `window.__step(seconds)` advances in exact 1/60 s steps, so
  background tabs and headless capture see real motion.
- `?t=1.25` — freeze the drawing at one moment.
- `?zoom=4&x=130&y=360` — magnify one point of the drawing, to check a pose or a line.

`npm run capture -- <url> <outDir> <frames> <fps> [w] [h] [setupJs] [frameJs]` writes PNG frames from
headless Chrome (needs a Chrome/Chromium, or set `CHROME`).

## Licence

GPL-3.0-or-later, the same as the app. The ink library under `src/ink/` comes from the line-art
animation skill (MIT).
