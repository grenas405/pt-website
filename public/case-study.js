/* ─────────────────────────────────────────────────────────
   case-study.js — Praxedis Technologies
   Heavenly Roofing LLC case study page
   ───────────────────────────────────────────────────────── */

/* ── 1. Helpers ── */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function once(selector, fn, threshold = 0.15) {
  const el = document.querySelector(selector);
  if (!el) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { fn(entry.target); obs.unobserve(entry.target); }
    });
  }, { threshold });
  obs.observe(el);
}

/* ── 2. Custom Cursor ── */

const dot  = document.getElementById('cursor-dot');
const ring = document.getElementById('cursor-ring');

if (window.matchMedia('(hover: hover)').matches) {
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
  });

  (function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
  })();

  document.querySelectorAll('a, button, .arch-card, .security-panel').forEach(el => {
    el.addEventListener('mouseenter', () => { dot.classList.add('hovering'); ring.classList.add('hovering'); });
    el.addEventListener('mouseleave', () => { dot.classList.remove('hovering'); ring.classList.remove('hovering'); });
  });
}

/* ── 3. Canvas Particle Network ── */

ParticleEngine.initHeroCanvas('hero-canvas');
ParticleEngine.initCursorTrail();
ParticleEngine.initSectionAmbient('.arch-section');
ParticleEngine.initSectionAmbient('.contact-section');

/* ── 4. Page Load Timeline ── */

anime.set(['#hero-eyebrow', '.hero h1', '.hero-sub', '.hero-ctas'], { opacity: 0 });

const tl = anime.timeline({ easing: 'easeOutExpo' });
tl
  .add({ targets: '#hero-eyebrow', opacity: [0, 1], translateY: [-20, 0], duration: 700 })
  .add({ targets: '.hero h1',      opacity: [0, 1], translateY: [40, 0],  duration: 800 }, '-=400')
  .add({ targets: '.hero-sub',     opacity: [0, 1], translateY: [20, 0],  duration: 700 }, '-=500')
  .add({ targets: '.hero-ctas',    opacity: [0, 1], translateY: [20, 0],  duration: 700 }, '-=400');

/* ── 5. Scroll Observers ── */

// §2 — Project snapshot
once('#snapshot', () => {
  anime({
    targets: '.snapshot-text h2',
    opacity: [0, 1], translateX: [-40, 0],
    duration: 600, easing: 'easeOutExpo'
  });
  anime({
    targets: '.snapshot-text p',
    opacity: [0, 1], translateY: [20, 0],
    duration: 500, easing: 'easeOutExpo',
    delay: anime.stagger(120, { start: 200 })
  });
  anime({
    targets: '#project-card',
    opacity: [0, 1], scale: [0.85, 1],
    duration: 700, easing: 'easeOutExpo', delay: 200
  });
});

// §3 — Architecture cards + advantage strip
once('#stack', () => {
  anime({
    targets: '.arch-card',
    opacity: [0, 1], translateY: [60, 0],
    duration: 600, easing: 'easeOutExpo',
    delay: anime.stagger(100, { start: 100 })
  });
  anime({
    targets: '.advantage-strip',
    opacity: [0, 1], translateY: [30, 0],
    duration: 600, easing: 'easeOutExpo', delay: 500
  });
});

// §4 — Velocity section
once('#velocity', () => {
  anime({
    targets: '.velocity-text h2',
    opacity: [0, 1], translateX: [-40, 0],
    duration: 600, easing: 'easeOutExpo'
  });
  anime({
    targets: '.velocity-text p',
    opacity: [0, 1], translateY: [20, 0],
    duration: 500, easing: 'easeOutExpo',
    delay: anime.stagger(120, { start: 200 })
  });
  anime({
    targets: '.velocity-stat',
    opacity: [0, 1], translateX: [40, 0],
    duration: 600, easing: 'easeOutExpo',
    delay: anime.stagger(120, { start: 300 })
  });
});

// §5 — Security panels
once('#security', () => {
  anime({
    targets: '.security-panel',
    opacity: [0, 1], translateY: [40, 0],
    duration: 650, easing: 'easeOutExpo',
    delay: anime.stagger(150, { start: 100 })
  });
});

// §6 — Contact
once('#contact', () => {
  anime({
    targets: ['.contact-manifesto', '.contact-title', '.contact-sub'],
    opacity: [0, 1], translateY: [30, 0],
    duration: 700, easing: 'easeOutExpo', delay: anime.stagger(150),
    complete: () => {
      anime({
        targets: '.cta-button.large-green',
        opacity: [0, 1], scale: [0.5, 1],
        duration: 700, easing: 'easeOutBack',
        complete: () => {
          anime({
            targets: '.cta-button.large-green',
            scale: [1, 1.04, 1],
            duration: 2200, easing: 'easeInOutSine', loop: true
          });
        }
      });
    }
  });
});

/* ── 8. Interactive: 3D Card Tilt ── */

document.querySelectorAll('.arch-card, .security-panel').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2, cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -10;
    const ry = ((x - cx) / cx) * 10;
    card.style.setProperty('--mx', (x / rect.width * 100) + '%');
    card.style.setProperty('--my', (y / rect.height * 100) + '%');
    anime.remove(card);
    anime({ targets: card, rotateX: rx, rotateY: ry, scale: 1.03, duration: 200, easing: 'easeOutCubic' });
  });
  card.addEventListener('mouseleave', () => {
    anime({ targets: card, rotateX: 0, rotateY: 0, scale: 1, duration: 600, easing: 'easeOutElastic(1, 0.5)' });
  });
});

/* ── 9. Magnetic CTA Buttons ── */

document.querySelectorAll('.cta-button').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width  / 2) * 0.28;
    const y = (e.clientY - rect.top  - rect.height / 2) * 0.28;
    anime({ targets: btn, translateX: x, translateY: y, duration: 300, easing: 'easeOutExpo' });
  });
  btn.addEventListener('mouseleave', () => {
    anime({ targets: btn, translateX: 0, translateY: 0, duration: 800, easing: 'easeOutElastic(1, 0.5)' });
  });
});

/* ── 10. Arch card border flash on hover ── */

document.querySelectorAll('.arch-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    anime({
      targets: card,
      borderTopColor: [
        { value: '#006847', duration: 0 },
        { value: '#ce1126', duration: 250 },
        { value: '#006847', duration: 250 },
      ],
      easing: 'linear'
    });
  });
});
