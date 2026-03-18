/**
 * particles.js — Praxedis Technologies Shared Particle Engine
 * Exposes: window.ParticleEngine
 *   .initHeroCanvas(canvasId)
 *   .initCursorTrail()
 *   .initSectionAmbient(sectionSelector)
 */

window.ParticleEngine = (() => {

  // ── Palette ──────────────────────────────────────────────────
  const COLORS = [
    '#006847',   // Mexican green
    '#00a868',   // light green
    '#00ff9f',   // neon green (glow)
    '#ce1126',   // Mexican red
    '#ff6b7a',   // neon red (glow)
    'rgba(255,255,255,0.85)', // white
  ];

  // Matching glow colors (for canvas shadowColor)
  const GLOW = [
    '#00ff9f',
    '#00ff9f',
    '#00ff9f',
    '#ff4444',
    '#ff4444',
    'rgba(255,255,255,0.6)',
  ];

  // ============================================================
  // initHeroCanvas(canvasId)
  // ============================================================

  function initHeroCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx    = canvas.getContext('2d');
    const isMobile = !window.matchMedia('(hover: hover)').matches;
    const COUNT  = isMobile ? 70 : 140;
    const CONNECT_DIST = 130;
    const REPEL_DIST   = 120;
    const ATTRACT_DIST = 220;

    let W, H;
    let mouse   = { x: -9999, y: -9999 };
    let particles = [];
    let bursts    = [];
    let canvasRect = canvas.getBoundingClientRect();

    // ── resize ──
    function resize() {
      W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
      H = canvas.height = canvas.offsetHeight || window.innerHeight;
      canvasRect = canvas.getBoundingClientRect();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // ── mouse tracking ──
    window.addEventListener('mousemove', e => {
      mouse.x = e.clientX - canvasRect.left;
      mouse.y = e.clientY - canvasRect.top;
    });
    canvas.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    // ── click burst ──
    canvas.addEventListener('click', e => {
      const cx = e.clientX - canvasRect.left;
      const cy = e.clientY - canvasRect.top;
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 3 + Math.random() * 5;
        const ci    = Math.floor(Math.random() * COLORS.length);
        bursts.push({
          x:     cx,
          y:     cy,
          vx:    Math.cos(angle) * speed,
          vy:    Math.sin(angle) * speed,
          r:     1.5 + Math.random() * 2.5,
          color: COLORS[ci],
          glow:  GLOW[ci],
          alpha: 1,
          life:  0,
          maxLife: 0.55 + Math.random() * 0.2, // seconds
        });
      }
    });

    // ── Particle class ──
    class Particle {
      constructor() { this.reset(true); }

      reset(initial = false) {
        this.x  = Math.random() * W;
        this.y  = initial ? Math.random() * H : (Math.random() < 0.5 ? -10 : H + 10);
        this.vx = (Math.random() - 0.5) * 0.55;
        this.vy = (Math.random() - 0.5) * 0.55;

        const ci      = Math.floor(Math.random() * COLORS.length);
        this.color    = COLORS[ci];
        this.glow     = GLOW[ci];
        this.baseR    = 0.8 + Math.random() * 2.2;
        this.r        = this.baseR;
        this.alpha    = 0.35 + Math.random() * 0.5;
        this.pulseSpeed  = 0.8 + Math.random() * 1.4;
        this.pulsePhase  = Math.random() * Math.PI * 2;
        this.glowRadius  = 8 + Math.random() * 10;
      }

      update(t) {
        // Wave drift
        this.vx += Math.sin(t * 0.0008 + this.y * 0.005) * 0.003;
        this.vy += Math.cos(t * 0.0006 + this.x * 0.004) * 0.003;

        // Mouse repulsion + attraction
        const dx   = this.x - mouse.x;
        const dy   = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_DIST && dist > 0) {
          const force = ((REPEL_DIST - dist) / REPEL_DIST) * 3.5;
          this.vx += (dx / dist) * force * 0.04;
          this.vy += (dy / dist) * force * 0.04;
        } else if (dist < ATTRACT_DIST && dist > 0) {
          const force = ((dist - REPEL_DIST) / (ATTRACT_DIST - REPEL_DIST)) * 0.6;
          this.vx -= (dx / dist) * force * 0.012;
          this.vy -= (dy / dist) * force * 0.012;
        }

        // Damping
        this.vx *= 0.985;
        this.vy *= 0.985;

        this.x += this.vx;
        this.y += this.vy;

        // Pulse radius
        this.r = this.baseR + Math.sin(t * 0.001 * this.pulseSpeed + this.pulsePhase) * 0.7;

        // Wrap edges
        if (this.x < -12)    this.x = W + 12;
        if (this.x > W + 12) this.x = -12;
        if (this.y < -12)    this.y = H + 12;
        if (this.y > H + 12) this.y = -12;
      }

      draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle   = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.r), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── init particles ──
    for (let i = 0; i < COUNT; i++) {
      particles.push(new Particle());
    }

    // ── connections ──
    const CONNECT_DIST2    = CONNECT_DIST * CONNECT_DIST;   // 16900
    const MOUSE_BOOST_DIST2 = 200 * 200;                    // 40000

    function drawConnections() {
      ctx.lineWidth   = 0.8;
      ctx.strokeStyle = 'rgba(0, 200, 120, 1)';
      ctx.shadowBlur  = 0;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx    = a.x - b.x, dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 >= CONNECT_DIST2) continue;

          const dist  = Math.sqrt(dist2);
          const mdxA  = a.x - mouse.x, mdyA = a.y - mouse.y;
          const mdxB  = b.x - mouse.x, mdyB = b.y - mouse.y;
          const near  = (mdxA*mdxA + mdyA*mdyA < MOUSE_BOOST_DIST2 ||
                         mdxB*mdxB + mdyB*mdyB < MOUSE_BOOST_DIST2);
          ctx.globalAlpha = (1 - dist / CONNECT_DIST) * 0.28 * (near ? 1.5 : 1.0);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    }

    // ── burst update/draw ──
    function updateBursts(dt) {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life += dt;
        const progress = b.life / b.maxLife;
        if (progress >= 1) { bursts.splice(i, 1); continue; }

        b.vx *= 0.94;
        b.vy *= 0.94;
        b.x  += b.vx;
        b.y  += b.vy;

        const alpha = 1 - progress;
        ctx.save();
        ctx.globalAlpha = alpha * 0.95;
        ctx.shadowBlur  = 12;
        ctx.shadowColor = b.glow;
        ctx.fillStyle   = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── main loop ──
    let lastTime = 0;
    function loop(t) {
      const dt = (t - lastTime) / 1000; // seconds
      lastTime  = t;

      // Ghost trail — semi-transparent clear for comet tails
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);

      // Update + draw particles
      particles.forEach(p => p.update(t));
      drawConnections();
      particles.forEach(p => p.draw());

      // Burst sparks
      updateBursts(dt);

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }


  // ============================================================
  // initCursorTrail()
  // ============================================================

  function initCursorTrail() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (typeof anime === 'undefined') return;

    const POOL_SIZE   = 20;
    const SPAWN_EVERY = 45; // ms

    const TRAIL_COLORS = ['#00ff9f', '#006847', '#ce1126', '#ffffff', '#00a868', '#ff6b7a'];

    // Build DOM pool
    const pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'cursor-trail-particle';
      el.style.cssText = 'width:5px;height:5px;opacity:0;';
      document.body.appendChild(el);
      pool.push(el);
    }
    let poolIdx = 0;

    let lastSpawn = 0;

    document.addEventListener('mousemove', e => {
      const now = performance.now();
      if (now - lastSpawn < SPAWN_EVERY) return;
      lastSpawn = now;

      const el    = pool[poolIdx % POOL_SIZE];
      poolIdx++;

      const color = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];
      const size  = 4 + Math.random() * 3;

      el.style.left      = e.clientX + 'px';
      el.style.top       = e.clientY + 'px';
      el.style.width     = size + 'px';
      el.style.height    = size + 'px';
      el.style.background = color;
      el.style.boxShadow = `0 0 ${size * 2}px ${color}`;

      anime.remove(el);
      anime({
        targets:    el,
        translateX: [(Math.random() - 0.5) * 28, (Math.random() - 0.5) * 40],
        translateY: [0, Math.random() * 24 + 8],
        scale:      [1, 0],
        opacity:    [0.92, 0],
        duration:   680 + Math.random() * 200,
        easing:     'easeOutCubic',
      });
    }, { passive: true });
  }


  // ============================================================
  // initSectionAmbient(sectionSelector)
  // ============================================================

  function initSectionAmbient(sectionSelector) {
    const section = document.querySelector(sectionSelector);
    if (!section) return;

    // Ensure relative positioning for absolute children
    const pos = window.getComputedStyle(section).position;
    if (pos === 'static') section.style.position = 'relative';

    const layer = document.createElement('div');
    layer.className = 'ambient-layer';
    section.insertBefore(layer, section.firstChild);

    const AMBIENT_COLORS = [
      { c: '#006847', a: 0.18 },
      { c: '#00a868', a: 0.14 },
      { c: '#00ff9f', a: 0.10 },
      { c: '#ce1126', a: 0.14 },
      { c: '#ffffff', a: 0.08 },
    ];

    const COUNT = 20;

    for (let i = 0; i < COUNT; i++) {
      const el    = document.createElement('div');
      el.className = 'ambient-particle';

      const ci    = Math.floor(Math.random() * AMBIENT_COLORS.length);
      const col   = AMBIENT_COLORS[ci];
      const size  = 2 + Math.random() * 4;  // 2–6px
      const dur   = 12 + Math.random() * 12; // 12–24s
      const delay = -(Math.random() * dur);   // stagger: negative = already in-progress

      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        bottom: ${Math.random() * 20}%;
        background: ${col.c};
        box-shadow: 0 0 ${size * 3}px ${col.c};
        --ap-alpha: ${col.a};
        animation: ambient-float ${dur}s ${delay}s linear infinite;
        border-radius: 50%;
      `;

      layer.appendChild(el);
    }
  }


  // ── Public API ──────────────────────────────────────────────
  return {
    initHeroCanvas,
    initCursorTrail,
    initSectionAmbient,
  };

})();
