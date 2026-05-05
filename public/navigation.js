/**
 * navigation.js - Shared navigation behavior
 * Owns scroll progress, header state, and mobile menu interactions.
 */
(function () {
  const BREAKPOINT_DESKTOP = 992;
  const SCROLL_THRESHOLD = 60;
  const LINK_CLOSE_DELAY_MS = 80;

  const selectors = {
    progress: "scroll-progress",
    hamburger: "hamburger-btn",
    overlay: "mobile-nav-overlay",
    close: "mno-close-btn",
    header: "header",
    links: ".mno-link",
    closeControl: ".mno-close",
    tagline: ".mno-tagline",
    flagBar: ".mno-flag-bar",
    topBar: ".ham-bar--top",
    midBar: ".ham-bar--mid",
    bottomBar: ".ham-bar--bot",
  };

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
      return;
    }
    fn();
  }

  function scoped(root, selector) {
    return root
      ? root.querySelectorAll(selector)
      : document.querySelectorAll(selector);
  }

  function setTargets(targets, props) {
    if (globalThis.anime) {
      globalThis.anime.set(targets, props);
    }
  }

  function animate(config) {
    if (!globalThis.anime) {
      config.complete?.();
      return null;
    }
    return globalThis.anime(config);
  }

  function timeline(config) {
    if (!globalThis.anime) {
      return null;
    }
    return globalThis.anime.timeline(config);
  }

  function initScrollNav() {
    const progress = document.getElementById(selectors.progress);
    const header = document.querySelector(selectors.header);

    if (!progress && !header) return;

    function update() {
      const scrollMax = Math.max(
        document.documentElement.scrollHeight - globalThis.innerHeight,
        1,
      );

      if (progress) {
        progress.style.width = (globalThis.scrollY / scrollMax * 100) + "%";
      }

      if (header) {
        header.classList.toggle(
          "scrolled",
          globalThis.scrollY > SCROLL_THRESHOLD,
        );
      }
    }

    update();
    globalThis.addEventListener("scroll", update, { passive: true });
  }

  function initMobileMenu() {
    const hamburger = document.getElementById(selectors.hamburger);
    const overlay = document.getElementById(selectors.overlay);
    const close = document.getElementById(selectors.close);

    if (!hamburger || !overlay) return;

    const links = Array.from(scoped(overlay, selectors.links));
    let isOpen = false;
    let openTL = null;
    let closeTL = null;

    function resetOverlayTargets() {
      setTargets(scoped(overlay, selectors.links), { translateY: "100%" });
      setTargets(scoped(overlay, selectors.closeControl), { opacity: 0 });
      setTargets(scoped(overlay, selectors.tagline), { opacity: 0 });
      setTargets(scoped(overlay, selectors.flagBar), { translateX: "100%" });
    }

    function resetHamburgerTargets() {
      setTargets(selectors.topBar, { translateY: 0, rotate: 0 });
      setTargets(selectors.midBar, { opacity: 1, scaleX: 1 });
      setTargets(selectors.bottomBar, { translateY: 0, rotate: 0 });
    }

    function focusCloseButton() {
      close?.focus();
    }

    function openMenu() {
      if (isOpen) return;
      isOpen = true;

      if (closeTL) closeTL.pause();

      hamburger.setAttribute("aria-expanded", "true");
      overlay.setAttribute("aria-hidden", "false");
      setTargets(overlay, { clipPath: "inset(0 0 100% 0)" });
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";

      animate({
        targets: selectors.topBar,
        translateY: [0, 7],
        rotate: [0, 45],
        duration: 380,
        easing: "easeInOutExpo",
      });
      animate({
        targets: selectors.midBar,
        opacity: [1, 0],
        scaleX: [1, 0],
        duration: 200,
        easing: "easeInExpo",
      });
      animate({
        targets: selectors.bottomBar,
        translateY: [0, -7],
        rotate: [0, -45],
        duration: 380,
        easing: "easeInOutExpo",
      });

      openTL = timeline({ easing: "easeOutExpo" });
      if (!openTL) {
        focusCloseButton();
        return;
      }

      openTL
        .add({
          targets: overlay,
          clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"],
          duration: 600,
          easing: "easeInOutExpo",
        })
        .add({
          targets: scoped(overlay, selectors.flagBar),
          translateX: ["100%", "0%"],
          duration: 500,
          delay: globalThis.anime.stagger(60, { from: "last" }),
          easing: "easeOutCubic",
        }, "-=400")
        .add({
          targets: links,
          translateY: ["100%", "0%"],
          duration: 550,
          delay: globalThis.anime.stagger(70),
          easing: "easeOutExpo",
        }, "-=300")
        .add({
          targets: [close, ...scoped(overlay, selectors.tagline)].filter(
            Boolean,
          ),
          opacity: [0, 1],
          duration: 400,
          delay: globalThis.anime.stagger(100),
          easing: "easeOutExpo",
          complete: focusCloseButton,
        }, "-=300");
    }

    function closeMenu() {
      if (!isOpen) return;
      isOpen = false;

      if (openTL) openTL.pause();

      hamburger.setAttribute("aria-expanded", "false");
      overlay.setAttribute("aria-hidden", "true");
      hamburger.focus();

      animate({
        targets: selectors.topBar,
        translateY: [7, 0],
        rotate: [45, 0],
        duration: 380,
        easing: "easeInOutExpo",
      });
      animate({
        targets: selectors.midBar,
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 280,
        delay: 100,
        easing: "easeOutExpo",
      });
      animate({
        targets: selectors.bottomBar,
        translateY: [-7, 0],
        rotate: [-45, 0],
        duration: 380,
        easing: "easeInOutExpo",
      });

      closeTL = timeline({
        complete: function () {
          overlay.classList.remove("is-open");
          document.body.style.overflow = "";
          resetOverlayTargets();
        },
      });

      if (!closeTL) {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        resetOverlayTargets();
        return;
      }

      closeTL
        .add({
          targets: links,
          translateY: ["0%", "100%"],
          duration: 350,
          delay: globalThis.anime.stagger(40, { from: "last" }),
          easing: "easeInExpo",
        })
        .add({
          targets: overlay,
          clipPath: ["inset(0 0 0% 0)", "inset(0 0 100% 0)"],
          duration: 450,
          easing: "easeInExpo",
        }, "-=100");
    }

    function resetForDesktop() {
      if (globalThis.innerWidth <= BREAKPOINT_DESKTOP || !isOpen) return;

      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      hamburger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      isOpen = false;
      resetOverlayTargets();
      resetHamburgerTargets();
    }

    function trapFocus(e) {
      if (!isOpen || e.key !== "Tab") return;

      const focusable = Array.from(overlay.querySelectorAll("button, a[href]"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    resetOverlayTargets();

    hamburger.addEventListener("click", function () {
      if (isOpen) closeMenu();
      else openMenu();
    });
    close?.addEventListener("click", closeMenu);
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        setTimeout(closeMenu, LINK_CLOSE_DELAY_MS);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) closeMenu();
    });
    overlay.addEventListener("keydown", trapFocus);
    globalThis.addEventListener("resize", resetForDesktop, { passive: true });
  }

  onReady(function () {
    initScrollNav();
    initMobileMenu();
  });
})();
