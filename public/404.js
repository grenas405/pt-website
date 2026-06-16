/* 404.js - Praxedis Technologies */

const prefersReducedMotion =
  globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safePath() {
  const raw = globalThis.location.pathname + globalThis.location.search;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function typewriter(el, text, speed = 24) {
  if (prefersReducedMotion || speed <= 0) {
    el.textContent = text;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";

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

function initRequestedPath() {
  const el = document.getElementById("requested-path");
  if (el) el.textContent = safePath();
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

  document.querySelectorAll("a, button").forEach((el) => {
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

  ParticleEngine.initHeroCanvas("hero-canvas");
  ParticleEngine.initCursorTrail();
  ParticleEngine.initSectionAmbient(".error-hero");
}

function setInitialStates() {
  if (typeof anime === "undefined") return;

  anime.set("#system-kicker", { opacity: 0, translateY: -14 });
  anime.set(".error-code-wrap", { opacity: 0, scale: 0.78, translateY: -24 });
  anime.set("#error-heading", { opacity: 0, translateY: 28 });
  anime.set("#error-sub", { opacity: 0, translateY: 18 });
  anime.set("#requested-card", { opacity: 0, translateY: 16 });
  anime.set("#error-ctas", { opacity: 0, translateY: 18 });
  anime.set("#error-panel", { opacity: 0, translateX: 34 });
  anime.set(".route-card", { opacity: 0, translateY: 16 });
  anime.set(".signal-meter span", { scaleY: 0.2, opacity: 0 });
}

function revealFallback() {
  [
    "#system-kicker",
    ".error-code-wrap",
    "#error-heading",
    "#error-sub",
    "#requested-card",
    "#error-ctas",
    "#error-panel",
    ".route-card",
    ".signal-meter span",
  ].forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  });

  document.querySelectorAll(".error-digit").forEach((digit) => {
    digit.classList.add("glitching");
  });

  startTerminal();
}

function runEntryTimeline() {
  if (prefersReducedMotion || typeof anime === "undefined") {
    revealFallback();
    return;
  }

  const tl = anime.timeline({ easing: "easeOutExpo" });

  tl
    .add({
      targets: "#system-kicker",
      opacity: [0, 1],
      translateY: [-14, 0],
      duration: 420,
    })
    .add({
      targets: ".error-code-wrap",
      opacity: [0, 1],
      scale: [0.78, 1],
      translateY: [-24, 0],
      duration: 820,
      easing: "easeOutBack",
      complete: () => {
        document.querySelectorAll(".error-digit").forEach((digit, index) => {
          setTimeout(() => digit.classList.add("glitching"), index * 110);
        });
      },
    }, "-=120")
    .add({
      targets: "#error-heading",
      opacity: [0, 1],
      translateY: [28, 0],
      duration: 620,
    }, "-=360")
    .add({
      targets: "#error-sub",
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 520,
    }, "-=360")
    .add({
      targets: "#requested-card",
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
    }, "-=260")
    .add({
      targets: "#error-ctas",
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 520,
    }, "-=260")
    .add({
      targets: "#error-panel",
      opacity: [0, 1],
      translateX: [34, 0],
      duration: 720,
      complete: startTerminal,
    }, "-=520")
    .add({
      targets: ".route-card",
      opacity: [0, 1],
      translateY: [16, 0],
      delay: anime.stagger(90),
      duration: 420,
    }, "-=260")
    .add({
      targets: ".signal-meter span",
      opacity: [0, 1],
      scaleY: [0.2, 1],
      delay: anime.stagger(55),
      duration: 360,
    }, "-=260");
}

function legacyHint(pathname) {
  const legacyPaths = [
    "/about.html",
    "/case-study.html",
    "/heavenly-roofing",
    "/heavenly-roofing.html",
    "/heavenly-roofing/",
  ];

  if (legacyPaths.includes(pathname)) {
    return "legacy_route: retired";
  }

  if (pathname.endsWith("/")) {
    return "slash_policy: exact routes only";
  }

  return "route_policy: canonical map only";
}

async function startTerminal() {
  const body = document.getElementById("terminal-body");
  if (!body || body.dataset.started === "true") return;
  body.dataset.started = "true";

  const pathname = safePath();
  const lines = [
    { type: "output", text: "" },
    { type: "key-val", key: "request:       ", val: pathname },
    { type: "key-val", key: "method:        ", val: "GET" },
    { type: "key-val", key: "status:        ", val: "404 Not Found" },
    { type: "output", text: "" },
    { type: "error", text: "resolver:      no explicit page route matched" },
    {
      type: "key-val",
      key: "policy:        ",
      val: legacyHint(globalThis.location.pathname),
    },
    { type: "comment", text: "# live routes: /  /mission  /about  /case-study" },
    { type: "output", text: "" },
    { type: "key-val", key: "next_step:     ", val: "choose a verified route" },
  ];

  for (const line of lines) {
    if (line.type === "key-val") {
      const keySpan = document.createElement("span");
      keySpan.className = "t-key";
      keySpan.textContent = line.key;
      body.appendChild(keySpan);

      const valSpan = document.createElement("span");
      valSpan.className = "t-val";
      body.appendChild(valSpan);
      await typewriter(valSpan, line.val, 18);
      body.appendChild(document.createTextNode("\n"));
    } else if (line.type === "error") {
      const span = document.createElement("span");
      span.className = "t-error";
      body.appendChild(span);
      await typewriter(span, line.text, 14);
      body.appendChild(document.createTextNode("\n"));
    } else if (line.type === "comment") {
      const span = document.createElement("span");
      span.className = "t-comment";
      span.textContent = `${line.text}\n`;
      body.appendChild(span);
      await sleep(prefersReducedMotion ? 0 : 60);
    } else {
      body.appendChild(document.createTextNode("\n"));
      await sleep(prefersReducedMotion ? 0 : 35);
    }
  }

  const prompt = document.createElement("span");
  prompt.innerHTML =
    '<span class="t-prompt">$ </span><span class="typed-cursor">|</span>';
  body.appendChild(prompt);
}

function startCodeShake() {
  if (prefersReducedMotion || typeof anime === "undefined") return;

  anime({
    targets: ".error-code-wrap",
    translateX: [0, -6, 8, -3, 2, 0],
    translateY: [0, 3, -3, 2, -1, 0],
    duration: 360,
    easing: "easeInOutSine",
    complete: () => {
      setTimeout(startCodeShake, 5200 + Math.random() * 3600);
    },
  });
}

function initMagneticTargets() {
  if (
    prefersReducedMotion || typeof anime === "undefined" ||
    !globalThis.matchMedia("(hover: hover)").matches
  ) {
    return;
  }

  document.querySelectorAll(".cta-button, .route-card").forEach((target) => {
    target.addEventListener("mousemove", (e) => {
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.16;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.16;
      anime({
        targets: target,
        translateX: x,
        translateY: y,
        duration: 280,
        easing: "easeOutExpo",
      });
    });

    target.addEventListener("mouseleave", () => {
      anime({
        targets: target,
        translateX: 0,
        translateY: 0,
        duration: 760,
        easing: "easeOutElastic(1, 0.5)",
      });
    });
  });
}

initRequestedPath();
initCursor();
initParticles();
setInitialStates();
runEntryTimeline();
initMagneticTargets();
setTimeout(startCodeShake, 2800);
