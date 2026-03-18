/* ─────────────────────────────────────────────
   about.js — Praxedis Technologies About Page
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

async function typewriterLoop(el, phrases, typingSpeed = 80, deleteSpeed = 40, pauseMs = 1800) {
  let idx = 0;
  while (true) {
    const phrase = phrases[idx % phrases.length];
    await typewriter(el, phrase, typingSpeed);
    await sleep(pauseMs);
    // delete
    await new Promise(resolve => {
      let len = el.textContent.length;
      const del = setInterval(() => {
        if (len <= 0) { clearInterval(del); resolve(); return; }
        el.textContent = phrase.slice(0, --len);
      }, deleteSpeed);
    });
    await sleep(300);
    idx++;
  }
}

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

  document.querySelectorAll('a, button, .building-card, .stack-card').forEach(el => {
    el.addEventListener('mouseenter', () => { dot.classList.add('hovering'); ring.classList.add('hovering'); });
    el.addEventListener('mouseleave', () => { dot.classList.remove('hovering'); ring.classList.remove('hovering'); });
  });
}

/* ── 3. Scroll Progress ── */

const progress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (window.scrollY / max * 100) + '%';
}, { passive: true });

/* ── 4. Header Glass on Scroll ── */

const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── 5. Canvas Particle Network ── */

ParticleEngine.initHeroCanvas('hero-canvas');
ParticleEngine.initCursorTrail();
ParticleEngine.initSectionAmbient('.building-section');
ParticleEngine.initSectionAmbient('.contact-section');

/* ── 6. Page Load Timeline ── */

anime.set(['#hero-eyebrow', '.hero h1', '.hero-sub', '.hero-ctas'], { opacity: 0 });

const tl = anime.timeline({ easing: 'easeOutExpo' });
tl
  .add({ targets: '#hero-eyebrow',  opacity: [0,1], translateY: [-20, 0], duration: 700 })
  .add({ targets: '.hero h1',       opacity: [0,1], translateY: [40, 0],  duration: 800 }, '-=400')
  .add({ targets: '.hero-sub',      opacity: [0,1], translateY: [20, 0],  duration: 700 }, '-=500')
  .add({ targets: '.hero-ctas',     opacity: [0,1], translateY: [20, 0],  duration: 700,
         complete: startHeroTypewriter }, '-=400');

/* ── 7. Hero Typewriter Loop ── */

function startHeroTypewriter() {
  const typed = document.getElementById('hero-typed');
  // Append a blinking cursor span
  const cur = document.createElement('span');
  cur.className = 'typed-cursor';
  cur.textContent = '▌';
  typed.parentNode.insertBefore(cur, typed.nextSibling);

  typewriterLoop(typed, ['architect.', 'developer.', 'disruptor.', 'one person.'], 90, 45, 2000);
}

/* ── 8. Scroll Observers ── */

// §2 — Terminal card typewriter
once('#terminal-card', async () => {
  // Count-up stats
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.dataset.target;
    anime({ targets: el, innerHTML: [0, target], round: 1, duration: 1600, easing: 'easeOutExpo',
      update: function(a) { el.innerHTML = Math.round(a.animations[0].currentValue); } });
  });

  const body = document.getElementById('terminal-body');
  const lines = [
    { type: 'output', text: '' },
    { type: 'key-val', key: 'name:     ', val: 'Pedro M. Dominguez' },
    { type: 'key-val', key: 'role:     ', val: 'Founder & Operator, Praxedis Technologies' },
    { type: 'key-val', key: 'location: ', val: 'United States 🇺🇸  |  Chihuahua in spirit 🇲🇽' },
    { type: 'comment',  text: '' },
    { type: 'key-val', key: 'stack:    ', val: 'Deno · TypeScript · Linux · nginx · systemd' },
    { type: 'key-val', key: 'approach: ', val: 'Unix philosophy — one module, one job' },
    { type: 'key-val', key: 'velocity: ', val: 'Mag 7 speed. Solo execution.' },
    { type: 'comment',  text: '' },
    { type: 'key-val', key: 'mission:  ', val: '"One person. Infinite leverage."' },
    { type: 'comment',  text: '# zero friction, 100% accountability' },
  ];

  for (const line of lines) {
    const span = document.createElement('span');
    if (line.type === 'key-val') {
      span.innerHTML = `<span class="t-key">${line.key}</span>`;
      body.appendChild(span);
      // type the value
      const valSpan = document.createElement('span');
      valSpan.className = 't-val';
      body.appendChild(valSpan);
      await typewriter(valSpan, line.val, 22);
      body.appendChild(document.createTextNode('\n'));
    } else if (line.type === 'comment') {
      span.className = 't-comment';
      span.textContent = line.text + '\n';
      body.appendChild(span);
      await sleep(60);
    } else {
      body.appendChild(document.createTextNode('\n'));
      await sleep(40);
    }
  }
  // final prompt
  const prompt = document.createElement('span');
  prompt.innerHTML = '<span class="t-prompt">$ </span><span class="typed-cursor">▌</span>';
  body.appendChild(prompt);
});

// §3 — Building cards: per-card title typewriter
once('#building', async (section) => {
  const cards = section.querySelectorAll('.building-card');
  for (const card of cards) {
    const title = card.dataset.title;
    const h3 = card.querySelector('.card-title-typed');
    // brief stagger between cards
    await sleep(150);
    typewriter(h3, title, 45);
  }
});

// §3 — Terminal strip: sequential command typing
once('#terminal-strip', async () => {
  const body = document.getElementById('terminal-strip-body');
  const steps = [
    {
      cmd: 'deno run --allow-net --allow-read=./public --allow-env server/main.ts',
      response: 'Serving on http://127.0.0.1:8000',
      responseClass: 't-success'
    },
    {
      cmd: 'systemctl --user enable --now praxedis-technologies',
      response: 'Created symlink /etc/systemd/user/default.target.wants/praxedis-technologies.service',
      responseClass: 't-response'
    },
    {
      cmd: 'nginx -t && systemctl reload nginx',
      response: 'nginx: configuration file /etc/nginx/nginx.conf test is successful',
      responseClass: 't-success'
    },
  ];

  for (const step of steps) {
    const lineEl = document.createElement('div');
    const promptSpan = document.createElement('span');
    promptSpan.className = 't-prompt';
    promptSpan.textContent = '$ ';
    const cmdSpan = document.createElement('span');
    cmdSpan.className = 't-cmd';
    lineEl.appendChild(promptSpan);
    lineEl.appendChild(cmdSpan);
    body.appendChild(lineEl);

    await typewriter(cmdSpan, step.cmd, 28);
    await sleep(300);

    const respEl = document.createElement('div');
    respEl.className = step.responseClass;
    body.appendChild(respEl);
    await typewriter(respEl, step.response, 14);
    body.appendChild(document.createTextNode('\n'));
    await sleep(500);
  }

  const finalPrompt = document.createElement('div');
  finalPrompt.innerHTML = '<span class="t-prompt">$ </span><span class="typed-cursor">▌</span>';
  body.appendChild(finalPrompt);
});

// §4 — Stack cards: trigger CSS animation
once('#stack', (section) => {
  section.querySelector('.stack-cards').classList.add('revealed');
});

// §5 — Philosophy stats count-up
once('#philosophy', () => {
  document.querySelectorAll('.phil-num').forEach(el => {
    const target = +el.dataset.target;
    if (!isNaN(target)) {
      anime({ targets: el, innerHTML: [0, target], round: 1, duration: 1400, easing: 'easeOutExpo',
        update: function(a) { el.innerHTML = Math.round(a.animations[0].currentValue); } });
    }
  });
});

// §6 — Contact section reveal
once('#contact', () => {
  anime({
    targets: ['.contact-manifesto', '.contact-title', '.contact-ctas'],
    opacity: [0, 1], translateY: [30, 0],
    duration: 700, easing: 'easeOutExpo', delay: anime.stagger(150),
    complete: () => {
      anime({
        targets: '.cta-button.large-green',
        scale: [1, 1.04, 1],
        duration: 2200, easing: 'easeInOutSine', loop: true
      });
    }
  });
});

/* ── 9. Interactive: 3D Card Tilt ── */

document.querySelectorAll('.building-card, .stack-card').forEach(card => {
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

/* ── 10. Magnetic CTA Buttons ── */

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

/* ── 11. Building card border flash on hover ── */

document.querySelectorAll('.building-card, .stack-card').forEach(card => {
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

// ── 12. MOBILE MENU ──────────────────────────────────────────
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
    // Set clip-path before adding is-open (display:flex) to prevent flash
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
