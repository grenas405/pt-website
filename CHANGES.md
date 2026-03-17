# Changelog

All notable changes to the **Praxedis Technologies** website project will be documented in this file.

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
