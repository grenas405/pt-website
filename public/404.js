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

/* ── 3. Canvas Particle Network ── */

ParticleEngine.initHeroCanvas('hero-canvas');
ParticleEngine.initCursorTrail();
ParticleEngine.initSectionAmbient('.error-hero');

/* ── 4. Page Load Timeline ── */

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
