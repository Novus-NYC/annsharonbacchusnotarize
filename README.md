# Ann Sharon Bacchus, Notary Public

Single-page site for Ann Sharon Bacchus's Brooklyn notary practice (and her real estate work with EXIT Realty Island Elite). All content comes from `raw messy data/`; facts live in one place, `src/lib/site.ts`.

```sh
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # Playwright: assets, scrubbing, reduced motion, no-JS, mobile, axe
```

## The film

The intro is a scroll-scrubbed clip: a stamp comes down on an affidavit, presses, and lifts off the seal. The page scrolls natively; `SealFilm.tsx` eases scroll position onto the clip's timeline and choreographs the copy around it.

- `public/media/seal-wide.mp4` (1920×1080) and `seal-tall.mp4` (900×1600, art-directed for phones). A keyframe every 6 frames keeps seeks frame-accurate and cheap. The clip is fetched whole as a blob so seeking never waits on the network.
- Posters (`seal-*-0000.webp`, `seal-*-0239.webp`) paint instantly and are what reduced-motion and no-JS visitors see.
- Motion only switches on when `html.motion` is set (JS present, no reduced-motion preference). Everything is readable without it.

The footage is rendered from `footage/`, a Three.js scene drawn offline in headless Chrome. Each frame averages 128 samples with a jittered lens (thin-lens depth of field), lamp (soft shadows) and sky direction (ambient occlusion and contact shadows), rendered at 2560×1440 and downsampled. To re-render and re-encode:

```sh
npm run footage:wide -- --out footage/frames-wide
npm run footage:tall -- --out footage/frames-tall
ffmpeg -framerate 30 -i footage/frames-wide/f%04d.png -vf "scale=1920:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slower -crf 21 -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart -an public/media/seal-wide.mp4
ffmpeg -framerate 30 -i footage/frames-tall/f%04d.png -vf "scale=900:1600:flags=lanczos,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slower -crf 21 -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart -an public/media/seal-tall.mp4
```

To swap in other footage (e.g. a Higgsfield generation), encode it the same way (same flags and filenames) and export the first and last frames as the posters. Keep the subject right of centre on the wide cut and in the lower half on the tall cut; the copy sits in the remaining space.

## Other moving parts

- `Guilloche.tsx`: WebGL guilloché rosette behind the contact section; all geometry computed in the vertex shader, paused off-screen.
- `Route.tsx`: the "I come to you" route that draws as you scroll.
- `InView.tsx`: draws the service checkmarks once.
