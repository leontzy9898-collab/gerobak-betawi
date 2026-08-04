/* ===================================================================
   GEROBAK BETAWI - OUTLET CARD RENDERER
   Renders into [data-outlets-root] containers, reading window.GB_OUTLETS
   =================================================================== */

(function () {
  "use strict";

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function buildCard(outlet, lang) {
    const I = window.GB_ICONS;
    const H = window.GB_HELPERS;
    const t = (id, en) => (lang === "en" ? en : id);

    const phonesHtml = outlet.phones
      .map((p) => `<a href="${H.telLink(p)}">${I.phone}${escapeHtml(p)}</a>`)
      .join("");

    const waBtn = outlet.whatsapp
      ? `<a class="btn-sm btn-sm--wa" href="${H.waLink(outlet.whatsapp, lang === "en"
            ? `Hello Gerobak Betawi ${outlet.name.replace("Gerobak Betawi ", "")}, I would like to ask about the menu / place an order.`
            : `Halo Gerobak Betawi ${outlet.name.replace("Gerobak Betawi ", "")}, saya ingin bertanya menu / pesan.`
          )}" target="_blank" rel="noopener noreferrer">${I.whatsapp}${t("WhatsApp", "WhatsApp")}</a>`
      : "";

    const goBtn = outlet.gofood
      ? `<a class="btn-sm btn-sm--go" href="${outlet.gofood}" target="_blank" rel="noopener noreferrer">${t("GoFood", "GoFood")}</a>`
      : "";
    const grabBtn = outlet.grabfood
      ? `<a class="btn-sm btn-sm--grab" href="${outlet.grabfood}" target="_blank" rel="noopener noreferrer">${t("GrabFood", "GrabFood")}</a>`
      : "";

    const mapBtn = `<a class="btn-sm btn-sm--map" href="${H.mapsLink(outlet.mapsQuery)}" target="_blank" rel="noopener noreferrer">${I.pin}${t("Arah", "Directions")}</a>`;

    return `
      <article class="outlet-card reveal" data-outlet-card="${outlet.id}">
        <div class="outlet-card__head">
          <h3>${escapeHtml(outlet.name)}</h3>
          <span class="outlet-card__pin">${I.pin}</span>
        </div>
        <p class="outlet-card__addr">${I.pin}<span>${escapeHtml(outlet.address)}</span></p>
        <div class="outlet-card__phones">${phonesHtml}</div>
        <p class="outlet-card__hours">${I.clock} ${t("07.30-24.00 WIB", "7:30 AM to Midnight")}</p>
        <div class="outlet-card__actions">
          ${waBtn}${goBtn}${grabBtn}${mapBtn}
        </div>
      </article>
    `;
  }

  function render() {
    const roots = document.querySelectorAll("[data-outlets-root]");
    if (!roots.length || !window.GB_OUTLETS) return;
    const lang = window.GB_CURRENT_LANG || "id";
    roots.forEach((root) => {
      root.innerHTML = window.GB_OUTLETS.map((o) => buildCard(o, lang)).join("");
    });
    // re-run reveal observer on freshly injected nodes
    if (window.GB_REINIT_REVEAL) window.GB_REINIT_REVEAL();
    else {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    }
    // (re)bind the outlet filter chips now that cards actually exist,
    // main.js's own DOMContentLoaded handler may have run first and
    // found zero cards, since this script renders them asynchronously.
    if (window.GB_REINIT_OUTLET_FILTER) window.GB_REINIT_OUTLET_FILTER();
  }

  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("gb:langchange", render);
})();
