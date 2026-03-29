/* ─────────────────────────────────────────────
   404.js — Praxedis Technologies 404 Page
   8 sections, zero dependencies beyond anime.js
   ───────────────────────────────────────────── */

/* ── 1. Helpers ── */

function typewriter(el, text, speed = 40) {
  return new Promise(resolve => {
    let i = 0;
    el.textContent = '';
    function tick() {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    }
    tick();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => { dot.classList.add('hovering'); ring.classList.add('hovering'); });
    el.addEventListener('mouseleave', () => { dot.classList.remove('hovering'); ring.classList.remove('hovering'); });
  });
}

/* ── 3. Scroll Progress ── */

const progress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (window.scrollY / (max || 1) * 100) + '%';
}, { passive: true });

/* ── 4. Header Glass on Scroll ── */

const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── 5. Canvas Particle Network ── */

ParticleEngine.initHeroCanvas('hero-canvas');
ParticleEngine.initCursorTrail();
ParticleEngine.initSectionAmbient('.error-hero');

/* ── 6. Page Load Timeline ── */

// Set initial states before animation
anime.set('.error-code-wrap', { opacity: 0, scale: 0.65, translateY: -30 });
anime.set('#error-eyebrow',   { opacity: 0, translateY: -20 });
anime.set('#error-headline',  { opacity: 0, translateY: 40 });
anime.set('#error-terminal',  { opacity: 0, translateX: -50 });
anime.set('#error-ctas',      { opacity: 0, translateY: 20 });

const tl = anime.timeline({ easing: 'easeOutExpo' });

tl
  // 404 numbers slam in with elastic bounce
  .add({
    targets: '.error-code-wrap',
    opacity: [0, 1],
    scale: [0.65, 1],
    translateY: [-30, 0],
    duration: 900,
    easing: 'easeOutBack',
    complete: () => {
      // Staggered glitch activation
      const digits = document.querySelectorAll('.error-digit');
      digits.forEach((d, i) => {
        setTimeout(() => d.classList.add('glitching'), i * 120);
      });
    }
  })
  // Eyebrow types in from above
  .add({
    targets: '#error-eyebrow',
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: 500,
  }, '-=500')
  // Headline rises up
  .add({
    targets: '#error-headline',
    opacity: [0, 1],
    translateY: [40, 0],
    duration: 700,
  }, '-=200')
  // Terminal slides in from the left
  .add({
    targets: '#error-terminal',
    opacity: [0, 1],
    translateX: [-50, 0],
    duration: 650,
    complete: startTerminal,
  }, '-=400')
  // CTA buttons bounce in with stagger
  .add({
    targets: '#error-ctas .cta-button',
    opacity: [0, 1],
    scale: [0, 1],
    duration: 600,
    delay: anime.stagger(110),
    easing: 'easeOutBack',
  }, '-=200');

/* ── 7. Terminal Typewriter ── */

async function startTerminal() {
  const body = document.getElementById('terminal-body');
  const pathname = window.location.pathname;

  const lines = [
    { type: 'output',  text: '' },
    { type: 'key-val', key: 'request:    ', val: pathname },
    { type: 'key-val', key: 'method:     ', val: 'GET' },
    { type: 'output',  text: '' },
    { type: 'key-val', key: 'resolve():  ', val: 'null — path not found in /public/' },
    { type: 'error',   text: 'status:      404 Not Found' },
    { type: 'comment', text: '# the path you requested does not exist' },
    { type: 'output',  text: '' },
    { type: 'key-val', key: 'suggestion: ', val: 'return / and try again' },
  ];

  for (const line of lines) {
    if (line.type === 'key-val') {
      const keySpan = document.createElement('span');
      keySpan.className = 't-key';
      keySpan.textContent = line.key;
      body.appendChild(keySpan);

      const valSpan = document.createElement('span');
      valSpan.className = 't-val';
      body.appendChild(valSpan);
      await typewriter(valSpan, line.val, 20);
      body.appendChild(document.createTextNode('\n'));
    } else if (line.type === 'comment') {
      const span = document.createElement('span');
      span.className = 't-comment';
      span.textContent = line.text + '\n';
      body.appendChild(span);
      await sleep(60);
    } else if (line.type === 'error') {
      const span = document.createElement('span');
      span.className = 't-error';
      body.appendChild(span);
      await typewriter(span, line.text, 18);
      body.appendChild(document.createTextNode('\n'));
    } else {
      body.appendChild(document.createTextNode('\n'));
      await sleep(40);
    }
  }

  // Blinking final prompt
  const prompt = document.createElement('span');
  prompt.innerHTML = '<span class="t-prompt">$ </span><span class="typed-cursor">▌</span>';
  body.appendChild(prompt);
}

/* ── 8. Ambient Shake Loop ── */

// AnimeJS-driven periodic shake on the whole code wrap — layered on top of the CSS glitch
function startCodeShake() {
  anime({
    targets: '.error-code-wrap',
    translateX: [0, -7, 9, -4, 2, 0],
    translateY: [0, 4, -3, 2, -1, 0],
    duration: 380,
    easing: 'easeInOutSine',
    complete: () => {
      const delay = 6500 + Math.random() * 4000;
      setTimeout(startCodeShake, delay);
    }
  });
}
// First shake fires after 3.2s (after entry animation settles)
setTimeout(startCodeShake, 3200);

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

/* ── 10. Mobile Menu ── */

function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const overlay      = document.getElementById('mobile-nav-overlay');
  const closeBtn     = document.getElementById('mno-close-btn');
  const mnoLinks     = document.querySelectorAll('.mno-link');

  if (!hamburgerBtn || !overlay) return;

  let isOpen = false;
  let openTL = null;
  let closeTL = null;

  anime.set('.mno-link',     { translateY: '100%' });
  anime.set('.mno-close',    { opacity: 0 });
  anime.set('.mno-tagline',  { opacity: 0 });
  anime.set('.mno-flag-bar', { translateX: '100%' });

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    if (closeTL) closeTL.pause();

    hamburgerBtn.setAttribute('aria-expanded', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    anime.set(overlay, { clipPath: 'inset(0 0 100% 0)' });
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    anime({ targets: '.ham-bar--top', translateY: [0, 7],  rotate: [0, 45],  duration: 380, easing: 'easeInOutExpo' });
    anime({ targets: '.ham-bar--mid', opacity: [1, 0], scaleX: [1, 0], duration: 200, easing: 'easeInExpo' });
    anime({ targets: '.ham-bar--bot', translateY: [0, -7], rotate: [0, -45], duration: 380, easing: 'easeInOutExpo' });

    openTL = anime.timeline({ easing: 'easeOutExpo' });
    openTL
      .add({ targets: overlay,         clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'], duration: 600, easing: 'easeInOutExpo' })
      .add({ targets: '.mno-flag-bar', translateX: ['100%', '0%'], duration: 500, delay: anime.stagger(60, { from: 'last' }), easing: 'easeOutCubic' }, '-=400')
      .add({ targets: '.mno-link',     translateY: ['100%', '0%'], duration: 550, delay: anime.stagger(70), easing: 'easeOutExpo' }, '-=300')
      .add({ targets: ['.mno-close', '.mno-tagline'], opacity: [0, 1], duration: 400, delay: anime.stagger(100), easing: 'easeOutExpo',
             complete: () => { document.getElementById('mno-close-btn')?.focus(); }
           }, '-=300');
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    if (openTL) openTL.pause();

    hamburgerBtn.setAttribute('aria-expanded', 'false');
    overlay.setAttribute('aria-hidden', 'true');
    hamburgerBtn.focus();

    anime({ targets: '.ham-bar--top', translateY: [7, 0],  rotate: [45, 0],  duration: 380, easing: 'easeInOutExpo' });
    anime({ targets: '.ham-bar--mid', opacity: [0, 1], scaleX: [0, 1], duration: 280, delay: 100, easing: 'easeOutExpo' });
    anime({ targets: '.ham-bar--bot', translateY: [-7, 0], rotate: [-45, 0], duration: 380, easing: 'easeInOutExpo' });

    closeTL = anime.timeline({
      complete: () => {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        anime.set('.mno-link',     { translateY: '100%' });
        anime.set('.mno-close',    { opacity: 0 });
        anime.set('.mno-tagline',  { opacity: 0 });
        anime.set('.mno-flag-bar', { translateX: '100%' });
      }
    });
    closeTL
      .add({ targets: '.mno-link', translateY: ['0%', '100%'], duration: 350, delay: anime.stagger(40, { from: 'last' }), easing: 'easeInExpo' })
      .add({ targets: overlay, clipPath: ['inset(0 0 0% 0)', 'inset(0 0 100% 0)'], duration: 450, easing: 'easeInExpo' }, '-=100');
  }

  hamburgerBtn.addEventListener('click', () => isOpen ? closeMenu() : openMenu());
  closeBtn?.addEventListener('click', closeMenu);
  mnoLinks.forEach(link => link.addEventListener('click', () => setTimeout(closeMenu, 80)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeMenu(); });

  overlay.addEventListener('keydown', e => {
    if (!isOpen || e.key !== 'Tab') return;
    const els = [...overlay.querySelectorAll('button, a[href]')];
    if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 992 && isOpen) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      isOpen = false;
      anime.set('.mno-link',     { translateY: '100%' });
      anime.set('.mno-close',    { opacity: 0 });
      anime.set('.mno-tagline',  { opacity: 0 });
      anime.set('.mno-flag-bar', { translateX: '100%' });
      anime.set('.ham-bar--top', { translateY: 0, rotate: 0 });
      anime.set('.ham-bar--mid', { opacity: 1, scaleX: 1 });
      anime.set('.ham-bar--bot', { translateY: 0, rotate: 0 });
    }
  }, { passive: true });
}

initMobileMenu();
