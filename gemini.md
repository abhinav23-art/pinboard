# Gemini Agent Instructions — Build "Pinboard" Music Webapp

> **Read `design.md` first.** That file contains all visual design decisions (palette, type, layout, components). This file tells you HOW to build it.

---

## Project Overview

Build a **collage-style, paper-themed personal music webapp** called "Pinboard." It is a single-page application where the user's music tracks are displayed as scattered paper cards on a textured background. Each card is a mini player. There is a persistent now-playing bar at the bottom.

**This is a personal project — not a SaaS product.** There are no accounts, no backend, no streaming API. Music files are loaded locally (via file input or drag-drop) or from hardcoded URLs for demo purposes.

---

## Tech Stack

- **Vite** (vanilla JS template, no React/Vue/Svelte)
- **Vanilla CSS** — no Tailwind, no CSS framework
- **Web Audio API** — for playback and optional waveform visualization
- **HTML5 Audio element** — as the primary playback engine (Web Audio for visualization overlay)
- **No build-time dependencies beyond Vite**

### Why Vanilla?
The app is small in scope. A framework adds weight without value here. The scattered layout and decorative elements are easier to control with direct DOM manipulation.

---

## File Structure

```
pinboard/
├── index.html              # Single page, semantic HTML5
├── vite.config.js           # Vite config (minimal)
├── package.json
│
├── css/
│   ├── tokens.css           # Design tokens (colors, type, spacing, shadows)
│   ├── base.css             # Reset, body, global styles, paper texture
│   ├── layout.css           # Board layout, header, responsive breakpoints
│   ├── cards.css            # All card variants (torn page, polaroid, sticky, cassette)
│   ├── player-bar.css       # Now-playing bottom bar
│   ├── decorations.css      # Washi tape, pins, doodles, stickers
│   ├── search.css           # Search bar, tag filters
│   └── animations.css       # Keyframes, transitions, hover/active states
│
├── js/
│   ├── main.js              # App entry — init, event delegation, state
│   ├── audio-engine.js      # Audio playback controller (play, pause, seek, queue)
│   ├── card-renderer.js     # Creates card DOM elements, assigns random positions/rotations
│   ├── drag.js              # Drag-to-rearrange logic (pointer events)
│   ├── search.js            # Filter/search logic
│   ├── decorations.js       # Generates and places decorative elements
│   └── parallax.js          # Subtle mouse-move parallax on the board (desktop only)
│
├── assets/
│   ├── textures/            # Paper grain, torn edges, lined paper
│   ├── icons/               # Hand-drawn SVG icons (play, pause, skip, etc.)
│   ├── doodles/             # Decorative SVG doodles
│   └── sample-tracks/       # 3-5 demo audio files (short clips, royalty-free)
│
└── public/
    └── favicon.svg          # Musical note in hand-drawn style
```

---

## Phase 1: Foundation

### 1.1 Setup
```bash
npm create vite@latest ./ -- --template vanilla
npm install
```

### 1.2 Design Tokens (`css/tokens.css`)
Convert every value from `design.md` Section 2 (palette), Section 3 (typography), and Section 8 (shadows) into CSS custom properties on `:root`. Include:
- All 9 named colors
- Type scale (7 sizes)
- Font families (3)
- Shadow definitions (4 levels)
- Spacing scale (4px base, 8 stops)
- Border radius values (for cards: slightly irregular — use different values per corner to feel hand-cut)
- Z-index scale (background, decorations, cards, active-card, bar, modal)
- Transition durations

### 1.3 Base Styles (`css/base.css`)
- CSS reset (minimal — box-sizing, margin, padding)
- Body: `background-color: var(--color-sketchbook)` with a CSS noise texture overlay. Generate the noise texture using an SVG `<filter>` with `feTurbulence` — no external image needed.
- Import Google Fonts: Caveat, IBM Plex Mono, Inter
- Set default font to Inter, default text color to Ink
- Style scrollbar to be thin, Kraft-colored, matching the paper theme
- Apply `::selection` styling in Washi Rose

---

## Phase 2: Layout

### 2.1 Page Structure (`index.html`)
```html
<body>
  <header class="board-header">
    <!-- Title in Caveat, search bar, add button -->
  </header>

  <main class="board" id="board" role="list" aria-label="Music collection">
    <!-- Cards injected here by JS -->
    <!-- Decorative elements layered behind/above cards -->
  </main>

  <footer class="player-bar" id="player-bar" role="region" aria-label="Now playing">
    <!-- Persistent bottom player -->
  </footer>
</body>
```

### 2.2 Board Layout (`css/layout.css`)
- `.board` is `position: relative` with `min-height: 100vh` (minus header and bar)
- Cards are positioned using a **scatter algorithm** (see Phase 3) — NOT CSS Grid
- Header is a simple flex row: title (left), search + add button (right)
- Player bar is `position: fixed; bottom: 0` with full width

### 2.3 Responsive Strategy
- Use CSS custom properties for board padding and card sizes
- Media queries at 768px and 1024px
- Below 768px: cards stack vertically with `position: relative` (still with slight rotation)
- Between 768–1024px: loose 2-column masonry approximation
- Above 1024px: full scatter layout

---

## Phase 3: Music Cards

### 3.1 Card HTML Structure
Each card is an `<article>` with `role="listitem"`:
```html
<article class="card card--torn" style="--rotate: 2deg; --x: 120px; --y: 340px;" data-track-id="...">
  <div class="card__art">
    <img src="..." alt="Album art for [track]" />
    <div class="card__pin"></div>  <!-- decorative push pin -->
  </div>
  <div class="card__info">
    <h3 class="card__title">Track Name</h3>
    <p class="card__artist">Artist Name</p>
  </div>
  <div class="card__controls">
    <button class="card__btn" aria-label="Previous">◀◀</button>
    <button class="card__btn card__btn--play" aria-label="Play">▶</button>
    <button class="card__btn" aria-label="Next">▶▶</button>
  </div>
  <div class="card__progress">
    <input type="range" min="0" max="100" value="0" aria-label="Seek" />
    <span class="card__time">0:00</span>
  </div>
  <div class="card__tags">
    <span class="tag tag--rose">indie</span>
    <span class="tag tag--sage">chill</span>
  </div>
</article>
```

### 3.2 Card Variants
Implement all 4 variants from `design.md` Section 5:
1. **`card--torn`**: Default. Torn edges via CSS `clip-path: polygon(...)` with slightly jagged points. Paper-colored background.
2. **`card--polaroid`**: White border (thick bottom), album art fills most of the card, title below in handwritten font. Controls only on hover.
3. **`card--sticky`**: Sticky Yellow background, no album art, larger handwritten text, tiny play icon in corner. Slight curl shadow at bottom-right.
4. **`card--cassette`**: Wider aspect ratio (16:9-ish), styled like a cassette label. Two small circular "reels" that CSS-animate rotation during playback.

Assign variants randomly when rendering cards (weighted: torn 40%, polaroid 30%, sticky 15%, cassette 15%).

### 3.3 Scatter Algorithm (`js/card-renderer.js`)
Position cards on the board:
1. Divide the board into a loose grid of "zones" (prevents total chaos)
2. Within each zone, offset the card position randomly by ±20-40px from center
3. Apply random rotation: `transform: rotate(${random(-4, 4)}deg)`
4. Set z-index incrementally so later cards overlap earlier ones
5. Ensure no card's **controls area** is fully occluded by another card (check bounding boxes)
6. On window resize, recalculate positions

### 3.4 Card Styling (`css/cards.css`)
- Background: `var(--color-sketchbook)` or variant-specific color
- Border: none (edges are defined by clip-path or shadow)
- Shadow: `var(--shadow-card)` resting, `var(--shadow-card-hover)` on hover
- Hover: `translateY(-4px)` lift, shadow deepens, z-index bumps to top
- Transition: `transform 0.2s ease, box-shadow 0.2s ease`
- Width: 240–280px (varies slightly per variant)

---

## Phase 4: Audio Engine

### 4.1 Core Playback (`js/audio-engine.js`)
Export a singleton `AudioEngine` class:
```
- play(trackId)
- pause()
- resume()
- seek(percentage)
- setVolume(0-1)
- next()
- previous()
- getCurrentTrack() → { id, title, artist, src, duration, currentTime }
- onTimeUpdate(callback)
- onTrackEnd(callback)
- onTrackChange(callback)
```

Use a single `<audio>` element (created in JS, not in HTML). Reuse it across tracks — don't create a new one per card.

### 4.2 Track Data
Store tracks as an array of objects:
```js
{
  id: 'track-1',
  title: 'Song Name',
  artist: 'Artist',
  album: 'Album',
  src: '/assets/sample-tracks/song.mp3',
  art: '/assets/art/cover.jpg',
  duration: 214, // seconds
  tags: ['indie', 'chill'],
  variant: 'torn' // card style
}
```

For the demo, include 5-8 sample tracks. Use placeholder album art generated as colored rectangles with the track initial drawn in Caveat font (generate via canvas or just use CSS-styled divs as art).

### 4.3 State Sync
When a track plays:
1. The corresponding card gets a `.card--playing` class (adds a subtle pulsing glow in Stamp Red on the border, like an "on air" light)
2. The now-playing bar updates with track info
3. Any previously playing card loses the class
4. Progress bars on both the card and the bar update via `requestAnimationFrame`

---

## Phase 5: Interactive Features

### 5.1 Drag to Rearrange (`js/drag.js`)
- Desktop only (pointer events)
- On `pointerdown` on a card: increase z-index, add `.card--dragging` class (more shadow, slight scale up to 1.03)
- On `pointermove`: update `--x` and `--y` custom properties, add extra rotation
- On `pointerup`: settle card into new position with a spring-like ease
- Save positions to `localStorage` so the arrangement persists

### 5.2 Search and Filter (`js/search.js`)
- Filter by track name, artist, or tag
- Non-matching cards get `.card--hidden` (opacity 0.15, pointer-events none, scale down slightly)
- Matching cards smoothly rearrange to fill visible space
- Search input styled as torn notebook paper (see `design.md` Section 5)

### 5.3 Add Music
- "+" button opens a file picker (`<input type="file" accept="audio/*" multiple>`)
- Reads file metadata if available (or uses filename as title)
- Creates a new card with random variant and position
- Saves track list to `localStorage`
- Card entrance animation: slides up from below the board, rotates into place

### 5.4 Decorative Elements (`js/decorations.js`)
On page load, scatter decorative elements across the board:
- 4-6 washi tape strips (CSS-only: colored rectangles with `mix-blend-mode: multiply`, rotated)
- 3-4 push pins at card corners (CSS circles with radial gradient + shadow)
- 5-8 small SVG doodles (music notes, stars, squiggles) in Pencil color
- 1-2 coffee ring stains (very subtle SVG circles with low opacity)
- Position using the same zone system as cards, but on a different z-layer

### 5.5 Parallax (`js/parallax.js`)
- Listen to `mousemove` on the board
- Calculate mouse position relative to board center
- Apply tiny `translate` offsets to different z-layers:
  - Decorations: 3-5px max displacement
  - Cards: 1-2px max displacement
  - Background: 0-1px max displacement
- Use `requestAnimationFrame` for smooth updates
- Disable for `prefers-reduced-motion` and touch devices

---

## Phase 6: Polish

### 6.1 Animations (`css/animations.css`)
```css
@keyframes card-enter {
  from { opacity: 0; transform: translateY(40px) rotate(calc(var(--rotate) + 8deg)) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) rotate(var(--rotate)) scale(1); }
}

@keyframes reel-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes pulse-playing {
  0%, 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); }
  50%      { box-shadow: 0 0 0 4px rgba(192, 57, 43, 0.15); }
}
```

### 6.2 Loading State
While tracks load, show a "setting up the board..." message in Caveat font, centered, with a small animated pencil doodle.

### 6.3 Empty State
If no tracks are loaded: show a large handwritten message — "Your board is empty. Drop some music here or click + to add tracks." — with a dashed border area styled as a pinboard with no pins.

### 6.4 Error Handling
If a file fails to load: the card gets a "scratched out" visual — diagonal pencil lines drawn over it (CSS background linear-gradient) with a "couldn't play this one" message in handwritten font.

### 6.5 localStorage Persistence
Save to localStorage:
- Track list (metadata only, not audio data)
- Card positions and rotations
- Card variant assignments
- Volume level
- Last playing track and position

---

## Build Rules (MUST follow)

1. **No component frameworks.** Vanilla JS with ES modules only.
2. **No CSS frameworks.** Write all CSS by hand, organized into the files listed above.
3. **No dark mode.** This app is paper. Paper is light. (A "night mode" could dim to a warm amber if implemented later, but not invert to dark.)
4. **Every card MUST have a slight rotation.** Zero-rotation cards look like a grid and break the collage feel.
5. **Paper texture is non-negotiable.** The background must have visible (but subtle) paper grain. Use SVG `feTurbulence` filter if no texture image is available.
6. **Shadows must be warm and soft.** No sharp drop shadows, no colored glows.
7. **Typography must use the 3-font system.** Caveat for display, IBM Plex Mono for track info, Inter for utility. No substitutions.
8. **Torn edges on at least the default card variant.** Use CSS `clip-path` with polygon points that simulate paper tearing.
9. **The now-playing bar must always be visible.** Even when no track is playing (show "Nothing playing — pick a card").
10. **All interactive elements must be keyboard accessible.** Tab order follows visual card order (left-to-right, top-to-bottom based on position).
11. **Respect `prefers-reduced-motion`.** Disable parallax, card scatter animation, and reel spin. Keep layout and colors intact.
12. **Reference `design.md` for every visual decision.** If something isn't specified there, make it match the paper/collage aesthetic — when in doubt, think "would this look right on a corkboard?"

---

## Demo Data

Include these sample tracks for first-run demo (use short royalty-free clips or generate silent audio files with metadata):

| # | Title | Artist | Tags | Card Variant |
|---|-------|--------|------|--------------|
| 1 | Morning Pages | Hazy Mornings | lo-fi, chill | torn |
| 2 | Tape Hiss | Analog Ghosts | ambient, noise | cassette |
| 3 | Sunflower | Painted Sky | indie, warm | polaroid |
| 4 | Late Night Diner | The Sleepless | jazz, mellow | sticky |
| 5 | Paper Trail | Footnotes | acoustic, folk | torn |
| 6 | Dust & Light | Window Seat | dream-pop, ethereal | polaroid |

For album art: generate simple colored rectangles (use the palette accent colors) with the first letter of the track name in large Caveat font. This avoids needing actual image assets.

---

## Success Criteria

The app is done when:
- [ ] Opening `index.html` shows a warm paper-textured board with 6 scattered music cards
- [ ] Each card has visible torn/styled edges and slight random rotation
- [ ] Clicking play on any card plays audio (or shows play state if using silent stubs)
- [ ] The now-playing bar updates and tracks progress
- [ ] Cards can be dragged to new positions (desktop)
- [ ] Search filters cards by name/artist/tag
- [ ] New tracks can be added via file picker
- [ ] Decorative elements (tape, pins, doodles) are visible between cards
- [ ] The page feels like a physical collage, not a dashboard
- [ ] Mobile layout stacks cards cleanly with preserved paper styling
- [ ] Keyboard navigation works through all cards and controls
