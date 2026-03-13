/**
 * main.js — Praxedis Technologies AnimeJS Animation Controller
 * AnimeJS 3.2.1 | Static site, no build tools
 *
 * Sections:
 *  1. Helper — splitLetters()
 *  2. Page-load resets — anime.set()
 *  3. Hero load timeline — anime.timeline()
 *  4. Scroll animations — IntersectionObserver
 *  5. Ambient loops
 *  6. Interactive — capability card hover
 */

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // 1. HELPER — splitLetters
  // Wraps each character in a display:inline-block <span> so
  // AnimeJS can animate individual letters.
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

  const logoGreenLetters = splitLetters(document.querySelector('.logo .green'));
  const logoWhiteLetters = splitLetters(document.querySelector('.logo .white'));


  // ============================================================
  // 2. PAGE-LOAD RESETS
  // Hide synchronously before any paint so the timeline reveals them.
  // ============================================================

  anime.set(logoGreenLetters,  { opacity: 0, translateY: -30 });
  anime.set(logoWhiteLetters,  { opacity: 0, translateY: -30 });
  anime.set('.nav-links li',   { opacity: 0, translateY: -20 });
  anime.set('.hero-line-1',    { opacity: 0, translateX: -60 });
  anime.set('.hero-line-2',    { opacity: 0, translateX: 60 });
  anime.set('.hero p',         { opacity: 0, translateY: 30 });
  anime.set('.hero-actions a', { opacity: 0, scale: 0 });

  // Stripes only on desktop (hidden via CSS on mobile)
  if (window.innerWidth > 992) {
    anime.set('.stripe', { translateX: '120%' });
  }


  // ============================================================
  // 3. HERO LOAD TIMELINE (~2.2s total)
  // ============================================================

  const heroTL = anime.timeline({ easing: 'easeOutExpo' });

  // Step 1 — Logo green "Praxedis" letters slide down
  heroTL.add({
    targets: logoGreenLetters,
    opacity: [0, 1],
    translateY: [-30, 0],
    duration: 600,
    delay: anime.stagger(40),
  });

  // Step 2 — Logo white "Technologies" letters
  heroTL.add({
    targets: logoWhiteLetters,
    opacity: [0, 1],
    translateY: [-30, 0],
    duration: 600,
    delay: anime.stagger(30),
  }, '-=200');

  // Step 3 — Nav links fade in from above
  heroTL.add({
    targets: '.nav-links li',
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: 500,
    delay: anime.stagger(80),
  }, '-=100');

  // Step 4 — Hero stripes slide in from right (desktop only)
  if (window.innerWidth > 992) {
    heroTL.add({
      targets: '.stripe',
      translateX: ['120%', '0%'],
      duration: 700,
      delay: anime.stagger(120, { from: 'last' }),
      easing: 'easeOutCubic',
    }, '-=300');
  } else {
    // No-op placeholder to keep timeline offsets correct
    heroTL.add({ targets: 'body', duration: 1 }, '-=300');
  }

  // Step 5 — "One Person." slides in from left
  heroTL.add({
    targets: '.hero-line-1',
    opacity: [0, 1],
    translateX: [-60, 0],
    duration: 700,
  }, '-=400');

  // Step 6 — "Mag 7 Speed." slides in from right with glow burst
  heroTL.add({
    targets: '.hero-line-2',
    opacity: [0, 1],
    translateX: [60, 0],
    duration: 800,
    begin: () => {
      const el = document.querySelector('.hero-line-2');
      el.style.transition = 'text-shadow 0.4s ease-out';
      el.style.textShadow = '0 0 30px #006847, 2px 2px 0px #ce1126';
    },
    complete: () => {
      const el = document.querySelector('.hero-line-2');
      el.style.textShadow = '2px 2px 0px #ce1126';
      el.style.transition = '';
    },
  }, '-=500');

  // Step 7 — Hero paragraph fades up
  heroTL.add({
    targets: '.hero p',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
  }, '-=300');

  // Step 8 — CTA buttons bounce in; clear inline transforms on complete
  // so CSS :hover transforms are not blocked by AnimeJS inline styles
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
    },
  }, '-=200');


  // ============================================================
  // 4. SCROLL ANIMATIONS (IntersectionObserver)
  // Helper fires the animation fn once per element, then unobserves.
  // ============================================================

  function createObserver(selector, fn, threshold) {
    threshold = threshold || 0.2;
    const el = document.querySelector(selector);
    if (!el) return;
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          fn(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: threshold });
    observer.observe(el);
  }


  // --- VISION SECTION ---
  createObserver('.vision-section', function() {

    // h2 and red-line animate together — red-line is a child of h2,
    // so it must be visible (h2 opacity > 0) while it expands.
    // Both start at delay:0; easeOutExpo on h2 brings it to ~90%
    // opacity within the first ~150ms, making the line expansion visible.
    anime({
      targets: '.vision-text h2',
      opacity: [0, 1],
      translateX: [-40, 0],
      duration: 600,
      easing: 'easeOutExpo',
    });

    // Red accent line expands simultaneously with h2
    anime({
      targets: '.vision-text .red-line',
      width: ['0px', '50px'],
      duration: 400,
      delay: 50,
      easing: 'easeOutExpo',
    });

    // Paragraph fades in
    anime({
      targets: '.vision-text p',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay: 450,
      easing: 'easeOutExpo',
    });

    // Stats: entrance + count-up for numeric values
    document.querySelectorAll('.stats li').forEach(function(li, i) {
      anime({
        targets: li,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        delay: 500 + (i * 120),
        easing: 'easeOutExpo',
      });

      var strong = li.querySelector('strong');
      if (!strong) return;
      var originalText = strong.textContent.trim();
      var numMatch = originalText.match(/^(\d+)/);
      if (!numMatch) return; // "Mag 7" — entrance only, no count-up

      var endValue = parseInt(numMatch[1], 10);
      var suffix = originalText.slice(numMatch[0].length);
      strong.textContent = '0' + suffix;

      anime({
        targets: { count: 0 },
        count: endValue,
        duration: 1200,
        delay: 600 + (i * 150),
        easing: 'easeOutExpo',
        update: function(anim) {
          strong.textContent = Math.round(anim.animations[0].currentValue) + suffix;
        },
        complete: function() {
          anime({
            targets: strong,
            scale: [1, 1.2, 1],
            duration: 300,
            easing: 'easeOutBack',
          });
        },
      });
    });

    // Vision graphic scales in
    anime({
      targets: '.vision-graphic',
      opacity: [0, 1],
      scale: [0.85, 1],
      duration: 700,
      delay: 200,
      easing: 'easeOutExpo',
    });
  });


  // --- CAPABILITIES SECTION ---
  createObserver('.capabilities-section', function() {

    anime({
      targets: '.capabilities-section .section-title',
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 600,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.capability-card',
      opacity: [0, 1],
      translateY: [60, 0],
      duration: 700,
      delay: anime.stagger(150, { start: 200 }),
      easing: 'easeOutExpo',
      complete: function() {
        document.querySelectorAll('.capability-card').forEach(function(card) {
          anime.remove(card);
          card.style.transform = '';
        });
      },
    });
  });


  // --- HERITAGE SECTION ---
  createObserver('.heritage-section', function() {

    anime({
      targets: '.heritage-text h2',
      opacity: [0, 1],
      translateX: [40, 0],
      duration: 700,
      easing: 'easeOutExpo',
    });

    // Mexican flag reveals left-to-right via clip-path
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
  });


  // --- CONTACT SECTION ---
  createObserver('.contact-section', function() {

    anime({
      targets: '.contact-section h2',
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 700,
      easing: 'easeOutBack',
    });

    anime({
      targets: '.contact-section .container > p',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      delay: 300,
      easing: 'easeOutExpo',
    });

    anime({
      targets: '.cta-button.large-green',
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 700,
      delay: 500,
      easing: 'easeOutBack',
      complete: function() {
        startContactPulse();
      },
    });
  });


  // ============================================================
  // 5. AMBIENT LOOPS
  // ============================================================

  // ⚡ icon gentle float — runs immediately, always
  anime({
    targets: '.tech-card .icon',
    translateY: [-8, 0],
    duration: 2000,
    loop: true,
    direction: 'alternate',
    easing: 'easeInOutSine',
  });

  // Contact CTA breathing pulse (called after bounce-in completes)
  function startContactPulse() {
    anime({
      targets: '.cta-button.large-green',
      scale: [1, 1.03, 1],
      duration: 2000,
      loop: true,
      easing: 'easeInOutSine',
    });
  }


  // ============================================================
  // 6. INTERACTIVE — Capability card border color flash on hover
  // ============================================================

  document.querySelectorAll('.capability-card').forEach(function(card) {
    var borderAnim = null;

    card.addEventListener('mouseenter', function() {
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

    card.addEventListener('mouseleave', function() {
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
