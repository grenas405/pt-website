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


  // ============================================================
  // initContactUniverse(canvasId)
  // Deep-space universe animation for the contact section.
  // Layers: Milky Way band → nebula clouds → stars → shooting
  //         stars → cosmic dust (rendered back to front).
  // ============================================================

  function initContactUniverse(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return { destroy: () => {} };

    const ctx = canvas.getContext('2d');
    const isMobile = !window.matchMedia('(hover: hover)').matches;

    let W, H;
    let animFrameId = null;
    let isVisible   = false;
    let lastTime    = 0;

    // ── Palette ──────────────────────────────────────────────
    const C_GREEN_DEEP  = 'rgba(0,104,71,';
    const C_GREEN_LIGHT = 'rgba(0,168,104,';
    const C_RED_DEEP    = 'rgba(206,17,38,';
    const C_RED_LIGHT   = 'rgba(255,107,122,';
    const C_WHITE_ISH   = 'rgba(200,220,255,';

    // Map hex star colors to rgb strings for gradient construction
    const STAR_RGB = {
      '#ffffff': '255,255,255',
      '#cce0ff': '204,224,255',
      '#fff5cc': '255,245,204',
      '#00ff9f': '0,255,159',
      '#ff6b7a': '255,107,122',
    };
    function starRGBA(hex, a) {
      return 'rgba(' + (STAR_RGB[hex] || '255,255,255') + ',' + a + ')';
    }

    // ── Layer 1: Milky Way offscreen buffer ──────────────────
    let milkyWayBuf = null;

    function buildMilkyWay() {
      milkyWayBuf = document.createElement('canvas');
      milkyWayBuf.width  = W;
      milkyWayBuf.height = H;
      const bx = milkyWayBuf.getContext('2d');

      const COUNT = 600;
      const angle = Math.atan2(H * 0.55, W);   // ~28° band angle
      const sinA  = Math.sin(angle + Math.PI / 2);
      const cosA  = Math.cos(angle + Math.PI / 2);

      for (let i = 0; i < COUNT; i++) {
        const t  = Math.random();          // position along band axis
        const cx = t * W;
        const cy = t * H * 0.55;          // band center y at this x

        // Gaussian spread perpendicular to the band
        const u1   = Math.random() || 0.0001;
        const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
        const spread = gauss * (H * 0.11);

        const sx = cx + cosA * spread;
        const sy = cy + sinA * spread;
        if (sx < 0 || sx > W || sy < 0 || sy > H) continue;

        const r     = 0.3 + Math.random() * 0.7;
        const alpha = 0.08 + Math.random() * 0.45;
        bx.globalAlpha = alpha;
        bx.fillStyle   = 'white';
        bx.beginPath();
        bx.arc(sx, sy, r, 0, Math.PI * 2);
        bx.fill();
      }

      // Soft luminous core along the band
      const grad = bx.createLinearGradient(0, 0, W, H * 0.55);
      grad.addColorStop(0,   'rgba(200,210,255,0)');
      grad.addColorStop(0.3, 'rgba(200,210,255,0.015)');
      grad.addColorStop(0.5, 'rgba(200,210,255,0.022)');
      grad.addColorStop(0.7, 'rgba(200,210,255,0.015)');
      grad.addColorStop(1,   'rgba(200,210,255,0)');
      bx.globalAlpha = 1;
      bx.fillStyle   = grad;
      bx.fillRect(0, 0, W, H);
    }

    function drawMilkyWay() {
      if (!milkyWayBuf) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.50;
      ctx.drawImage(milkyWayBuf, 0, 0);
      ctx.restore();
    }

    // ── Layer 2: Nebula clouds ────────────────────────────────
    const NEBULA_DEFS = [
      { cx: 0.14, cy: 0.38, rx: 0.22, ry: 0.18, inner: C_GREEN_DEEP,  outer: C_GREEN_LIGHT, driftSpd: 0.00012, driftAmp: 0.018 },
      { cx: 0.82, cy: 0.62, rx: 0.24, ry: 0.20, inner: C_GREEN_DEEP,  outer: C_GREEN_LIGHT, driftSpd: 0.00009, driftAmp: 0.022 },
      { cx: 0.54, cy: 0.14, rx: 0.20, ry: 0.14, inner: C_RED_DEEP,    outer: C_RED_LIGHT,   driftSpd: 0.00014, driftAmp: 0.015 },
      { cx: 0.28, cy: 0.82, rx: 0.18, ry: 0.22, inner: C_RED_DEEP,    outer: C_RED_LIGHT,   driftSpd: 0.00011, driftAmp: 0.020 },
      { cx: 0.68, cy: 0.28, rx: 0.15, ry: 0.13, inner: C_WHITE_ISH,   outer: C_WHITE_ISH,   driftSpd: 0.00008, driftAmp: 0.012 },
      { cx: 0.10, cy: 0.72, rx: 0.13, ry: 0.11, inner: C_GREEN_LIGHT, outer: C_GREEN_DEEP,  driftSpd: 0.00016, driftAmp: 0.025 },
    ];
    NEBULA_DEFS.forEach(n => {
      n.pulsePhase  = Math.random() * Math.PI * 2;
      n.pulseSpd    = 0.00024 + Math.random() * 0.00018;
      n.driftPhaseX = Math.random() * Math.PI * 2;
      n.driftPhaseY = Math.random() * Math.PI * 2;
    });

    let nebulaBufs = [];

    function buildNebulae() {
      nebulaBufs = NEBULA_DEFS.map(n => {
        const bw  = Math.max(4, Math.round((n.rx * 2 + 0.06) * W));
        const bh  = Math.max(4, Math.round((n.ry * 2 + 0.06) * H));
        const buf = document.createElement('canvas');
        buf.width  = bw;
        buf.height = bh;
        const bx  = buf.getContext('2d');
        const rad = Math.max(bw, bh) / 2;
        const grad = bx.createRadialGradient(bw / 2, bh / 2, 0, bw / 2, bh / 2, rad);
        grad.addColorStop(0,    n.inner + '0.20)');
        grad.addColorStop(0.35, n.inner + '0.11)');
        grad.addColorStop(0.65, n.outer + '0.05)');
        grad.addColorStop(1,    n.outer + '0)');
        bx.fillStyle = grad;
        bx.fillRect(0, 0, bw, bh);
        return buf;
      });
    }

    function drawNebulae(t) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      NEBULA_DEFS.forEach((n, i) => {
        const buf = nebulaBufs[i];
        if (!buf) return;
        const pulse  = 0.5 + 0.5 * Math.sin(t * n.pulseSpd + n.pulsePhase);
        const driftX = Math.sin(t * n.driftSpd + n.driftPhaseX) * n.driftAmp * W;
        const driftY = Math.cos(t * n.driftSpd * 0.7 + n.driftPhaseY) * n.driftAmp * H;
        ctx.globalAlpha = pulse * 0.88;
        ctx.drawImage(buf, n.cx * W - buf.width / 2 + driftX, n.cy * H - buf.height / 2 + driftY);
      });
      ctx.restore();
    }

    // ── Layer 3: Stars ────────────────────────────────────────
    const FAR_COUNT  = isMobile ? 80  : 150;
    const MID_COUNT  = isMobile ? 55  : 100;
    const NEAR_COUNT = isMobile ? 25  : 50;

    const STAR_LAYERS_CFG = [
      { count: FAR_COUNT,  minR: 0.3, maxR: 0.8,  spdMul: 0.008, tint: 0.0 },
      { count: MID_COUNT,  minR: 0.5, maxR: 1.2,  spdMul: 0.015, tint: 0.0 },
      { count: NEAR_COUNT, minR: 0.8, maxR: 2.0,  spdMul: 0.025, tint: 0.25 },
    ];

    let stars = [];

    function buildStars() {
      stars = [];
      STAR_LAYERS_CFG.forEach((cfg, layerIdx) => {
        for (let i = 0; i < cfg.count; i++) {
          let color;
          const roll = Math.random();
          if (cfg.tint > 0 && roll < cfg.tint / 2)      color = '#00ff9f';
          else if (cfg.tint > 0 && roll < cfg.tint)      color = '#ff6b7a';
          else {
            const r2 = Math.random();
            color = r2 < 0.60 ? '#ffffff' : r2 < 0.80 ? '#cce0ff' : '#fff5cc';
          }
          stars.push({
            x:           Math.random() * W,
            y:           Math.random() * H,
            radius:      cfg.minR + Math.random() * (cfg.maxR - cfg.minR),
            baseBright:  0.35 + Math.random() * 0.60,
            phase:       Math.random() * Math.PI * 2,
            speed:       cfg.spdMul * (0.7 + Math.random() * 0.6),
            color,
            bright:      layerIdx === 2 && Math.random() < 0.15,
          });
        }
      });
    }

    function drawStars(t) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

      for (let i = 0, len = stars.length; i < len; i++) {
        const s = stars[i];
        const alpha = s.baseBright * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));

        if (s.bright) {
          ctx.shadowBlur  = 6;
          ctx.shadowColor = s.color;
        } else if (ctx.shadowBlur !== 0) {
          ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Layer 4: Shooting stars ───────────────────────────────
    const POOL_SIZE       = 5;
    const TRAIL_LEN       = 20;
    const METEOR_SPD_MIN  = 350;
    const METEOR_SPD_MAX  = 700;
    const SPAWN_MIN_MS    = 2000;
    const SPAWN_MAX_MS    = 6000;

    let meteors = [];
    let nextSpawnT = 0;  // ms timestamp

    for (let i = 0; i < POOL_SIZE; i++) {
      meteors.push({
        active:   false,
        x: 0, y: 0, dx: 0, dy: 0,
        speed: 0, duration: 0, life: 0, progress: 0,
        trail:    Array.from({ length: TRAIL_LEN }, () => ({ x: 0, y: 0 })),
        trailLen: 0,
        color:    '#ffffff',
      });
    }

    function spawnMeteor(nowMs) {
      const m = meteors.find(m => !m.active);
      if (!m) return;

      const fromTop = Math.random() < 0.6;
      if (fromTop) {
        m.x = Math.random() * W * 1.2 - W * 0.1;
        m.y = -10;
      } else {
        m.x = -10;
        m.y = Math.random() * H * 0.6;
      }

      const angleDeg = 20 + Math.random() * 30;
      const angle    = angleDeg * Math.PI / 180;
      m.dx    = Math.cos(angle);
      m.dy    = Math.sin(angle);
      m.speed = METEOR_SPD_MIN + Math.random() * (METEOR_SPD_MAX - METEOR_SPD_MIN);

      const crossDist = Math.sqrt(W * W + H * H) * (0.4 + Math.random() * 0.5);
      m.duration = crossDist / m.speed;

      for (let j = 0; j < TRAIL_LEN; j++) { m.trail[j].x = m.x; m.trail[j].y = m.y; }

      const roll = Math.random();
      m.color    = roll < 0.10 ? '#00ff9f' : roll < 0.20 ? '#ff6b7a' : '#ffffff';

      m.active   = true;
      m.life     = 0;
      m.progress = 0;
      m.trailLen = 0;

      nextSpawnT = nowMs + SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
    }

    function updateMeteors(nowMs, dt) {
      if (nowMs >= nextSpawnT) spawnMeteor(nowMs);

      for (let i = 0; i < POOL_SIZE; i++) {
        const m = meteors[i];
        if (!m.active) continue;

        m.life     += dt;
        m.progress  = m.life / m.duration;
        if (m.progress >= 1) { m.active = false; continue; }

        const dist = m.speed * dt;
        m.x += m.dx * dist;
        m.y += m.dy * dist;

        for (let j = TRAIL_LEN - 1; j > 0; j--) {
          m.trail[j].x = m.trail[j - 1].x;
          m.trail[j].y = m.trail[j - 1].y;
        }
        m.trail[0].x = m.x;
        m.trail[0].y = m.y;
        if (m.trailLen < TRAIL_LEN) m.trailLen++;
      }
    }

    function drawMeteors() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < POOL_SIZE; i++) {
        const m = meteors[i];
        if (!m.active || m.trailLen < 2) continue;

        const fadeIn    = Math.min(1, m.progress / 0.10);
        const fadeOut   = 1 - Math.max(0, (m.progress - 0.85) / 0.15);
        const masterAlpha = fadeIn * fadeOut;

        const tailIdx = m.trailLen - 1;
        const grad = ctx.createLinearGradient(
          m.trail[0].x, m.trail[0].y,
          m.trail[tailIdx].x, m.trail[tailIdx].y
        );
        grad.addColorStop(0,   starRGBA(m.color, masterAlpha));
        grad.addColorStop(0.3, starRGBA(m.color, masterAlpha * 0.5));
        grad.addColorStop(1,   starRGBA(m.color, 0));

        ctx.beginPath();
        ctx.moveTo(m.trail[0].x, m.trail[0].y);
        for (let j = 1; j < m.trailLen; j++) {
          ctx.lineTo(m.trail[j].x, m.trail[j].y);
        }
        ctx.lineWidth   = 1.5;
        ctx.strokeStyle = grad;
        ctx.shadowBlur  = 5;
        ctx.shadowColor = m.color;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Layer 5: Cosmic dust ──────────────────────────────────
    const DUST_COUNT = isMobile ? 40 : 80;
    let dust = [];

    function buildDust() {
      dust = [];
      for (let i = 0; i < DUST_COUNT; i++) {
        dust.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 + 1.5,  // slight downward bias
        });
      }
    }

    function updateDrawDust(dt) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      ctx.beginPath();
      for (let i = 0; i < DUST_COUNT; i++) {
        const d = dust[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x < -2)    d.x = W + 2;
        if (d.x > W + 2) d.x = -2;
        if (d.y < -2)    d.y = H + 2;
        if (d.y > H + 2) d.y = -2;
        ctx.moveTo(d.x + 0.5, d.y);
        ctx.arc(d.x, d.y, 0.5, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    // ── Resize ────────────────────────────────────────────────
    function resize() {
      W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
      H = canvas.height = canvas.offsetHeight || 400;
      buildMilkyWay();
      buildNebulae();
    }
    window.addEventListener('resize', resize, { passive: true });

    // ── IntersectionObserver ──────────────────────────────────
    const section = canvas.closest('.contact-section') || canvas.parentElement;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible) lastTime = performance.now();  // reset to avoid dt spike
      });
    }, { threshold: 0.05 });
    if (section) observer.observe(section);

    // ── Render loop ───────────────────────────────────────────
    function render(t) {
      if (!isVisible) { animFrameId = requestAnimationFrame(render); return; }

      const dt = Math.min((t - lastTime) / 1000, 0.05);  // clamp to 50ms
      lastTime = t;

      ctx.globalAlpha              = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, W, H);

      drawMilkyWay();
      drawNebulae(t);
      drawStars(t);
      updateMeteors(t, dt);
      drawMeteors();
      updateDrawDust(dt);

      animFrameId = requestAnimationFrame(render);
    }

    // ── Init ──────────────────────────────────────────────────
    resize();          // sets W, H; calls buildMilkyWay + buildNebulae
    buildStars();
    buildDust();
    nextSpawnT = performance.now() + 1000 + Math.random() * 2000;
    animFrameId = requestAnimationFrame(render);

    // ── Destroy ───────────────────────────────────────────────
    function destroy() {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      milkyWayBuf = null;
      nebulaBufs  = [];
      stars       = [];
      dust        = [];
      meteors.forEach(m => { m.active = false; });
    }

    return { destroy };
  }


  // ── Public API ──────────────────────────────────────────────
  return {
    initHeroCanvas,
    initCursorTrail,
    initSectionAmbient,
    initContactUniverse,
  };

})();
