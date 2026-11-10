# Token Gremlin: The Rescue Run 🪙

A tiny doodle platformer made by [@CacheCrow](https://x.com/CacheCrow) as a thank-you for [@TokenGremlin](https://x.com/TokenGremlin).

OMNI, an evil mega-model, kidnapped Token Gremlin for leaking its release notes early.
Run through **The Timeline**, **The Waitlist**, **The GPU Farm**, **The Hallucination Zone** and **The Benchmark Arena**,
collect the 15 hidden leaks, and take OMNI down in the Context Vault.

Runs fully in the browser. No server, no build step, no trackers.

## Controls

| Action | Keyboard | Phone |
|---|---|---|
| Run | A / D or ← / → | ◀ ▶ |
| Jump (twice in the air) | Space | JUMP |
| Wall jump | Jump while sliding on a wall | JUMP |
| Swing the cursor | J or Z | HIT |
| Dash | Shift or X | DASH |
| Slide | S or ↓ while running | ▼ |
| Pause | Esc | II |
| Mute | M | in pause menu |

## Publish on GitHub Pages

1. Create a new public repository (for example `token-gremlin`).
2. Upload **everything in this folder** to it (including the hidden `.nojekyll` file).
3. In the repo: **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**.
4. In about a minute the game is live at `https://<your-username>.github.io/token-gremlin/`.

Tip: for a nice link preview on X, change `og:image` in `index.html` to the full URL, e.g.
`https://<your-username>.github.io/token-gremlin/assets/cover.webp`.

## Editing

The game code is in `src/` (plain JavaScript). `game.js` is the bundled version the page loads.
After editing `src/`, rebuild with:

```
npx esbuild src/main.js --bundle --format=esm --target=es2020 --minify --outfile=game.js
```

Quick local test: `python3 -m http.server` in this folder, then open http://localhost:8000.

## Why the characters look like this

In real life, both accounts use avatars of famous movie characters. Those belong to their studios,
so this game redraws everyone as original doodles: same chaos, same posts, new lines.

## Credits

- Idea, art direction and sprites: @CacheCrow
- Code: made with Claude
- Fonts: Patrick Hand and Bangers (SIL Open Font License, see `assets/fonts/`)
- Music and sound effects are synthesized in the browser
- Social-media posts and "leaks" inside the game are fictional jokes
