# Ann Sharon Bacchus, Notary Public

Single-page site for Ann Sharon Bacchus's Brooklyn notary practice (and her real estate work with EXIT Realty Island Elite). All content comes from `raw messy data/`; facts live in one place, `src/lib/site.ts`.

```sh
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # Playwright: assets, scrubbing, reduced motion, no-JS, mobile, axe
```

## The film

The intro is a scroll-driven scene: a stamp comes down on an affidavit, presses, and lifts off the seal. The page scrolls natively; `SealFilm.tsx` eases scroll position onto the timeline and choreographs the copy around it.

**Live (default).** Where WebGL2 is available, the scene is rendered in real time (`src/stage/`), so every display refresh draws the exact moment for the exact scroll position: smooth at 60, 120 or 144 Hz however slowly you scroll. three.js and the textures load after first paint; the poster shows until the first frame is ready.

- `src/stage/build.js` builds the scene and its timeline. It is shared with the baker, so the live scene and the baked lighting always match.
- Static surfaces (desk, leather pad, paper) use lightmaps baked offline: soft lamp light, contact shadows and ambient occlusion from 512 jittered samples. The stamp, pen and journal are lit live, and the stamp's shadow softens as it rises.
- A resolution governor steps the pixel ratio down if frames run long; if a device still can't keep up, the page switches to the clip.

Re-bake after changing the scene or lighting:

```sh
npm run stage:bake   # writes public/stage/*.webp and manifest.json
```

**Fallback clip.** Devices without WebGL2, or too slow for the live render, get a pre-rendered clip scrubbed by scroll: `public/media/seal-wide-2560.mp4`, `seal-wide.mp4` and `seal-tall.mp4`. Reduced-motion and no-JS visitors see the static poster (`seal-*-0000.webp`, `seal-*-0239.webp`) with all content readable.

The clip is rendered from `footage/scene.js`, an offline accumulation renderer (128 samples per frame: thin-lens depth of field, soft shadows, ambient occlusion) at 3840×2160 and downsampled:

```sh
npm run footage:wide -- --out footage/frames-wide
npm run footage:tall -- --out footage/frames-tall
enc() { ffmpeg -framerate 30 -i "$1/f%04d.png" -vf "scale=$2:flags=lanczos,unsharp=5:5:0.35:5:5:0,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slower -crf "$3" -g 8 -keyint_min 8 -sc_threshold 0 -bf 0 \
  -x264-params aq-mode=3:psy-rd=1.0 -movflags +faststart -an "$4"; }
enc footage/frames-wide 2560:1440 20 public/media/seal-wide-2560.mp4
enc footage/frames-wide 1920:1080 20 public/media/seal-wide.mp4
enc footage/frames-tall 1080:1920 22 public/media/seal-tall.mp4
```

## Other moving parts

- `Guilloche.tsx`: WebGL guilloché rosette behind the contact section; all geometry computed in the vertex shader, paused off-screen.
- `Route.tsx`: the "I come to you" route that draws as you scroll.
- `InView.tsx`: draws the service checkmarks once.
