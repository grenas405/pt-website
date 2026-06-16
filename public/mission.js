/* mission.js - Praxedis Technologies mission page */
(function () {
  const prefersReducedMotion =
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
      return;
    }
    fn();
  }

  function typeInto(el, text, speed) {
    if (prefersReducedMotion || speed <= 0) {
      el.textContent += text;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let index = 0;

      function tick() {
        if (index >= text.length) {
          resolve();
          return;
        }

        el.textContent += text[index++];
        setTimeout(tick, speed);
      }

      tick();
    });
  }

  function initCursor() {
    const dot = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");
    if (!dot || !ring || !globalThis.matchMedia("(hover: hover)").matches) {
      return;
    }

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    document
      .querySelectorAll("a, button, .principle-card, .signal-card, .matrix-row, .terminal-frame")
      .forEach((el) => {
        el.addEventListener("mouseenter", () => {
          dot.classList.add("hovering");
          ring.classList.add("hovering");
        });
        el.addEventListener("mouseleave", () => {
          dot.classList.remove("hovering");
          ring.classList.remove("hovering");
        });
      });
  }

  function initParticles() {
    if (prefersReducedMotion || typeof ParticleEngine === "undefined") return;

    ParticleEngine.initHeroCanvas("mission-canvas");
    ParticleEngine.initCursorTrail();
    ParticleEngine.initSectionAmbient(".live-proof-section");
    ParticleEngine.initSectionAmbient(".contact-section");
  }

  function setInitialStates() {
    if (typeof anime === "undefined" || prefersReducedMotion) return;

    anime.set(
      [
        "#mission-kicker",
        "#mission-heading",
        "#mission-sub",
        "#mission-actions",
        "#signal-card",
      ],
      { opacity: 0, translateY: 24 },
    );
    anime.set(".rail", { translateY: "-100%" });
    anime.set(".principle-card", { opacity: 0, translateY: 34 });
    anime.set(".access-copy", { opacity: 0, translateX: -30 });
    anime.set(".access-matrix", { opacity: 0, translateX: 30 });
    anime.set("#terminal-frame", { opacity: 0, translateY: 36 });
    anime.set(".contact-manifesto, .contact-section h2, .contact-section p, .contact-actions", {
      opacity: 0,
      translateY: 24,
    });
  }

  function reveal(selector, config) {
    const el = document.querySelector(selector);
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        config(entry.target);
      });
    }, { threshold: 0.18 });

    observer.observe(el);
  }

  function runEntry() {
    if (typeof anime === "undefined" || prefersReducedMotion) {
      document.querySelectorAll(
        "#mission-kicker, #mission-heading, #mission-sub, #mission-actions, #signal-card, .principle-card, .access-copy, .access-matrix, #terminal-frame, .contact-manifesto, .contact-section h2, .contact-section p, .contact-actions",
      ).forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      startHealthTerminal();
      return;
    }

    anime.timeline({ easing: "easeOutExpo" })
      .add({
        targets: ".rail",
        translateY: ["-100%", "0%"],
        delay: anime.stagger(140),
        duration: 800,
      })
      .add({
        targets: "#mission-kicker",
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 520,
      }, "-=560")
      .add({
        targets: "#mission-heading",
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 760,
      }, "-=260")
      .add({
        targets: "#mission-sub",
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 620,
      }, "-=440")
      .add({
        targets: "#mission-actions",
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 560,
      }, "-=320")
      .add({
        targets: "#signal-card",
        opacity: [0, 1],
        translateY: [26, 0],
        duration: 680,
      }, "-=580");
  }

  function initScrollReveals() {
    if (typeof anime === "undefined" || prefersReducedMotion) {
      startHealthTerminal();
      return;
    }

    reveal("#declaration", () => {
      anime({
        targets: ".principle-card",
        opacity: [0, 1],
        translateY: [34, 0],
        delay: anime.stagger(120),
        duration: 640,
        easing: "easeOutExpo",
      });
    });

    reveal("#access", () => {
      anime({
        targets: [".access-copy", ".access-matrix"],
        opacity: [0, 1],
        translateX: function (_, index) {
          return index === 0 ? [-30, 0] : [30, 0];
        },
        duration: 720,
        delay: anime.stagger(120),
        easing: "easeOutExpo",
      });
    });

    reveal("#live-proof", () => {
      anime({
        targets: "#terminal-frame",
        opacity: [0, 1],
        translateY: [36, 0],
        duration: 720,
        easing: "easeOutExpo",
        complete: startHealthTerminal,
      });
    }, 0.12);

    reveal("#contact", () => {
      anime({
        targets:
          ".contact-manifesto, .contact-section h2, .contact-section p, .contact-actions",
        opacity: [0, 1],
        translateY: [24, 0],
        delay: anime.stagger(110),
        duration: 620,
        easing: "easeOutExpo",
      });
    });
  }

  function classForRgb(kind, rgb) {
    const prefix = kind === "bg" ? "ansi-bg" : "ansi-fg";
    const map = {
      "0,104,71": `${prefix}-green`,
      "0,255,136": `${prefix}-brightgreen`,
      "255,255,255": `${prefix}-white`,
      "206,17,38": `${prefix}-red`,
      "255,214,10": `${prefix}-gold`,
      "138,160,175": `${prefix}-steel`,
    };

    return map[rgb] ?? null;
  }

  function removeAnsiPrefix(classes, prefix) {
    Array.from(classes).forEach((className) => {
      if (className.startsWith(prefix)) classes.delete(className);
    });
  }

  function applyAnsiCodes(classes, rawCodes) {
    const codes = rawCodes === ""
      ? [0]
      : rawCodes.split(";").map((code) => Number.parseInt(code, 10));

    for (let i = 0; i < codes.length; i++) {
      const code = Number.isNaN(codes[i]) ? 0 : codes[i];

      if (code === 0) {
        classes.clear();
      } else if (code === 1) {
        classes.add("ansi-bold");
      } else if (code === 2) {
        classes.add("ansi-dim");
      } else if (code === 22) {
        classes.delete("ansi-bold");
        classes.delete("ansi-dim");
      } else if (code === 38 && codes[i + 1] === 2) {
        const rgb = `${codes[i + 2]},${codes[i + 3]},${codes[i + 4]}`;
        const className = classForRgb("fg", rgb);
        removeAnsiPrefix(classes, "ansi-fg-");
        if (className) classes.add(className);
        i += 4;
      } else if (code === 48 && codes[i + 1] === 2) {
        const rgb = `${codes[i + 2]},${codes[i + 3]},${codes[i + 4]}`;
        const className = classForRgb("bg", rgb);
        removeAnsiPrefix(classes, "ansi-bg-");
        if (className) classes.add(className);
        i += 4;
      } else if (code === 39) {
        removeAnsiPrefix(classes, "ansi-fg-");
      } else if (code === 49) {
        removeAnsiPrefix(classes, "ansi-bg-");
      }
    }
  }

  function parseAnsi(value) {
    const segments = [];
    const classes = new Set();
    const pattern = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let match;

    function pushText(text) {
      if (text.length === 0) return;
      segments.push({ text, classes: Array.from(classes) });
    }

    while ((match = pattern.exec(value)) !== null) {
      pushText(value.slice(lastIndex, match.index));
      applyAnsiCodes(classes, match[1]);
      lastIndex = pattern.lastIndex;
    }

    pushText(value.slice(lastIndex));
    return segments;
  }

  async function renderAnsi(output, text) {
    const segments = parseAnsi(text);
    output.textContent = "";

    for (const segment of segments) {
      const span = document.createElement("span");
      if (segment.classes.length > 0) {
        span.className = segment.classes.join(" ");
      }
      output.appendChild(span);
      await typeInto(span, segment.text, 1);
    }
  }

  async function startHealthTerminal() {
    const output = document.getElementById("health-output");
    const command = document.getElementById("health-command");
    if (!output || !command || output.dataset.started === "true") return;

    output.dataset.started = "true";
    const commandText = "curl https://praxedistechnologies.com/api/health";
    command.textContent = "";
    await typeInto(command, commandText, 16);
    await sleep(prefersReducedMotion ? 0 : 180);

    try {
      const response = await fetch("/api/health", {
        headers: { Accept: "text/plain" },
      });

      if (!response.ok) {
        throw new Error(`health request failed: ${response.status}`);
      }

      const text = await response.text();
      await renderAnsi(output, text);
    } catch {
      output.textContent =
        "\nhealth signal unavailable\npraxedis@edge:~$ retry later\n";
    }
  }

  function initTilt() {
    if (
      prefersReducedMotion ||
      typeof anime === "undefined" ||
      !globalThis.matchMedia("(hover: hover)").matches
    ) {
      return;
    }

    document.querySelectorAll(".principle-card, .signal-card, .terminal-frame").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rx = ((y - rect.height / 2) / (rect.height / 2)) * -5;
        const ry = ((x - rect.width / 2) / (rect.width / 2)) * 5;
        anime.remove(card);
        anime({
          targets: card,
          rotateX: rx,
          rotateY: ry,
          scale: 1.01,
          duration: 180,
          easing: "easeOutCubic",
        });
      });

      card.addEventListener("mouseleave", () => {
        anime({
          targets: card,
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 520,
          easing: "easeOutElastic(1, 0.55)",
        });
      });
    });
  }

  onReady(function () {
    initCursor();
    initParticles();
    setInitialStates();
    runEntry();
    initScrollReveals();
    initTilt();
  });
})();
