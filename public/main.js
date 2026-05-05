/**
 * main.js — Praxedis Technologies Animation Controller
 * AnimeJS 3.2.1 | Vanilla canvas | No build tools
 *
 * Sections:
 *  1.  Helpers — splitLetters(), splitWords()
 *  2.  Custom cursor
 *  3.  Canvas particle network (hero background)
 *  4.  Page-load resets — anime.set()
 *  5.  Hero load timeline
 *  6.  Text scramble on headline (post-load)
 *  7.  Scroll animations — IntersectionObserver
 *  8.  Ambient loops
 *  9.  Magnetic CTA buttons
 *  10. 3D card tilt
 *  11. Parallax on hero stripes
 *  12. Interactive — capability card border flash
 */

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // 1. HELPERS
  // ============================================================

  function splitLetters(el) {
    const text = el.textContent;
    el.textContent = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.style.display = 'inline-block';
      span.textContent = char === ' ' ? '\u00A0' : char;
      el.appendChild(span);
    });
    return el.querySelectorAll('.letter');
  }

  // ============================================================
  // 2. CUSTOM CURSOR
  // ============================================================

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  if (dot && ring && window.matchMedia('(hover: hover)').matches) {
    let ringX = 0, ringY = 0;
    let mouseX = 0, mouseY = 0;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top  = mouseY + 'px';
    });

    // Ring follows with lerp lag
    (function ringLoop() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
      requestAnimationFrame(ringLoop);
    })();

    // Scale up on interactive elements
    const interactiveEls = document.querySelectorAll('a, button, .capability-card, .vision-card');
    interactiveEls.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }


  // ============================================================
  // 3. CANVAS PARTICLE NETWORK (hero background)
  // ============================================================

  ParticleEngine.initHeroCanvas('hero-canvas');
  ParticleEngine.initCursorTrail();
  ParticleEngine.initSectionAmbient('.capabilities-section.dark');
  ParticleEngine.initSectionAmbient('.contact-section');
  ParticleEngine.initContactUniverse('contact-canvas');


  // ============================================================
  // 4. PAGE-LOAD RESETS
  // ============================================================

  const logoGreenLetters = splitLetters(document.querySelector('.logo .green'));
  const logoWhiteLetters = splitLetters(document.querySelector('.logo .white'));

  anime.set(logoGreenLetters,  { opacity: 0, translateY: -30 });
  anime.set(logoWhiteLetters,  { opacity: 0, translateY: -30 });
  anime.set('.nav-links li',   { opacity: 0, translateY: -20 });
  anime.set('.hero-eyebrow',   { opacity: 0, translateY: 20 });
  anime.set('.hero-line-1',    { opacity: 0, translateX: -60 });
  anime.set('.hero-line-2',    { opacity: 0, translateX: 60 });
  anime.set('.hero p',         { opacity: 0, translateY: 30 });
  anime.set('.hero-actions a', { opacity: 0, scale: 0 });
  anime.set('.vision-card',           { opacity: 0, translateY: 30 });
  anime.set('.stat-item',             { opacity: 0, translateY: 20 });
  anime.set('.heritage-quote-bubble', { opacity: 0, translateY: 20 });

  if (window.innerWidth > 992) {
    anime.set('.stripe', { translateX: '120%' });
  }


  // ============================================================
  // 5. HERO LOAD TIMELINE
  // ============================================================

  const heroTL = anime.timeline({ easing: 'easeOutExpo' });

  heroTL.add({
    targets: logoGreenLetters,
    opacity: [0, 1],
    translateY: [-30, 0],
    duration: 600,
    delay: anime.stagger(40),
  });

  heroTL.add({
    targets: logoWhiteLetters,
    opacity: [0, 1],
    translateY: [-30, 0],
    duration: 600,
    delay: anime.stagger(30),
  }, '-=200');

  heroTL.add({
    targets: '.nav-links li',
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: 500,
    delay: anime.stagger(80),
  }, '-=100');

  if (window.innerWidth > 992) {
    heroTL.add({
      targets: '.stripe',
      translateX: ['120%', '0%'],
      duration: 700,
      delay: anime.stagger(120, { from: 'last' }),
      easing: 'easeOutCubic',
    }, '-=300');
  } else {
    heroTL.add({ targets: 'body', duration: 1 }, '-=300');
  }

  heroTL.add({
    targets: '.hero-eyebrow',
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 500,
  }, '-=500');

  heroTL.add({
    targets: '.hero-line-1',
    opacity: [0, 1],
    translateX: [-60, 0],
    duration: 700,
  }, '-=300');

  heroTL.add({
    targets: '.hero-line-2',
    opacity: [0, 1],
    translateX: [60, 0],
    duration: 800,
  }, '-=500');

  heroTL.add({
    targets: '.hero p',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
  }, '-=300');

  heroTL.add({
    targets: '.hero-actions a',
    opacity: [0, 1],
    scale: [0, 1],
    duration: 600,
    delay: anime.stagger(100),
    easing: 'easeOutBack',
    complete: () => {
      document.querySelectorAll('.hero-actions a').forEach(btn => {
        anime.remove(btn);
        btn.style.transform = '';
      });
      // Trigger text scramble after hero loads
      scrambleText('.hero-line-2', 'Mag 7 Speed.');
    },
  }, '-=200');


  // ============================================================
  // 7. TEXT SCRAMBLE (matrix-style) on hero headline
  // ============================================================

  function scrambleText(selector, finalText) {
    const el = document.querySelector(selector);
    if (!el) return;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
    const duration = 1200;
    const resolveDelay = 80; // ms per character resolved
    let frame = 0;
    let startTime = null;
    const textLen = finalText.length;
    let resolved = new Array(textLen).fill(false);

    function randomChar() {
      return chars[Math.floor(Math.random() * chars.length)];
    }

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      frame++;

      // Resolve chars one by one, left to right
      const resolveIndex = Math.floor(elapsed / resolveDelay);
      for (let i = 0; i <= resolveIndex && i < textLen; i++) {
        resolved[i] = true;
      }

      let display = '';
      for (let i = 0; i < textLen; i++) {
        if (resolved[i]) {
          display += finalText[i];
        } else {
          display += randomChar();
        }
      }

      // Use innerHTML to preserve gradient (the span wraps the whole text)
      el.textContent = display;

      if (resolved.every(Boolean)) return; // done
      if (elapsed < duration + textLen * resolveDelay) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
      }
    }

    // Small delay before starting scramble
    setTimeout(() => requestAnimationFrame(tick), 800);
  }


  // ============================================================
  // 8. SCROLL ANIMATIONS (IntersectionObserver)
  // ============================================================

  function createObserver(selector, fn, threshold) {
    threshold = threshold || 0.15;
    const el = document.querySelector(selector);
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          fn(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold });
    observer.observe(el);
  }


  // --- VISION SECTION ---
  createObserver('.vision-section', () => {

    anime({
      targets: '.vision-text h2',
      opacity: [0, 1],
      translateX: [-40, 0],
      duration: 600,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.vision-text .red-line',
      width: ['0px', '50px'],
      duration: 400,
      delay: 50,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.vision-text p',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay: 450,
      easing: 'easeOutExpo',
    });

    // Stats grid items
    anime({
      targets: '.stat-item',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay: anime.stagger(100, { start: 500 }),
      easing: 'easeOutExpo',
    });

    // Animated number counters
    document.querySelectorAll('.stat-number[data-target]').forEach((el, i) => {
      const endValue = parseInt(el.getAttribute('data-target'), 10);
      const suffix   = el.getAttribute('data-suffix') || '';
      const prefix   = el.getAttribute('data-prefix') || '';
      el.textContent = prefix + '0' + suffix;

      anime({
        targets: { count: 0 },
        count: endValue,
        duration: 1400,
        delay: 600 + i * 150,
        easing: 'easeOutExpo',
        update(anim) {
          el.textContent = prefix + Math.round(anim.animations[0].currentValue) + suffix;
        },
        complete() {
          anime({
            targets: el,
            scale: [1, 1.2, 1],
            duration: 350,
            easing: 'easeOutBack',
          });
        },
      });
    });

    // Vision card stack entrance, then trigger progress bar fills
    anime({
      targets: '.vision-card',
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 700,
      delay: anime.stagger(180, { start: 250 }),
      easing: 'easeOutExpo',
      complete() {
        document.querySelectorAll('.vision-card-bar-fill').forEach((bar, i) => {
          const targetWidth = bar.getAttribute('data-width') || '0';
          anime({
            targets: bar,
            width: ['0%', targetWidth + '%'],
            duration: 900,
            delay: i * 200,
            easing: 'easeInOutExpo',
          });
        });
      },
    });

  });


  // --- CAPABILITIES SECTION ---
  createObserver('.capabilities-section', () => {

    anime({
      targets: '.capabilities-eyebrow',
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 400,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.capabilities-section .section-title',
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 600,
      delay: 100,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.capabilities-intro',
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 400,
      delay: 200,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.capability-card',
      opacity: [0, 1],
      translateY: [60, 0],
      duration: 700,
      delay: anime.stagger(100, { start: 300 }),
      easing: 'easeOutExpo',
      complete() {
        document.querySelectorAll('.capability-card').forEach(card => {
          anime.remove(card);
          card.style.transform = '';
        });
      },
    });
  });


  // --- HERITAGE SECTION ---
  createObserver('.heritage-section', () => {

    anime({
      targets: '.heritage-eyebrow',
      opacity: [0, 1],
      translateX: [40, 0],
      duration: 400,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.heritage-text h2',
      opacity: [0, 1],
      translateX: [40, 0],
      duration: 700,
      delay: 100,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.mexican-flag-accent',
      clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
      duration: 900,
      delay: 200,
      easing: 'easeInOutExpo',
    });

    anime({
      targets: '.heritage-text p',
      opacity: [0, 1],
      translateX: [40, 0],
      duration: 600,
      delay: anime.stagger(150, { start: 250 }),
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.heritage-quote-bubble',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      delay: 700,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.heritage-location',
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 400,
      delay: 900,
      easing: 'easeOutExpo',
    });
  });


  // --- CONTACT SECTION ---
  createObserver('.contact-section', () => {

    anime({
      targets: '.contact-manifesto',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.contact-section h2',
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 700,
      delay: 200,
      easing: 'easeOutBack',
    });

    anime({
      targets: '.contact-section .container > p',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay: 400,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.cta-button.large-green',
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 700,
      delay: 600,
      easing: 'easeOutBack',
      complete() { startContactPulse(); },
    });
  });


  // ============================================================
  // 9. AMBIENT LOOPS
  // ============================================================

  anime({
    targets: '.vision-card-icon',
    translateY: [-6, 0],
    duration: 2200,
    loop: true,
    direction: 'alternate',
    easing: 'easeInOutSine',
  });

  function startContactPulse() {
    anime({
      targets: '.cta-button.large-green',
      scale: [1, 1.04, 1],
      duration: 2200,
      loop: true,
      easing: 'easeInOutSine',
    });
  }


  // ============================================================
  // 10. MAGNETIC CTA BUTTONS
  // ============================================================

  document.querySelectorAll('.cta-button').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      anime({
        targets: btn,
        translateX: dx * 0.28,
        translateY: dy * 0.28,
        duration: 350,
        easing: 'easeOutExpo',
      });
    });

    btn.addEventListener('mouseleave', () => {
      anime({
        targets: btn,
        translateX: 0,
        translateY: 0,
        duration: 600,
        easing: 'easeOutElastic(1, 0.5)',
      });
    });
  });


  // ============================================================
  // 11. 3D CARD TILT
  // ============================================================

  document.querySelectorAll('.capability-card').forEach(card => {
    const MAX_TILT = 12;

    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;   // 0–1
      const y = (e.clientY - r.top)  / r.height;  // 0–1
      const rotX = (0.5 - y) * MAX_TILT * 2;
      const rotY = (x - 0.5) * MAX_TILT * 2;

      // Update gradient sheen position
      card.style.setProperty('--mx', (x * 100) + '%');
      card.style.setProperty('--my', (y * 100) + '%');

      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
      card.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  });


  // ============================================================
  // 12. PARALLAX ON HERO STRIPES (desktop only)
  // ============================================================

  if (window.innerWidth > 992) {
    const decoration = document.querySelector('.hero-decoration');
    window.addEventListener('scroll', () => {
      if (decoration) {
        const y = window.scrollY;
        decoration.style.transform = `skewX(-20deg) translateY(${y * 0.25}px)`;
      }
    }, { passive: true });
  }


  // ============================================================
  // 13. CAPABILITY CARD BORDER COLOR FLASH ON HOVER (AnimeJS)
  //     (works alongside the 3D tilt above)
  // ============================================================

  document.querySelectorAll('.capability-card').forEach(card => {
    let borderAnim = null;

    card.addEventListener('mouseenter', () => {
      if (borderAnim) borderAnim.pause();
      borderAnim = anime({
        targets: card,
        borderTopColor: [
          { value: '#006847', duration: 0 },
          { value: '#ce1126', duration: 300 },
          { value: '#006847', duration: 400 },
        ],
        easing: 'easeInOutQuad',
      });
    });

    card.addEventListener('mouseleave', () => {
      if (borderAnim) borderAnim.pause();
      anime({
        targets: card,
        borderTopColor: '#006847',
        duration: 200,
        easing: 'easeOutQuad',
      });
    });
  });

}); // end DOMContentLoaded
