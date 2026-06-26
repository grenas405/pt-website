(function () {
  "use strict";

  const command = "curl https://pedromdominguez.com/api/health";
  const outputLines = [
    ["", ""],
    [
      "  ╬══════════════════════════════════════════════════════════════════╬",
      "is-frame",
    ],
    [
      "  ║                     ★  PEDRO M. DOMINGUEZ  ★                     ║",
      "is-title",
    ],
    [
      "  ╠══════════════════════════════════════════════════════════════════╣",
      "is-frame",
    ],
    [
      "  ║        ONE PERSON. ONE PARADIGM SHIFT IN COMPUTER SCIENCE        ║",
      "is-title",
    ],
    [
      "  ╙══════════════════════════════════════════════════════════════════╜",
      "is-frame",
    ],
    ["", ""],
    ["  STATUS      ✓ OPERATIONAL", "is-ok"],
    ["  SIGNAL      STRONG / 100", "is-value"],
    ["  APP         Deno Native Showcase", "is-value"],
    ["  VERSION     1.0.0", "is-value"],
    ["  TIME        2026-06-26T21:12:46.900Z", "is-value"],
    ["  STARTED     2026-06-26T20:30:15.840Z", "is-value"],
    ["  UPTIME      42m 31s (2551s)", "is-value"],
    ["  REQ ID      23945c31-c21d-427d-a1a2-82c1aab3d944", "is-value"],
    ["", ""],
    ["  Checks:", "is-muted"],
    [
      "  kv                   OK       0.75ms KV read probe completed.",
      "is-ok",
    ],
    [
      "  static_assets        OK       2.77ms Static asset directory and composed CSS are readable.",
      "is-ok",
    ],
    [
      "  event_bus            OK       0.26ms In-process event bus is accepting subscribers.",
      "is-ok",
    ],
    [
      "  background_heartbeat OK       2.33ms Background heartbeat is fresh.",
      "is-ok",
    ],
    ["", ""],
    [
      "  ══════════════════════════════════════════════════════════════════",
      "is-frame",
    ],
    ["  In tribute to the Unix Philosophy Research Team —", "is-muted"],
    [
      "  Ken Thompson · Dennis Ritchie · Brian Kernighan · Rob Pike",
      "is-muted",
    ],
    ["  And Linus Torvalds, for the kernel the world runs on.", "is-muted"],
    [
      "  ══════════════════════════════════════════════════════════════════",
      "is-frame",
    ],
  ];

  const reducedMotion = globalThis.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  function initNavigation() {
    const header = document.getElementById("site-header");
    const progress = document.getElementById("scroll-progress");
    const openButton = document.getElementById("menu-button");
    const closeButton = document.getElementById("menu-close");
    const menu = document.getElementById("mobile-menu");

    function updateScroll() {
      const scrollable = Math.max(
        document.documentElement.scrollHeight - globalThis.innerHeight,
        1,
      );
      progress.style.width = `${globalThis.scrollY / scrollable * 100}%`;
      header.classList.toggle("scrolled", globalThis.scrollY > 48);
    }

    function openMenu() {
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      openButton.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");

      if (reducedMotion || !globalThis.anime) {
        menu.style.clipPath = "inset(0 0 0 0)";
        closeButton.focus();
        return;
      }

      globalThis.anime({
        targets: menu,
        clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"],
        duration: 520,
        easing: "easeInOutExpo",
        complete: function () {
          closeButton.focus();
        },
      });
    }

    function closeMenu() {
      openButton.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");

      function finish() {
        menu.classList.remove("is-open");
        menu.style.clipPath = "";
      }

      if (reducedMotion || !globalThis.anime) {
        finish();
        openButton.focus();
        return;
      }

      globalThis.anime({
        targets: menu,
        clipPath: ["inset(0 0 0% 0)", "inset(0 0 100% 0)"],
        duration: 420,
        easing: "easeInExpo",
        complete: finish,
      });
    }

    openButton.addEventListener("click", openMenu);
    closeButton.addEventListener("click", closeMenu);
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
      }
    });
    globalThis.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
  }

  function initHero() {
    if (reducedMotion || !globalThis.anime) return;

    globalThis.anime.timeline({
      easing: "easeOutExpo",
    })
      .add({
        targets: ".hero-image",
        scale: [1.09, 1.025],
        duration: 1700,
      })
      .add({
        targets: [".hero-eyebrow", ".hero h1", ".hero-lede"],
        opacity: [0, 1],
        translateY: [42, 0],
        delay: globalThis.anime.stagger(120),
        duration: 800,
      }, "-=1200")
      .add({
        targets: [".hero-actions", ".hero-rail", ".hero-scroll"],
        opacity: [0, 1],
        translateY: [24, 0],
        delay: globalThis.anime.stagger(90),
        duration: 650,
      }, "-=700");
  }

  function initReveals() {
    const reveals = document.querySelectorAll(".reveal");

    if (reducedMotion || !("IntersectionObserver" in globalThis)) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      rootMargin: "0px 0px -7% 0px",
    });

    reveals.forEach((element) => observer.observe(element));
  }

  function initTerminal() {
    const terminal = document.getElementById("terminal");
    const commandTarget = document.getElementById("terminal-command");
    const output = document.getElementById("terminal-output");
    const replay = document.getElementById("terminal-replay");
    let sequenceId = 0;
    let hasPlayed = false;

    function wait(milliseconds) {
      return new Promise((resolve) =>
        globalThis.setTimeout(resolve, milliseconds)
      );
    }

    function appendLine(text, className) {
      const line = document.createElement("span");
      line.className = `terminal-line ${className}`.trim();
      line.textContent = text || " ";
      output.append(line);
      terminal.scrollLeft = 0;
    }

    async function play() {
      sequenceId += 1;
      const currentSequence = sequenceId;
      commandTarget.textContent = "";
      output.replaceChildren();
      replay.disabled = true;

      if (reducedMotion) {
        commandTarget.textContent = command;
        outputLines.forEach(([line, className]) => appendLine(line, className));
        replay.disabled = false;
        return;
      }

      for (const character of command) {
        if (currentSequence !== sequenceId) return;
        commandTarget.textContent += character;
        await wait(24);
      }

      await wait(350);
      for (const [line, className] of outputLines) {
        if (currentSequence !== sequenceId) return;
        appendLine(line, className);
        await wait(className === "is-frame" ? 55 : 75);
      }

      replay.disabled = false;
    }

    replay.addEventListener("click", play);

    if (!("IntersectionObserver" in globalThis)) {
      play();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || hasPlayed) return;
      hasPlayed = true;
      play();
      observer.disconnect();
    }, { threshold: 0.3 });

    observer.observe(terminal);
  }

  initNavigation();
  initHero();
  initReveals();
  initTerminal();
})();
