/* ===================================================================
   GEROBAK BETAWI - VISUAL EFFECTS
   Vanilla-JS adaptations (no React) of two interaction patterns:
     1. RotatingText     - cycles a word/phrase in and out with a slide+fade
     2. Word-level reveal - splits a heading into words that fade/blur in
        one by one as it enters the viewport (layered on top of the
        existing .reveal fade-up system in main.js, not a replacement)
   The marquee is intentionally NOT driven from here anymore - it's a
   plain, constant-speed CSS animation (see components.css) so it loops
   forever with zero risk of scroll-driven jitter or drift.
   =================================================================== */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Rotating text ---------- */
  const ROTATING_WORDS = {
    id: ["Makanan", "Cemilan", "Jajanan Jalanan"],
    en: ["Meals", "Snacks", "Street Food"]
  };

  function currentLang() {
    return document.documentElement.getAttribute("lang") === "en" ? "en" : "id";
  }

  function initRotatingText() {
    const el = document.querySelector("[data-rotating-text]");
    if (!el) return;

    const interval = parseInt(el.getAttribute("data-rt-interval"), 10) || 2200;
    let words = ROTATING_WORDS[currentLang()];
    let i = 0;
    let timerId = null;
    let resizeRaf = null;

    el.classList.add("rotating-text");
    const inner = document.createElement("span");
    inner.className = "rotating-text__word";
    inner.textContent = words[0];
    el.innerHTML = "";
    el.appendChild(inner);

    /* ---- Fixed-width lock ----
       Left to shrink-wrap its content (the default for an inline-flex
       pill), the H1 line reflows every time the word changes length -
       "Meals" vs "Street Food" are very different widths. Because the
       hero centers its content vertically in a 100vh box, that reflow
       shifts the whole hero (and therefore looks like the entire page
       "glitching") on a fixed ~2.2s timer, completely independent of
       scrolling. Measuring every candidate word up front and locking
       the pill to the widest one means the box never changes size when
       the word inside it does. Re-measured on language change (all-new
       word list) and on resize (font-size is clamp()-based, so it can
       change with viewport width). */
    function lockWidth() {
      const probe = document.createElement("span");
      probe.className = "rotating-text__word";
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.whiteSpace = "nowrap";
      probe.style.left = "0";
      probe.style.top = "0";
      probe.style.transition = "none";
      el.appendChild(probe);
      let max = 0;
      words.forEach((w) => {
        probe.textContent = w;
        max = Math.max(max, probe.getBoundingClientRect().width);
      });
      el.removeChild(probe);
      inner.style.minWidth = Math.ceil(max) + "px";
    }

    function tick() {
      i = (i + 1) % words.length;
      inner.classList.add("is-leaving");
      window.setTimeout(() => {
        inner.textContent = words[i];
        inner.classList.remove("is-leaving");
        inner.classList.add("is-entering");
        // Force reflow so the entering transition actually plays.
        // eslint-disable-next-line no-unused-expressions
        inner.offsetWidth;
        inner.classList.remove("is-entering");
      }, 260);
    }

    function start() {
      if (timerId) window.clearInterval(timerId);
      if (prefersReducedMotion || words.length < 2) return;
      timerId = window.setInterval(tick, interval);
    }
    lockWidth();
    start();

    document.addEventListener("gb:langchange", () => {
      words = ROTATING_WORDS[currentLang()];
      i = 0;
      inner.textContent = words[0];
      lockWidth();
      start();
    });

    window.addEventListener(
      "resize",
      () => {
        if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
        resizeRaf = window.requestAnimationFrame(lockWidth);
      },
      { passive: true }
    );
  }

  /* ---------- 2. YouTube click-to-play facade ---------- */
  // YouTube's embedded player validates the parent page's origin over
  // postMessage; a page opened via file:// (double-clicked, no server)
  // has no real origin, which the player rejects as "Error 153: Video
  // player configuration error" every time, regardless of the video
  // itself. There is no client-side fix for that case - it only ever
  // works once the page is actually served over http(s) - so rather
  // than let the person click play and hit a dead, unexplained error,
  // detect it up front and swap in a direct "watch on YouTube" link.
  function isServedOverHttp() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function playFacade(facade) {
    const id = facade.getAttribute("data-yt-id");
    if (!id || facade.hasAttribute("data-yt-playing")) return;
    facade.setAttribute("data-yt-playing", "1");

    if (!isServedOverHttp()) {
      const link = document.createElement("a");
      link.href = `https://www.youtube.com/watch?v=${id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "yt-facade__local-fallback";
      link.textContent = window.GB_CURRENT_LANG === "en"
        ? "Preview mode: embedded video only works once hosted. Watch on YouTube instead \u2192"
        : "Mode pratinjau: video tertanam hanya berfungsi setelah situs online. Tonton di YouTube \u2192";
      facade.innerHTML = "";
      facade.appendChild(link);
      return;
    }

    const iframe = document.createElement("iframe");
    const origin = encodeURIComponent(window.location.origin);
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${origin}`;
    const caption = facade.closest("figure") ? facade.closest("figure").querySelector("figcaption") : null;
    iframe.title = facade.getAttribute("data-yt-title") || (caption && caption.textContent.trim()) || "YouTube video";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    facade.innerHTML = "";
    facade.appendChild(iframe);
  }

  function initYouTubeFacades() {
    document.querySelectorAll("[data-yt-facade]:not([data-yt-bound])").forEach((facade) => {
      facade.setAttribute("data-yt-bound", "1");
      const trigger = () => playFacade(facade);
      const playBtn = facade.querySelector(".yt-facade__play");
      if (playBtn) {
        playBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          trigger();
        });
      }
      facade.addEventListener("click", trigger);
    });
  }

  /* ---------- 3. Word-by-word scroll reveal for headings ---------- */
  let wordRevealObserver = null;
  function initWordReveal() {
    const items = document.querySelectorAll("[data-word-reveal]:not([data-wr-bound])");
    if (!items.length) return;

    items.forEach((el) => {
      el.setAttribute("data-wr-bound", "1");
      const text = el.textContent;
      el.setAttribute("aria-label", text);
      let wordIndex = 0;
      el.innerHTML = text
        .split(/(\s+)/)
        .map((chunk) => {
          if (chunk.trim() === "") return chunk;
          const delay = Math.min(wordIndex * 45, 600);
          wordIndex++;
          return `<span class="word-reveal__word" style="transition-delay:${delay}ms">${chunk}</span>`;
        })
        .join("");
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    if (!wordRevealObserver) {
      wordRevealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              wordRevealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4, rootMargin: "0px 0px -10% 0px" }
      );
    }
    items.forEach((el) => wordRevealObserver.observe(el));
  }
  window.GB_REINIT_WORD_REVEAL = initWordReveal;

  document.addEventListener("gb:langchange", () => {
    document.querySelectorAll("[data-word-reveal][data-wr-bound]").forEach((el) => {
      const wasRevealed = el.classList.contains("is-revealed");
      el.removeAttribute("data-wr-bound");
      el.classList.remove("is-revealed");
      initWordReveal();
      if (wasRevealed) el.classList.add("is-revealed");
    });
  });

  /* ---------- 4. Per-item menu reveal (menu.html dish rows) ---------- */
  let menuItemObserver = null;
  function initMenuItemReveal() {
    const groups = document.querySelectorAll(".nkt-menu-card__items:not([data-mir-bound])");
    if (!groups.length) return;

    groups.forEach((group) => {
      group.setAttribute("data-mir-bound", "1");
      const items = Array.from(group.children);
      items.forEach((item, index) => {
        item.classList.add("menu-item-reveal");
        item.style.setProperty("--reveal-delay", `${Math.min(index * 70, 420)}ms`);
      });
    });

    const allItems = document.querySelectorAll(".menu-item-reveal:not(.is-revealed)");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      allItems.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    if (!menuItemObserver) {
      menuItemObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              menuItemObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
      );
    }
    allItems.forEach((el) => menuItemObserver.observe(el));
  }

  /* ---------- 4. Dish-note carousel (e.g. Nasi Kucing 7 Rasa) ---------- */
  function initCarousels() {
    const carousels = document.querySelectorAll("[data-carousel]:not([data-car-bound])");
    if (!carousels.length) return;

    carousels.forEach((carousel) => {
      carousel.setAttribute("data-car-bound", "1");
      const track = carousel.querySelector("[data-carousel-track]");
      const prevBtn = carousel.querySelector("[data-carousel-prev]");
      const nextBtn = carousel.querySelector("[data-carousel-next]");
      if (!track) return;

      function slideWidth() {
        const slide = track.querySelector(".sticky-note__carousel-slide");
        return slide ? slide.getBoundingClientRect().width : track.clientWidth;
      }

      function scrollByOne(direction) {
        track.scrollBy({
          left: direction * slideWidth(),
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      }

      if (prevBtn) prevBtn.addEventListener("click", () => scrollByOne(-1));
      if (nextBtn) nextBtn.addEventListener("click", () => scrollByOne(1));

      // Click-and-drag scrolling for mouse/trackpad users (touch already
      // scrolls natively, so real touch pointers are left alone).
      let isDown = false;
      let startX = 0;
      let startScroll = 0;

      track.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch") return;
        isDown = true;
        track.classList.add("is-dragging");
        startX = e.clientX;
        startScroll = track.scrollLeft;
        track.setPointerCapture(e.pointerId);
      });
      track.addEventListener("pointermove", (e) => {
        if (!isDown) return;
        track.scrollLeft = startScroll - (e.clientX - startX);
      });
      function endDrag() {
        if (!isDown) return;
        isDown = false;
        track.classList.remove("is-dragging");
      }
      track.addEventListener("pointerup", endDrag);
      track.addEventListener("pointerleave", endDrag);
      track.addEventListener("pointercancel", endDrag);
    });
  }

  /* ---------- 4. Image error fallbacks ----------
     Previously wired via inline onerror="" attributes. Those are
     blocked by this site's own Content-Security-Policy once it's
     actually enforced (script-src 'self', no 'unsafe-inline') - which
     only happens once the site is deployed with the security headers
     from .htaccess / _headers / nginx.conf.sample active, so this bug
     stayed invisible during local file:// preview. Handled here via
     addEventListener instead, so the fallbacks work under the strict
     CSP exactly as they did before. */
  function bindImageErrorFallback(el, handler) {
    if (el.complete && el.naturalWidth === 0) { handler(el); return; }
    el.addEventListener("error", () => handler(el), { once: true });
  }

  function initImageErrorFallbacks() {
    document.querySelectorAll("[data-onerror-hide-parent]").forEach((img) => {
      bindImageErrorFallback(img, (el) => {
        if (el.parentElement) el.parentElement.style.display = "none";
      });
    });

    document.querySelectorAll("[data-onerror-fallback]").forEach((img) => {
      bindImageErrorFallback(img, (el) => {
        const fallbackSrc = el.getAttribute("data-onerror-fallback");
        if (fallbackSrc && el.src !== fallbackSrc) el.src = fallbackSrc;
      });
    });

    document.querySelectorAll("[data-onerror-missing-thumb]").forEach((img) => {
      bindImageErrorFallback(img, (el) => {
        const wrap = el.closest(".nkt-menu-item__thumb");
        if (wrap) wrap.classList.add("nkt-menu-item__thumb--missing");
        el.remove();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initRotatingText();
    initYouTubeFacades();
    initWordReveal();
    initMenuItemReveal();
    initCarousels();
    initImageErrorFallbacks();
  });
})();
