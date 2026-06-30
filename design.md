# Design Concept — "Pinboard" Personal Music Player

> A collage-style, paper-themed personal music webapp that feels like someone's bedroom wall covered in torn-out magazine clippings, cassette labels, handwritten tracklists, and pinned postcards — except every card plays music.

---

## 1. Design Vision

### The Core Metaphor
Imagine a physical corkboard or a bedroom wall covered in overlapping ephemera: torn paper scraps, polaroid-style photos, washi tape strips, handwritten sticky notes, sticker residue, and cassette-era typography. Each piece of ephemera is a **music card** — a small, tactile-feeling player for a single track or playlist.

This is **not** a clean dashboard. It's a **lived-in collage** — warm, analog, personal, slightly messy but intentionally so. The chaos is curated.

### What Makes This Different from Every Other Music UI
Most music apps are dark, glassy, with smooth gradients and rounded-rect cards on a grid. This app rejects all of that:
- **No glass morphism.** Paper doesn't blur.
- **No perfect grids.** Collages are scattered, rotated, overlapping.
- **No dark mode as default.** The base is warm cream paper, like a sketchbook page.
- **No smooth sans-serif neutrality.** Typography is a deliberate mix: typewriter mono, hand-drawn display, and a clean body face.

### Emotional Register
- **Warm** — like afternoon light on a desk covered in zines
- **Personal** — this is YOUR wall, your music, your arrangement
- **Tactile** — every element should feel like you could peel it off the screen
- **Nostalgic but not retro** — references analog media without cosplaying a specific decade

---

## 2. Color Palette

The palette is drawn from real paper and stationery materials, not from a UI framework.

| Name             | Hex       | Role                                              |
|------------------|-----------|----------------------------------------------------|
| **Sketchbook**   | `#F5F0E8` | Page background — warm off-white, visible paper grain |
| **Kraft**        | `#C4A882` | Card backgrounds, tape strips, secondary surfaces   |
| **Ink**          | `#2C2926` | Primary text — not pure black, slightly warm         |
| **Pencil**       | `#8B8680` | Secondary text, muted labels, timestamps             |
| **Washi Rose**   | `#E8A0BF` | Accent 1 — decorative tape, active states            |
| **Washi Sage**   | `#A8C5A0` | Accent 2 — tags, secondary highlights               |
| **Stamp Red**    | `#C0392B` | Now-playing indicator, "live" dot, destructive actions |
| **Sticky Yellow**| `#F7E57A` | Sticky note backgrounds, warnings, highlights        |
| **Polaroid White**| `#FAFAFA` | Photo/album art borders, card overlays              |

### Texture Overlays
- A subtle **paper grain noise** texture (CSS `background-image` with a tiny repeating tile or SVG filter) on the main background
- **Cardboard texture** on heavier card elements
- **Lined paper** pattern for playlist/tracklist areas (faint blue horizontal rules like notebook paper)

---

## 3. Typography

Three typefaces, each with a clear reason:

### Display: **Caveat** (Google Fonts)
- Handwritten feel, casual but legible
- Used for: Page titles, section headers, the "now playing" track name
- Weight: 400–700
- Size: 28–48px
- Treatment: Slightly rotated (±1–3°) to feel hand-placed

### Body: **IBM Plex Mono** (Google Fonts)
- Typewriter character — feels like typed labels on cassette cases
- Used for: Track titles on cards, metadata (artist, album, duration), controls labels
- Weight: 400, 500
- Size: 12–16px
- Treatment: Uppercase for labels, normal case for content

### Utility: **Inter** (Google Fonts)
- Clean, modern, high legibility at small sizes
- Used for: Timestamps, file sizes, tooltips, search input, footer text
- Weight: 400
- Size: 11–14px

### Type Scale
```
--fs-xs:    11px   (utility captions)
--fs-sm:    13px   (metadata, labels)
--fs-base:  15px   (body text, track names)
--fs-md:    18px   (card titles)
--fs-lg:    24px   (section headers)
--fs-xl:    32px   (page title)
--fs-2xl:   48px   (hero/splash)
```

---

## 4. Layout Philosophy

### The Anti-Grid
The main content area is **not** a CSS Grid or Flexbox row. It's a **free-form scattered layout** where music cards are positioned with slight randomized rotations (CSS `transform: rotate(Xdeg)`) and overlapping z-indexes. Think of `position: absolute` with calculated positions that feel organic but don't actually overlap controls.

```
ASCII Wireframe — Main View:

┌─────────────────────────────────────────────────────┐
│  ✎ My Pinboard              [🔍 search]  [+ add]   │  ← header, handwritten title
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                      │
│   ┌─────────┐                                        │
│   │ ♫ card  │    ┌──────────┐                        │
│   │ (rot 2°)│    │ ♫ card   │                        │
│   └─────────┘    │ (rot -1°)│     ┌──────────┐      │
│                  └──────────┘     │ ♫ card   │      │
│        ┌──────────┐               │ (rot 3°) │      │
│        │ ♫ card   │               └──────────┘      │
│        │ (rot -2°)│                                  │
│        └──────────┘         ┌──────────┐             │
│                             │ ♫ card   │             │
│   ┌──────────┐              │ (rot -1°)│             │
│   │ ♫ card   │              └──────────┘             │
│   │ (rot 1°) │                                       │
│   └──────────┘                                       │
│                                                      │
│═══════════════════════════════════════════════════════│
│  ▶ Now Playing: track name — artist    ━━━●━━━ 2:34 │  ← persistent bottom bar
└─────────────────────────────────────────────────────┘
```

### Responsive Behavior
- **Desktop (>1024px)**: Full scattered collage, cards freely positioned, drag-to-rearrange
- **Tablet (768–1024px)**: Semi-scattered, cards still rotated but in a loose masonry column layout
- **Mobile (<768px)**: Stacked cards with slight rotation preserved, single column, swipe between cards

### Sections
The page is one continuous surface (the "board"). No traditional page navigation. Instead:
- **All Music** — the default scattered view
- **Playlists** — groupings visualized as "stacked paper" clusters with a label taped on top
- **Now Playing** — a persistent bottom bar that expands into a full "card" overlay when tapped

---

## 5. Component Design

### Music Card (The Core Element)
Each card represents a single track. It looks like a scrap of paper pinned to the board.

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  ← torn/rough top edge (CSS clip-path or SVG)
│  ┌─────────────────┐    │
│  │                 │    │  ← album art (polaroid-style white border)
│  │    album art    │    │
│  │                 │    │
│  └─────────────────┘    │
│                          │
│  Track Name              │  ← IBM Plex Mono, 15px, Ink
│  Artist Name             │  ← IBM Plex Mono, 13px, Pencil
│                          │
│  ◀◀   ▶ / ⏸   ▶▶       │  ← playback controls
│  ━━━━━━━●━━━━━━ 2:34    │  ← progress bar + time
│                          │
│  🏷️ indie  🏷️ chill     │  ← genre/mood tags (washi tape style)
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  ← torn bottom edge
```

**Card Variations** (for visual variety in the collage):
1. **Polaroid Card** — Album art dominant, title below, minimal controls (small play button on art hover)
2. **Sticky Note Card** — Yellow background, no album art, just track name + artist in handwritten font, tiny play icon
3. **Cassette Card** — Wider aspect ratio, resembles a cassette label with two "reels" that spin during playback
4. **Torn Page Card** — Default, as shown above

### Decorative Elements
Scattered between music cards to fill the collage:
- **Washi tape strips** — colored semi-transparent rectangles at angles, some crossing card edges
- **Push pins** — small circular elements with shadow, positioned at card corners
- **Doodles** — small SVG line-art (stars, music notes, squiggles, hearts) in Pencil color
- **Stickers** — emoji-like decorative elements (🎵 🎧 🎤 💿) with a glossy appearance
- **Coffee ring stain** — a subtle circular watermark texture randomly placed (very faint)

### Now Playing Bar
A persistent bottom bar that looks like a strip of masking tape stuck to the bottom edge:
- Kraft paper background with tape texture
- Currently playing track info (handwritten font for title)
- Compact playback controls
- Thin progress bar in Stamp Red
- Expands upward on click into a full "card" view with waveform visualization

### Search / Filter
A search bar styled as a **torn piece of lined notebook paper** with a pencil icon:
- Lined paper background
- Typewriter font for input text
- Tags below for filtering by mood/genre (styled as washi tape strips)

### Add Music Button
A large **"+"** on a circular sticker with a peeling edge effect — positioned top-right, always accessible.

---

## 6. Interaction & Motion

### Card Interactions
- **Hover**: Card lifts slightly (`translateY(-4px)`, `box-shadow` increases) — like picking up a paper from the desk
- **Click/Tap to play**: A brief "press down" animation, then the play button activates
- **Drag to rearrange**: Cards can be dragged to new positions (desktop only). While dragging, card rotates slightly more and a subtle paper-rustling visual (scale pulse) plays.

### Transitions
- **Card appearing**: Slides in from below with a slight rotation, like being slapped onto the board. Staggered delay for multiple cards.
- **Now Playing expand**: Slides up from the bottom bar, card "unfolds" from the bar position
- **Page load**: Cards scatter onto the board one by one with slight delays (0.05s stagger), each with a subtle bounce

### Ambient Motion
- **Minimal**: Only the now-playing progress bar moves continuously
- **Cassette reels**: If using the cassette card variant, two small circles rotate slowly during playback
- **Reduced motion**: All animations respect `prefers-reduced-motion` — instant transitions, no rotation randomization

### Audio Visualizer (Optional Signature)
A small waveform bar visualizer drawn with a **pencil-sketch style** — thin lines that wobble slightly, like someone drew the waveform by hand. Appears on the now-playing expanded view.

---

## 7. Signature Element

**The "Coffee Table" Parallax Board**

The entire collage board has a subtle multi-layer parallax on mouse move (desktop only):
- **Layer 0** (deepest): The paper-grain background, barely moves
- **Layer 1**: Decorative doodles and stickers, moves slightly opposite to cursor
- **Layer 2**: Music cards, moves a tiny amount (2-3px max) — gives depth without dizziness
- **Layer 3** (topmost): Washi tape strips that "cross over" cards, moves most

This creates the illusion of looking down at a real physical surface — like a desk or coffee table covered in music ephemera. The effect is extremely subtle (max 3-5px displacement) to avoid motion sickness, and is disabled entirely on mobile and for `prefers-reduced-motion`.

---

## 8. Shadows & Depth

Paper doesn't glow — it casts soft, diffuse shadows:

```css
/* Card resting on surface */
--shadow-card: 2px 3px 8px rgba(44, 41, 38, 0.12),
               1px 1px 3px rgba(44, 41, 38, 0.08);

/* Card hovered / lifted */
--shadow-card-hover: 4px 6px 16px rgba(44, 41, 38, 0.18),
                     2px 3px 6px rgba(44, 41, 38, 0.10);

/* Push pin */
--shadow-pin: 1px 2px 4px rgba(44, 41, 38, 0.3);

/* Now playing bar */
--shadow-bar: 0 -2px 12px rgba(44, 41, 38, 0.15);
```

No glows, no colored shadows, no blur-behind. This is paper, not glass.

---

## 9. Iconography

- **Custom SVG line-art icons** — thin stroke, hand-drawn style (slightly imperfect lines)
- Play, pause, skip, volume, add, search, settings
- Stroke width: 1.5–2px
- Color: Ink (`#2C2926`) default, Stamp Red for active/playing state
- No filled icons — always outline/line style to match the sketched aesthetic

---

## 10. Accessibility Notes

- All cards have proper `aria-label` with track name and artist
- Color contrast meets WCAG AA on all text (Ink on Sketchbook = 11.2:1 ratio)
- Focus indicators styled as a dashed border (like a pencil underline) instead of default browser outline
- Keyboard navigation follows visual card order
- Screen reader announces "Now playing: [track name] by [artist]" on track change
- Reduced motion users get a clean, non-rotated grid layout — still on paper background, still with card styling, just without scatter and animation

---

## 11. File/Asset Requirements

- `paper-grain.svg` or `paper-noise.png` — tileable paper texture (very subtle)
- `torn-edge.svg` — clip-path or mask for torn paper edges on cards
- `washi-tape.svg` — decorative tape strip shapes (3-4 variations)
- `push-pin.svg` — small decorative pin
- `doodles.svg` — collection of small hand-drawn decorative elements
- `cassette-reel.svg` — for the cassette card variant
- Google Fonts: Caveat, IBM Plex Mono, Inter
