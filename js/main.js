/* ===================================================================
   GEROBAK BETAWI - MAIN INTERACTIONS
   =================================================================== */

(function () {
  "use strict";

  /* ---------- Sticky header state (floating pill, cortex-style) ---------- */
  function initHeader() {
    const navOuter = document.querySelector(".nav-outer");
    if (!navOuter) return;
    let wasScrolled = window.scrollY > 80;
    const onScroll = () => {
      const isScrolled = window.scrollY > 80;
      if (isScrolled !== wasScrolled) {
        navOuter.classList.toggle("is-scrolled", isScrolled);
        wasScrolled = isScrolled;
        // The header's own padding animates (var(--dur-med)) when this
        // toggles, which shifts every nav link's position. Re-sync the
        // pill indicator once that settles so it doesn't silently drift
        // out of place and "jump" into position on the next hover.
        window.setTimeout(() => window.GB_REPOSITION_NAV_PILL && window.GB_REPOSITION_NAV_PILL(), 380);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile drawer ---------- */
  function initMobileDrawer() {
    const toggle = document.querySelector(".nav-toggle");
    const drawer = document.querySelector(".mobile-drawer");
    if (!toggle || !drawer) return;
    const closeBtn = drawer.querySelector(".mobile-drawer__close");
    const backdrop = drawer.querySelector(".mobile-drawer__backdrop");
    const links = drawer.querySelectorAll("a");

    const openLabel = toggle.getAttribute("aria-label") || "Buka menu navigasi";
    const closeLabel = toggle.getAttribute("data-label-close") || "Tutup menu navigasi";

    function open() {
      drawer.classList.add("is-open");
      toggle.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", closeLabel);
      document.body.style.overflow = "hidden";
    }
    function close() {
      drawer.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", openLabel);
      document.body.style.overflow = "";
    }
    toggle.addEventListener("click", () => {
      if (drawer.classList.contains("is-open")) {
        close();
      } else {
        open();
      }
    });
    closeBtn && closeBtn.addEventListener("click", close);
    backdrop && backdrop.addEventListener("click", close);
    links.forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- Scroll reveal via IntersectionObserver ---------- */
  let revealObserver = null;
  function initReveal() {
    const items = document.querySelectorAll(".reveal:not([data-reveal-bound])");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
      );
    }
    items.forEach((el) => {
      el.setAttribute("data-reveal-bound", "1");
      revealObserver.observe(el);
    });
  }
  // Exposed so dynamically-injected content (e.g. outlet cards) can
  // register itself with the same reveal observer after render.
  window.GB_REINIT_REVEAL = initReveal;

  /* ---------- Back to top button ---------- */
  function initBackTop() {
    const btn = document.querySelector(".back-top");
    if (!btn) return;
    const onScroll = () => {
      btn.classList.toggle("is-visible", window.scrollY > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Active nav link highlighting with smooth pill indicator ---------- */
  /* ---------- Header "Menu" dropdown (desktop) ---------- */
  function initNavItemDropdown() {
    const wrap = document.querySelector("[data-nav-item-dropdown]");
    if (!wrap) return;
    const trigger = wrap.querySelector(":scope > a");
    const panel = wrap.querySelector(".nav-item-dropdown__panel");
    if (!trigger || !panel) return;

    let closeTimer = null;
    let suppressFocusOpen = false;

    function clampPosition() {
      // Reset any previous nudge before measuring, so we're always
      // measuring against the natural centered position.
      panel.style.setProperty("--panel-nudge", "0px");
      const rect = panel.getBoundingClientRect();
      const margin = 16;
      let nudge = 0;
      if (rect.right > window.innerWidth - margin) {
        nudge = window.innerWidth - margin - rect.right;
      } else if (rect.left < margin) {
        nudge = margin - rect.left;
      }
      if (nudge) panel.style.setProperty("--panel-nudge", `${nudge}px`);
    }

    function open() {
      if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = null; }
      wrap.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      // Position is measured after the panel is visible (next frame)
      // so getBoundingClientRect reflects its real, current size -
      // this is what keeps it from clipping at any viewport width.
      window.requestAnimationFrame(clampPosition);
    }
    function close() {
      wrap.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
    function scheduleClose() {
      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(close, 220);
    }

    wrap.addEventListener("mouseenter", open);
    wrap.addEventListener("mouseleave", scheduleClose);
    wrap.addEventListener("focusin", () => {
      if (suppressFocusOpen) return;
      open();
    });
    wrap.addEventListener("focusout", (e) => {
      if (!wrap.contains(e.relatedTarget)) close();
    });
    trigger.addEventListener("click", (e) => {
      // Clicking the label itself should still navigate to the full
      // menu page - only toggle-on-click if it's already open (so a
      // touch/tap can both preview and confirm without a stray nav).
      if (wrap.classList.contains("is-open")) return;
      e.preventDefault();
      open();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wrap.classList.contains("is-open")) {
        close();
        // Returning focus to the trigger is normal a11y practice, but
        // trigger.focus() fires "focusin" synchronously - and that
        // handler calls open() - which would instantly reopen the very
        // panel we just closed. Suppress that one re-open, then let
        // focusin behave normally again right after.
        suppressFocusOpen = true;
        trigger.focus();
        window.setTimeout(() => { suppressFocusOpen = false; }, 0);
      }
    });
    window.addEventListener("resize", () => {
      if (wrap.classList.contains("is-open")) clampPosition();
    }, { passive: true });
  }

  /* ---------- "Menu" accordion (mobile drawer) ---------- */
  function initMobileAccordion() {
    const acc = document.querySelector("[data-mobile-accordion]");
    if (!acc) return;
    const trigger = acc.querySelector(".mobile-nav-accordion__trigger");
    if (!trigger) return;
    trigger.addEventListener("click", () => {
      const isOpen = acc.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  /* ---------- Header active-page nav + sliding pill ---------- */
  function initActiveNav() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    let activeLink = null;

    document.querySelectorAll(".nav-desktop a, .mobile-drawer nav a").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const hrefFile = href.split("/").pop();
      if (hrefFile === path || (path === "" && hrefFile === "index.html")) {
        a.classList.add("is-active");
        if (a.closest(".nav-desktop")) activeLink = a;
      }
    });

    /* Inject sliding pill indicator into the desktop nav */
    const navDesktop = document.querySelector(".nav-desktop");
    if (!navDesktop) return;

    const indicator = document.createElement("span");
    indicator.className = "nav-pill-indicator";
    navDesktop.insertBefore(indicator, navDesktop.firstChild);

    let currentTarget = activeLink;

    function positionIndicator(target, instant) {
      currentTarget = target;
      if (!target) { indicator.classList.remove("is-visible"); return; }
      if (instant) indicator.style.transition = "none";
      const navRect = navDesktop.getBoundingClientRect();
      const linkRect = target.getBoundingClientRect();
      indicator.style.width  = linkRect.width  + "px";
      indicator.style.height = linkRect.height + "px";
      indicator.style.transform = `translateX(${linkRect.left - navRect.left}px) translateY(${linkRect.top - navRect.top}px)`;
      indicator.classList.add("is-visible");
      if (instant) {
        // eslint-disable-next-line no-unused-expressions
        indicator.offsetHeight; // force reflow before re-enabling transition
        indicator.style.transition = "";
      }
    }

    /* The maroon text color always follows whichever link the pill is
       currently under, so it never gets stranded dark-on-dark. */
    function setHighlight(target) {
      navDesktop.querySelectorAll("a.pill-text").forEach((a) => a.classList.remove("pill-text"));
      if (target) target.classList.add("pill-text");
    }

    /* Position on load (no transition yet) */
    positionIndicator(activeLink, true);
    setHighlight(activeLink);

    /* Re-position on hover so users get a preview of where they're going.
       mouseenter is scoped to the top-level links only (:scope > a) plus
       the "Menu" trigger itself - NOT the dropdown panel's category
       links, which live inside .nav-desktop too but shouldn't drag the
       pill off into a floating submenu when hovered.

       mouseleave needs different scoping: the dropdown panel is a DOM
       *sibling* of the "Menu" trigger, not nested inside it, so leaving
       the trigger to move into its own panel still fires mouseleave on
       the trigger. Attaching the reset to the .nav-item-dropdown
       wrapper (trigger + panel together) instead means the pill only
       resets when the pointer leaves that whole group, not mid-hover
       between the two. */
    navDesktop.querySelectorAll(":scope > a, :scope > .nav-item-dropdown > a").forEach((a) => {
      a.addEventListener("mouseenter", () => {
        positionIndicator(a);
        setHighlight(a);
      });
    });
    navDesktop.querySelectorAll(":scope > a").forEach((a) => {
      a.addEventListener("mouseleave", () => {
        positionIndicator(activeLink);
        setHighlight(activeLink);
      });
    });
    const navDropdownGroup = navDesktop.querySelector(":scope > .nav-item-dropdown");
    if (navDropdownGroup) {
      navDropdownGroup.addEventListener("mouseleave", () => {
        positionIndicator(activeLink);
        setHighlight(activeLink);
      });
    }

    /* Keep the pill in sync if link positions shift (header resize on
       scroll, viewport resize) without an animated "jump" on next hover. */
    function reposition() {
      positionIndicator(currentTarget || activeLink, true);
    }
    window.GB_REPOSITION_NAV_PILL = reposition;
    window.addEventListener("resize", () => reposition(), { passive: true });

    /* Translated nav labels ("Hubungi Kami" vs "Contact Us", etc.) are
       rarely the same pixel width, so switching language reflows every
       link's position. Without this, the pill silently stays at its old
       coordinates until the next hover recalculates it - i.e. it looks
       like it "jumped" the moment you hover, when really it just never
       moved to begin with. Reposition instantly (no slide animation)
       right after the new labels are painted in. */
    document.addEventListener("gb:langchange", () => reposition());
  }

  /* ---------- Accordion (used on Nasi Kotak page) ---------- */
  function initAccordion() {
    document.querySelectorAll(".accordion-item__trigger").forEach((trigger) => {
      const item = trigger.closest(".accordion-item");
      const panel = item.querySelector(".accordion-item__panel");
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        // close siblings within same accordion group
        const group = item.parentElement;
        group.querySelectorAll(".accordion-item.is-open").forEach((openItem) => {
          if (openItem !== item) {
            openItem.classList.remove("is-open");
            openItem.querySelector(".accordion-item__panel").style.maxHeight = null;
            openItem.querySelector(".accordion-item__trigger").setAttribute("aria-expanded", "false");
          }
        });
        if (isOpen) {
          item.classList.remove("is-open");
          panel.style.maxHeight = null;
          trigger.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("is-open");
          panel.style.maxHeight = panel.scrollHeight + "px";
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------- Menu category tabs (menu.html) ---------- */
  function initMenuTabs() {
    const tabs = document.querySelectorAll(".menu-tabs__scroll button");
    if (!tabs.length) return;
    const sections = Array.from(tabs)
      .map((t) => document.getElementById(t.getAttribute("data-target")))
      .filter(Boolean);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = document.getElementById(tab.getAttribute("data-target"));
        if (!target) return;
        const navOuter = document.querySelector(".nav-outer");
        const navClearance = navOuter ? navOuter.getBoundingClientRect().height : 92;
        const offset = navClearance + (document.querySelector(".menu-tabs")?.offsetHeight || 0) + 12;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      });
    });

    if (!("IntersectionObserver" in window) || !sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tabs.forEach((t) => t.classList.remove("is-active"));
            const match = Array.from(tabs).find((t) => t.getAttribute("data-target") === entry.target.id);
            if (match) match.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Outlet filter chips on menu page ---------- */
  function initOutletFilter() {
    const chips = document.querySelectorAll("[data-outlet-filter]");
    const cards = document.querySelectorAll("[data-outlet-card]");
    if (!chips.length || !cards.length) return;
    chips.forEach((chip) => {
      if (chip.hasAttribute("data-filter-bound")) return;
      chip.setAttribute("data-filter-bound", "1");
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        const val = chip.getAttribute("data-outlet-filter");
        // re-query cards at click time in case they were re-rendered
        // (e.g. after a language switch re-injected the outlet grid)
        document.querySelectorAll("[data-outlet-card]").forEach((card) => {
          const show = val === "all" || card.getAttribute("data-outlet-card") === val;
          card.style.display = show ? "" : "none";
        });
      });
    });
  }
  // Exposed so render-outlets.js can (re)bind filter chips once the
  // outlet cards it injects actually exist in the DOM - script load
  // order alone doesn't guarantee the cards exist before this runs.
  window.GB_REINIT_OUTLET_FILTER = initOutletFilter;

  /* ---------- Current year in footer ---------- */
  function initYear() {
    document.querySelectorAll("[data-current-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- Parallax-lite for hero backdrop blobs (subtle) ---------- */
  function initParallax() {
    const targets = document.querySelectorAll("[data-parallax]");
    if (!targets.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    function update() {
      const y = window.scrollY;
      targets.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        el.style.transform = `translateY(${y * speed}px)`;
      });
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------- Interactive dish rows (Nasi Kotak & Tumpeng page) ----------
     :hover already handles desktop mice, and :focus-visible in the CSS
     already handles keyboard Tab. Touch screens don't have a lasting
     hover state, so tapping a row explicitly toggles the same spotlight
     class instead. */
  function initDishSpotlight() {
    const items = document.querySelectorAll(".nkt-menu-item");
    if (!items.length) return;
    items.forEach((item) => {
      item.addEventListener("click", () => {
        const wasActive = item.classList.contains("is-active");
        items.forEach((el) => el.classList.remove("is-active"));
        if (!wasActive) item.classList.add("is-active");
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.click();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initMobileDrawer();
    initReveal();
    initBackTop();
    initActiveNav();
    initNavItemDropdown();
    initMobileAccordion();
    initAccordion();
    initMenuTabs();
    initOutletFilter();
    initYear();
    initParallax();
    initDishSpotlight();
  });
})();
