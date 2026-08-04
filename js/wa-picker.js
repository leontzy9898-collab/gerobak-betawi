/* ===================================================================
   GEROBAK BETAWI - WHATSAPP BRANCH PICKER
   Intercepts every element marked [data-wa-picker] (instead of linking
   straight to one branch's WhatsApp number) and opens a modal so the
   customer can choose which branch to message. Falls back gracefully
   if outlet data hasn't loaded for any reason.
   =================================================================== */

(function () {
  "use strict";

  let modalEl = null;
  let lastFocusedTrigger = null;
  const LAST_BRANCH_KEY = "gb_last_wa_branch";

  function getLastBranch() {
    try {
      return localStorage.getItem(LAST_BRANCH_KEY);
    } catch (e) {
      return null;
    }
  }
  function setLastBranch(id) {
    try {
      localStorage.setItem(LAST_BRANCH_KEY, id);
    } catch (e) {
      /* private browsing / storage disabled - not critical, skip silently */
    }
  }

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function trapFocus(e) {
    if (e.key !== "Tab" || !modalEl || !modalEl.classList.contains("is-open")) return;
    const focusable = getFocusable(modalEl.querySelector(".wa-picker__panel"));
    if (!focusable.length) return;
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

  // While the modal is open, everything else on the page becomes
  // unreachable by Tab and invisible to screen readers - a proper modal,
  // not just a visual overlay a keyboard user could tab straight past.
  function setBackgroundInert(hidden) {
    Array.from(document.body.children).forEach((el) => {
      if (el === modalEl || el.tagName === "SCRIPT") return;
      if (hidden) {
        if (!el.hasAttribute("aria-hidden")) {
          el.setAttribute("aria-hidden", "true");
          el.setAttribute("data-wa-picker-restore", "1");
        }
        if ("inert" in el) el.inert = true;
      } else {
        if (el.hasAttribute("data-wa-picker-restore")) {
          el.removeAttribute("aria-hidden");
          el.removeAttribute("data-wa-picker-restore");
        }
        if ("inert" in el) el.inert = false;
      }
    });
  }

  // Prefilled WhatsApp message templates per "intent" - lets any trigger
  // site-wide (not just generic "Pesan Sekarang") open the same picker
  // but pre-fill a more relevant message, e.g. the Quick Action Bar's
  // "Katering" button, without needing a whole separate modal.
  const INTENT_MESSAGES = {
    order: {
      id: (shortName) => `Halo Gerobak Betawi ${shortName}, saya ingin bertanya menu / pesan.`,
      en: (shortName) => `Hello Gerobak Betawi ${shortName}, I would like to ask about the menu / place an order.`
    },
    catering: {
      id: (shortName) => `Halo Gerobak Betawi ${shortName}, saya ingin tanya paket katering nasi kotak / tumpeng untuk acara saya.`,
      en: (shortName) => `Hello Gerobak Betawi ${shortName}, I'd like to ask about catering packages (nasi kotak / tumpeng) for my event.`
    }
  };

  function buildModal() {
    if (modalEl) return modalEl;

    const lang = window.GB_CURRENT_LANG || "id";
    const t = (id, en) => (lang === "en" ? en : id);

    const wrap = document.createElement("div");
    wrap.className = "wa-picker";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", t("Pilih cabang", "Choose a branch"));
    wrap.innerHTML = `
      <div class="wa-picker__backdrop" data-wa-picker-close></div>
      <div class="wa-picker__panel">
        <div class="wa-picker__head">
          <div class="wa-picker__head-text" data-wa-picker-headtext>
            <h3>${t("Hubungi Cabang Mana?", "Contact Which Branch?")}</h3>
            <p>${t("Pilih cabang terdekat untuk mulai chat", "Pick the nearest branch to start chatting")}</p>
          </div>
          <button type="button" class="wa-picker__close" data-wa-picker-close aria-label="${t("Tutup", "Close")}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="wa-picker__list" data-wa-picker-list></div>
      </div>
    `;
    document.body.appendChild(wrap);
    modalEl = wrap;

    wrap.querySelectorAll("[data-wa-picker-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", (e) => {
      if (!wrap.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      trapFocus(e);
    });

    return wrap;
  }

  function renderList(mode, intent) {
    const modal = buildModal();
    const list = modal.querySelector("[data-wa-picker-list]");
    const headtext = modal.querySelector("[data-wa-picker-headtext]");
    const outlets = window.GB_OUTLETS || [];
    const lang = window.GB_CURRENT_LANG || "id";
    const t = (id, en) => (lang === "en" ? en : id);
    const lastId = getLastBranch();

    const waIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.2-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.6-.7.7-.9.1-.2.1-.4 0-.6-.1-.2-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1 0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 2.7 1.1 2.7.7 3.2.7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3 0-.1-.2-.2-.4-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.1l-.3-.2-3.1.8.8-3-.2-.3C4.4 15 4 13.5 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8z"/></svg>';
    const phoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
    const bikeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9.5 11.5L9 9h4l3 6.5M9 9l3-3h3"/></svg>';
    const arrowIcon = '<svg class="wa-picker__item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    const lastBadge = `<span class="wa-picker__badge">${t("Terakhir dipilih", "Last used")}</span>`;

    /* ---- Delivery mode: list GoFood / GrabFood buttons per branch,
       instead of a single WhatsApp/phone link. Reuses the same modal
       shell and outlet data, just a different item template. ---- */
    if (mode === "delivery") {
      if (headtext) {
        headtext.innerHTML = `
          <h3>${t("Order Antar dari Cabang Mana?", "Order Delivery From Which Branch?")}</h3>
          <p>${t("Pilih cabang untuk buka GoFood atau GrabFood", "Pick a branch to open GoFood or GrabFood")}</p>
        `;
      }
      list.innerHTML = outlets.map((outlet) => {
        const shortName = outlet.name.replace("Gerobak Betawi ", "");
        const hasDelivery = outlet.gofood || outlet.grabfood;
        return `
          <div class="wa-picker__item wa-picker__item--delivery" data-outlet-id="${outlet.id}">
            <span class="wa-picker__item-icon is-delivery">${bikeIcon}</span>
            <span class="wa-picker__item-body">
              <strong>${shortName}</strong>
              ${hasDelivery ? "" : `<span>${t("Belum tersedia online, hubungi cabang", "Not online yet, please call the branch")}</span>`}
            </span>
            <span class="wa-picker__item-delivery-links">
              ${outlet.gofood ? `<a class="btn-sm btn-sm--go" href="${outlet.gofood}" target="_blank" rel="noopener noreferrer">GoFood</a>` : ""}
              ${outlet.grabfood ? `<a class="btn-sm btn-sm--grab" href="${outlet.grabfood}" target="_blank" rel="noopener noreferrer">GrabFood</a>` : ""}
              ${hasDelivery ? "" : `<a class="btn-sm btn-sm--map" href="tel:${(outlet.phones && outlet.phones[0] || "").replace(/[^\d+]/g, "")}">${t("Telepon", "Call")}</a>`}
            </span>
          </div>
        `;
      }).join("");
      return;
    }

    /* ---- Default / order mode: WhatsApp (or call, if no WA on file) ---- */
    if (headtext) {
      headtext.innerHTML = `
        <h3>${t("Hubungi Cabang Mana?", "Contact Which Branch?")}</h3>
        <p>${t("Pilih cabang terdekat untuk mulai chat", "Pick the nearest branch to start chatting")}</p>
      `;
    }
    const template = INTENT_MESSAGES[intent] || INTENT_MESSAGES.order;

    list.innerHTML = outlets.map((outlet) => {
      const shortName = outlet.name.replace("Gerobak Betawi ", "");
      const isLast = outlet.id === lastId;
      const itemClass = "wa-picker__item" + (isLast ? " is-recent" : "");
      if (outlet.whatsapp) {
        const msg = encodeURIComponent(template[lang === "en" ? "en" : "id"](shortName));
        const href = `https://wa.me/${outlet.whatsapp}?text=${msg}`;
        return `
          <a class="${itemClass}" href="${href}" target="_blank" rel="noopener noreferrer" data-outlet-id="${outlet.id}">
            <span class="wa-picker__item-icon">${waIcon}</span>
            <span class="wa-picker__item-body">
              <strong>${shortName}</strong>
              <span>${outlet.whatsappDisplay}</span>
            </span>
            ${isLast ? lastBadge : ""}
            ${arrowIcon}
          </a>
        `;
      }
      // No WhatsApp on file for this branch - offer a phone call instead.
      const phone = outlet.phones && outlet.phones[0] ? outlet.phones[0] : "";
      const telHref = "tel:" + phone.replace(/[^\d+]/g, "");
      return `
        <a class="${itemClass}" href="${telHref}" data-outlet-id="${outlet.id}">
          <span class="wa-picker__item-icon is-call">${phoneIcon}</span>
          <span class="wa-picker__item-body">
            <strong>${shortName}</strong>
            <span>${phone} (${t("Telepon", "Call")})</span>
          </span>
          ${isLast ? lastBadge : ""}
          ${arrowIcon}
        </a>
      `;
    }).join("");

    list.querySelectorAll("[data-outlet-id]").forEach((el) => {
      el.addEventListener("click", () => setLastBranch(el.getAttribute("data-outlet-id")));
    });
  }

  function openModal(trigger) {
    lastFocusedTrigger = trigger || document.activeElement;
    const mode = trigger && trigger.getAttribute ? trigger.getAttribute("data-wa-picker-mode") : null;
    const intent = trigger && trigger.getAttribute ? trigger.getAttribute("data-wa-intent") : null;
    renderList(mode, intent);
    setBackgroundInert(true);
    modalEl.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const closeBtn = modalEl.querySelector(".wa-picker__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove("is-open");
    document.body.style.overflow = "";
    setBackgroundInert(false);
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function") {
      lastFocusedTrigger.focus();
    }
    lastFocusedTrigger = null;
  }

  function init() {
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-wa-picker]");
      if (!trigger) return;
      e.preventDefault();
      openModal(trigger);
    });
    // Re-render labels if the visitor switches language while the
    // modal happens to be open.
    document.addEventListener("gb:langchange", () => {
      if (modalEl && modalEl.classList.contains("is-open")) {
        const mode = lastFocusedTrigger && lastFocusedTrigger.getAttribute ? lastFocusedTrigger.getAttribute("data-wa-picker-mode") : null;
        const intent = lastFocusedTrigger && lastFocusedTrigger.getAttribute ? lastFocusedTrigger.getAttribute("data-wa-intent") : null;
        renderList(mode, intent);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
