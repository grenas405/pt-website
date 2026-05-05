# Changelog

All notable changes to the **Praxedis Technologies** website project will be documented in this file.

## [Unreleased] - 2026-05-05

### Added
- **API Health Endpoint** — added `GET /api/health` and `HEAD /api/health` with non-cacheable JSON health payload (`status`, `service`, `timestamp`, `uptimeSeconds`) for uptime checks and load balancer probes
- **VERSION File** — added root `VERSION` file as the SemVer source of truth for the current site release version (`1.2.0`)

### Changed
- **nginx Health Routing** — bare-domain HTTPS requests to `/api/health` now proxy directly to Deno instead of returning the canonical `www` redirect; normal bare-domain paths still redirect to `www`
- **nginx Warning Cleanup** — removed duplicate `text/html` from `gzip_types`, merged HTTPS handling into one server block, and normalized HTTPS `listen` directives to avoid protocol option conflicts with other enabled nginx sites
- **Vision Section** — complete overhaul: eyebrow label "The Philosophy", rewritten copy emphasizing zero-friction unified execution, 4-stat grid (`0% Friction`, `100% Accountability`, `Mag 7 Velocity`, `1 Vision`) with animated count-up, replaced single tech card with `.vision-card-stack` containing a dark primary card (progress bar fills for Execution Velocity & Accountability Index) and a green secondary "PARADIGM SHIFT" quote card
- **Capabilities Section** — added "Core Disciplines" eyebrow + "Four domains. One operator. Infinite leverage." subtitle, semi-transparent watermark numbers `01`–`04` per card, tech tag badges per card, renamed "Market Analysis" → "Market Intelligence"
- **Marquee Strip** — doubled to dual-direction tracks (first goes left, second goes right at 32s), edge-fade via CSS `mask-image`, second track adds keywords: Paradigm Shift, Zero Friction, TypeScript, Solo Operator, Deno Runtime, Infinite Leverage, React / Next.js, Praxedis G. Guerrero
- **Heritage Section** — added "Origin & Identity" eyebrow, italic red accent on "Revolution", `.heritage-quote-bubble` (Spanish quote from Praxedis G. Guerrero, dark card with green left border, positioned over flag), tricolor divider bar, location line with FA icons
- **Footer** — complete redesign: 4px tricolor flag stripe header, 3-column grid layout (Brand | Navigate | Connect), catchphrase "One Person, One Paradigm Shift in Computer Science." with green accent, navigation links, email + social icon buttons (GitHub / LinkedIn / X), bottom bar with "One Person. One Paradigm Shift. Infinite Leverage." mantra
- `main.js` — updated vision/capabilities/heritage IntersectionObserver animations for all new elements; replaced `.stats li` counter with `[data-target]` attribute-driven counters; added progress bar fill animations; updated cursor hover targets; updated ambient loop from `.tech-card .icon` → `.vision-card-icon`
- `main.css` — removed old `footer {}` base block, added full CSS for all new section elements and footer redesign, updated JS animation initial-states block

## [Unreleased] - 2026-03-29

### Added
- **Custom 404 page** (`public/404.html`, `public/404.css`, `public/404.js`)
  - Full-viewport hero with particle canvas background (reuses `particles.js`)
  - Giant glitching 404 numerals: CSS `@keyframes glitch-404` applied per-digit with staggered `animation-delay` (0s / 0.35s / 0.7s) and varied durations; the zero digit uses the red palette for a warning/target visual
  - AnimeJS periodic shake on `error-code-wrap` fires every 6.5–10.5s — second layer of disturbance independent of the CSS glitch
  - Entry timeline: 404 numbers slam in with `easeOutBack` → eyebrow fades down → headline slides up → terminal slides in from left → CTA buttons stagger-bounce
  - Terminal window with typewriter effect: shows actual `window.location.pathname` in a fake route log (`resolve(): null — path not found in /public/`)
  - Brand message: "One path. Zero results."
  - Three navigation CTAs: Return Home (primary green), About (secondary), Work (secondary)
  - Full design system parity: custom cursor, scroll progress bar, glassmorphism nav on scroll, mobile hamburger overlay, footer, Mexican flag stripe decoration

### Changed
- `server/main.ts` — added `serve404()` helper; both plain-text "Not Found" returns (missing path + file open failure) now stream `404.html` with HTTP 404 status and correct cache headers; retains text fallback if `404.html` is missing during deploy

## [Unreleased] - 2026-03-18

### Added
- **Contact section universe background animation** (`particles.js`, `index.html`, `main.css`, `main.js`)
  - Canvas-based deep-space animation behind the "Join the Disruption" section
  - 5 visual layers rendered back-to-front:
    1. **Milky Way band** — 600 Gaussian-spread micro-stars along a diagonal, drawn once to an offscreen canvas and blitted each frame with `lighter` blending
    2. **Nebula clouds** — 6 offscreen radial-gradient buffers (2 green, 2 red, 1 white, 1 green) composited with `screen` blending; each pulses in opacity and drifts sinusoidally to simulate a breathing cosmos; incorporates Mexican flag palette (#006847, #ce1126)
    3. **Starfield** — 300 stars across 3 depth layers (far/mid/near) with per-star twinkling via sine waves; near-layer stars have 25% chance of green/red brand tints and ~8 stars with `shadowBlur` glow
    4. **Shooting stars** — pool of 5 meteors with 20-point trail ring buffers, gradient stroke rendering (`lighter` blend), and smooth fade-in/fade-out; spawn every 2–6 seconds from top/left edges
    5. **Cosmic dust** — 80 sub-pixel particles batched into a single `beginPath/fill` call, slow-drifting with edge-wrapping
  - IntersectionObserver pauses animation when section is not visible (performance)
  - `dt` clamped to 50ms to prevent animation jumps on tab switch / scroll resume
  - Mobile-responsive: particle counts halved on touch devices
  - Returns `destroy()` method for cleanup



### Fixed
- `particles.js` — resolved hero canvas lag caused by four compounding GPU/CPU bottlenecks:
  - **Removed `ctx.shadowBlur` from `Particle.draw()`** — eliminated 8,400+ GPU blur compositing passes per second (140 particles × 60fps); particles now draw with plain `globalAlpha` + `fillStyle`
  - **Cached `canvas.getBoundingClientRect()`** — stored in `canvasRect`, updated only on `resize`; eliminates layout reflow triggered on every `mousemove` event
  - **Squared-distance early exit in connection loop** — checks `dx²+dy²` against `CONNECT_DIST²` before calling `Math.sqrt`, avoiding the expensive sqrt on the ~95% of particle pairs that are out of range
  - **Removed `createLinearGradient` per connection** — replaced with a single `strokeStyle` color; connections now render as uniform green lines with distance-based alpha
  - `shadowBlur` retained in `updateBursts()` (click sparks) — infrequent and short-lived, cost is acceptable

## [Unreleased] - 2026-03-17

### Added
- Added `particles.js` — shared particle engine powering all three pages
  - **Hero canvas** (site-wide): 140 glowing particles (70 on mobile) with `shadowBlur` glow and neon color variants (`#00ff9f`, `#ff6b7a`)
  - Pulsing particle radii via sine wave; comet ghost-trails via semi-transparent `fillRect` clear
  - Gradient connections: `createLinearGradient` between particle pairs (color A → color B); connection opacity boosts 1.5× when near cursor
  - Mouse repulsion zone (0–120px) + weak attraction vortex (120–220px)
  - Sinusoidal wave-drift velocity field (time-based, subtle turbulence)
  - Click burst: 22 spark particles radiate from click point and fade over ~0.6s
  - **Cursor particle trail**: pooled 20 DOM divs emit colored sparks on mouse movement; fade + drift via Anime.js; disabled on touch/mobile
  - **Ambient section particles**: 20 floating CSS-animated particles per dark section (Capabilities, Contact, Building, Architecture); zero JS per-frame cost
- Added `<script src="particles.js" defer>` to `index.html`, `about.html`, `heavenly-roofing.html`

### Changed
- `main.js`, `about.js`, `heavenly-roofing.js` — removed duplicated canvas particle code (108 lines each); replaced with 4-line `ParticleEngine` calls
- `main.css`, `about.css`, `heavenly-roofing.css` — added `.cursor-trail-particle`, `.ambient-layer`, `.ambient-particle`, and `@keyframes ambient-float`

## [Unreleased] - 2026-03-16

### Added
- Added `heavenly-roofing.html` — promotional case study page for Heavenly Roofing LLC (Robert C. Rodriguez)
  - Hero: "Built for Growth." with live site CTA and particle canvas
  - Project Snapshot section: terminal-style project card (client, runtime, proxy, process, status)
  - Architecture section: Deno native APIs / Nginx / systemd cards + advantage strip (0 npm · 1 runtime · ∞ scalability)
  - AI-Augmented Velocity section: Pedro → Robert speed story with `<1hr`, `1 person`, `0 intermediaries` stats
  - Secure by Design section: two panels covering secure lead capture and protected form submissions
  - Contact section: live site CTA linking to https://www.heavenlyroofingllc.com
  - Full Anime.js scroll-triggered animations, 3D card tilt, magnetic CTAs, hamburger menu
- Added "Work" nav link to desktop nav and mobile hamburger overlay on `index.html` and `about.html`
- Implemented futuristic full-screen hamburger navigation menu for mobile/tablet (`≤992px`) on both `index.html` and `about.html`
  - Hamburger button with Anime.js bars→X morph animation
  - Full-screen dark overlay with glassmorphism (`backdrop-filter: blur(24px)`)
  - Clip-path shutter-wipe entrance/exit animation
  - Nav links stagger-lifted from clip containers (`overflow:hidden`)
  - Mexican flag color bar decorations (right side, slide-in)
  - Scan-line grid texture overlay
  - Body scroll lock while menu is open
  - Accessible: ARIA roles, `aria-expanded`, `aria-hidden`, focus trap, Escape key close

### Changed
- Updated `.gitignore` to include Deno-specific entries (`.deno/`, `deno.lock`)

## [1.0.0] - 2026-03-12

### Initial Release
- **Core Implementation**: Created a professional, disruptive, and vibrant landing page for `www.praxedistechnologies.com`.
- **Aesthetics**: Developed a high-tech theme infused with Mexican heritage colors (Green, White, Red).
- **Hero Section**: Designed a high-impact hero area featuring the "One Person. Mag 7 Speed." headline and Pedro M. Dominguez's vision.
- **Narrative & Heritage**: Added a dedicated section for the legacy of **Praxedis G. Guerrero**, connecting historical revolution to technical disruption.
- **Responsive Layout**: Implemented a mobile-first responsive design using CSS Grid and Flexbox.
- **Animations**: Added fade-in entrance animations and interactive hover states for CTAs.
- **Project Documentation**: Added `README.md`, `CHANGES.md`, and `DESIGN.md` to establish project standards and history.

## Changed - 2026-3-13
- Updated contact info in index.html

## [1.1.0] - 2026-03-13

### AnimeJS Integration
- **Added `main.js`**: Full AnimeJS 3.2.1 animation controller (~220 lines, no build tools)
- **Hero load timeline**: Choreographed 2.2s sequence — logo letters stagger in, nav links drop down, hero stripes slide from right, h1 lines fly in from opposite sides with green glow burst, paragraph and CTA buttons bounce in
- **Scroll-triggered reveals**: IntersectionObserver fires section animations once on entry — Vision (red-line expand, stat count-up with pop, graphic scale-in), Capabilities (staggered card slide-up), Heritage (flag clip-path reveal left-to-right, text slide-in), Contact (scale-in heading + CTA bounce)
- **Ambient loops**: ⚡ icon floats continuously; contact CTA button breathes with subtle pulse after reveal
- **Interactive hover**: Capability card top border flashes green→red→green on mouseenter via AnimeJS
- **CSS**: Removed CSS `@keyframes fadeIn` / `.fade-in` / `.fade-in-delayed`; added JS animation initial states block; added `white-space: nowrap` to `.logo`
- **HTML**: Added AnimeJS CDN script tag; wrapped hero h1 text in targeting spans; added `main.js` defer script
## [2.0.0] - 2026-03-14

### Major Visual Overhaul — Impressive, Animated, Revolutionary

- **Canvas Particle Network**: Vanilla canvas API particle constellation in hero background; 80 particles in Mexican flag colors with connecting lines and mouse-repulsion effect
- **Custom Cursor**: Glowing green dot + lagging ring that tracks mouse; scales up red on interactive elements; hidden on touch devices
- **Scroll Progress Bar**: Fixed gradient bar (green → red) at top showing scroll position
- **Glassmorphism Nav**: Header gains frosted-glass backdrop-filter + green border on scroll past 60px
- **Text Scramble**: Matrix-style character scramble on "Mag 7 Speed." headline after page load resolves
- **Magnetic Buttons**: All `.cta-button` elements subtly follow cursor with elastic spring-back on leave
- **3D Card Tilt**: Capability cards tilt up to ±12° on mouse position with radial gradient sheen
- **Parallax Hero Stripes**: Mexican flag stripes shift at 0.25× scroll speed on desktop
- **Scrolling Marquee Strip**: Continuous CSS-animated tech skills ticker between Capabilities and Heritage sections
- **4th Capability Card**: Added "AI & Automation" with brain icon
- **Gradient + Glitch Headline**: `.highlight` now uses CSS gradient text + subtle glitch animation keyframes
- **Dark Contact Section**: Replaced white background with dark radial gradient + ambient green glow + manifesto pull quote
- **Typography Upgrade**: h1 → 5.5rem, weight 900, letter-spacing -3px; hero eyebrow label added
- **Font Awesome 6**: Switched from CDN kit to direct FA 6.4.0 CSS link; icons added to all capability cards
- **CSS**: Grid-4 layout for capabilities (2-col on tablet, 1-col mobile); background grid texture on dark section; card sheen via CSS custom properties `--mx`/`--my`
- **HTML**: Semantic cursor/progress elements; hero canvas; marquee strip; manifesto quote; hero eyebrow span

## [3.0.0] - 2026-03-16

### Architecture: Deno HTTP Application

- **Deno HTTP Server**: Replaced static file serving with a Deno-native HTTP application using `Deno.serve()` — zero npm dependencies, zero third-party modules
- **Unix Philosophy Structure**: Server split into 5 focused modules — `config.ts`, `mime.ts`, `headers.ts`, `file.ts`, `router.ts` — each doing exactly one thing; wired together in `main.ts`
- **Stream-Based File Delivery**: Files served via `Deno.open().readable` (`ReadableStream`) — no memory buffering for any asset size
- **Path Traversal Protection**: `router.ts` uses `Deno.realPath()` to resolve and guard all paths; requests escaping `public/` return 404
- **Cache Strategy**: HTML `no-cache, must-revalidate`; CSS/JS `public, max-age=31536000, immutable`; ETag + Last-Modified on all responses
- **Security Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` set at application layer; HSTS + Permissions-Policy at nginx layer
- **Minimal Permissions**: Production Deno process locked to `--allow-net=127.0.0.1:8000 --allow-read=./public --allow-env=PORT,PUBLIC_DIR,HOST`
- **nginx Reverse Proxy**: Added `nginx/praxedistechnologies.com.conf` — TLS termination, HTTP→HTTPS redirect, bare domain→www redirect, gzip, ACME challenge passthrough, hidden file blocking, structured logging
- **File Reorganization**: Static assets moved from root → `public/`; server source in `server/`; nginx config in `nginx/`

## [3.1.0] - 2026-03-16

### systemd User Service

- **Added `systemd/praxedis-technologies.service`**: User-level systemd unit installed to `/etc/systemd/user/`; `WorkingDirectory` set to `server/` so `ExecStart` references `main.ts` directly; uses `%h` specifier for XDG-compliant home-relative paths; `Restart=on-failure`, binds to `127.0.0.1:8000` only

## [3.2.0] - 2026-03-16

### About Page

- **Added `public/about.html`**: Standalone about page with 6 sections — Hero, The Person, Currently Building, The Stack, Philosophy, Contact
- **Added `public/about.css`**: Full design system implementation (same tokens, components, and grid patterns as `main.css`) plus about-specific layouts: terminal card, building cards, stack cards, philosophy stats
- **Added `public/about.js`**: 11-section animation controller — canvas particles, cursor, scroll progress, hero typewriter loop cycling `architect.` → `developer.` → `disruptor.` → `one person.`, terminal card line-by-line typewriter, per-card build title typewriter, sequential terminal command strip, CSS-triggered stack card names, philosophy count-up, 3D card tilt, magnetic buttons
- **Typewriter effects (5 total)**: Hero cycling loop (JS), terminal profile card (JS scroll-triggered), currently-building card titles (JS per-card), terminal command strip (JS sequential), stack card names (CSS `steps()` with staggered `animation-delay`)
- **Updated `public/index.html`**: Added `About` nav link

---
*Generated by Praxedis Technologies Automation.*
