/* ===================================================================
   GEROBAK BETAWI - CONTACT FORM HANDLER
   Client-side validation + AJAX submit to /api/contact (Vercel
   serverless function, see api/contact.js).
   Defense-in-depth: server re-validates everything; this is UX only.
   =================================================================== */

(function () {
  "use strict";

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function showFieldError(field, message) {
    field.classList.add("has-error");
    const errEl = field.querySelector(".field-error");
    if (errEl && message) errEl.textContent = message;
  }
  function clearFieldError(field) {
    field.classList.remove("has-error");
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate(form, lang) {
    let valid = true;
    const msgs = {
      required: lang === "en" ? "This field is required." : "Kolom ini wajib diisi.",
      email: lang === "en" ? "Please enter a valid email." : "Mohon masukkan email yang valid.",
      tooShort: lang === "en" ? "Please write a longer message (min 10 characters)." : "Mohon tulis pesan lebih panjang (min 10 karakter).",
      consent: lang === "en" ? "Please agree to the data usage notice." : "Mohon setujui penggunaan data."
    };

    qsa(".field", form).forEach((field) => {
      const input = field.querySelector("input:not([type=checkbox]), textarea, select");
      if (!input) return;
      clearFieldError(field);

      if (input.hasAttribute("required") && !input.value.trim()) {
        showFieldError(field, msgs.required);
        valid = false;
        return;
      }
      if (input.type === "email" && input.value.trim() && !EMAIL_RE.test(input.value.trim())) {
        showFieldError(field, msgs.email);
        valid = false;
        return;
      }
      if (input.name === "message" && input.value.trim().length > 0 && input.value.trim().length < 10) {
        showFieldError(field, msgs.tooShort);
        valid = false;
        return;
      }
    });

    const consent = qs('input[name="consent"]', form);
    if (consent && !consent.checked) {
      const field = consent.closest(".field") || consent.closest(".consent-row");
      if (field) showFieldError(field, msgs.consent);
      valid = false;
    }

    return valid;
  }

  function setStatus(statusEl, type, message) {
    statusEl.className = "form-status is-visible form-status--" + type;
    const icon = type === "success" ? window.GB_ICONS.check : window.GB_ICONS.alert;
    statusEl.innerHTML = icon + "<span>" + message + "</span>";
  }

  // The contact API is a Vercel serverless function at /api/contact.
  // Always resolved from the site root so it works the same whether
  // the page is served at "/" or a sub-path.
  function apiUrl() {
    return new URL("/api/contact", window.location.origin).toString();
  }

  // True only when this page is actually being served over http(s).
  // When someone double-clicks index.html and the browser uses the
  // file:// protocol, there is no server to talk to - PHP cannot run
  // in a browser - so we detect that up front and switch the form
  // into a "graceful fallback" mode that still lets people reach us.
  function isServedOverHttp() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function buildMailtoFallback(form, lang) {
    const fd = new FormData(form);
    const first = (fd.get("first_name") || "").toString();
    const last = (fd.get("last_name") || "").toString();
    const email = (fd.get("email") || "").toString();
    const phone = (fd.get("phone") || "").toString();
    const outlet = (fd.get("outlet") || "").toString();
    const message = (fd.get("message") || "").toString();

    const subject = encodeURIComponent("Pesan dari Website - " + (first + " " + last).trim());
    const bodyLines = [
      "Nama: " + (first + " " + last).trim(),
      "Email: " + email,
      phone ? "Telepon: " + phone : "",
      outlet ? "Cabang Tujuan: " + outlet : "",
      "",
      "Pesan:",
      message
    ].filter(Boolean);
    const body = encodeURIComponent(bodyLines.join("\n"));
    // Matches the default CONTACT_TO_EMAIL in api/contact.js. Once a
    // real "info@" mailbox exists on your own domain, you can swap
    // this back to that address.
    return "mailto:leotzy9898@gmail.com?subject=" + subject + "&body=" + body;
  }

  // Outlet dropdown is generated from the same outlets-data.js used by
  // the Lokasi/Menu pages and the WhatsApp picker, so this form can
  // never drift out of sync if a branch is renamed or added.
  function populateOutletSelect() {
    const select = qs("#outlet");
    const outlets = window.GB_OUTLETS || [];
    if (!select || !outlets.length) return;
    outlets.forEach((outlet) => {
      const opt = document.createElement("option");
      opt.value = outlet.name.replace("Gerobak Betawi ", "");
      opt.textContent = outlet.name;
      select.appendChild(opt);
    });
  }

  function initContactForm() {
    const form = qs("#contact-form");
    if (!form) return;
    populateOutletSelect();
    const statusEl = qs("#form-status", form) || qs("#form-status");
    const submitBtn = qs('button[type="submit"]', form);
    const localNotice = qs("#local-mode-notice");

    // If opened directly as a local file (no web server), tell the
    // visitor plainly instead of silently failing on submit. This
    // never happens once the site is hosted on Vercel (https://),
    // since isServedOverHttp() is then always true.
    if (!isServedOverHttp()) {
      if (localNotice) localNotice.classList.add("is-visible");
    }

    // live char counter for message
    const messageField = qs('textarea[name="message"]', form);
    const charCount = qs("#char-count");
    if (messageField && charCount) {
      const update = () => { charCount.textContent = messageField.value.length + " / 1000"; };
      messageField.addEventListener("input", update);
      update();
    }

    qsa(".field input, .field textarea, .field select", form).forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.closest(".field");
        if (field) clearFieldError(field);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const lang = window.GB_CURRENT_LANG || "id";

      if (!validate(form, lang)) {
        if (statusEl) setStatus(statusEl, "error", lang === "en"
          ? "Please check the fields marked in red."
          : "Mohon periksa kembali kolom yang ditandai merah.");
        const firstError = qs(".field.has-error");
        if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // No web server underneath this page (opened as a local file),
      // there is nowhere for fetch() to even reach. Offer the mailto
      // fallback immediately instead of attempting and failing.
      if (!isServedOverHttp()) {
        window.location.href = buildMailtoFallback(form, lang);
        if (statusEl) setStatus(statusEl, "success", lang === "en"
          ? "Opening your email app to send this message (preview mode, no live server detected)."
          : "Membuka aplikasi email untuk mengirim pesan ini (mode pratinjau, server belum aktif).");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
      if (statusEl) statusEl.classList.remove("is-visible");

      try {
        const fd = new FormData(form);
        const payload = {
          first_name: (fd.get("first_name") || "").toString(),
          last_name: (fd.get("last_name") || "").toString(),
          email: (fd.get("email") || "").toString(),
          phone: (fd.get("phone") || "").toString(),
          outlet: (fd.get("outlet") || "").toString(),
          message: (fd.get("message") || "").toString(),
          consent: !!fd.get("consent"),
          website: (fd.get("website") || "").toString(), // honeypot
          lang
        };

        const res = await fetch(apiUrl(), {
          method: "POST",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });

        let data;
        try { data = await res.json(); } catch (parseErr) { data = null; }

        if (res.ok && data && data.success) {
          if (statusEl) setStatus(statusEl, "success", data.message || (lang === "en"
            ? "Thank you! Your message has been sent."
            : "Terima kasih! Pesan Anda telah terkirim."));
          form.reset();
          if (charCount) charCount.textContent = "0 / 1000";
        } else {
          const serverMsg = data && data.message;
          if (statusEl) setStatus(statusEl, "error", serverMsg || (lang === "en"
            ? "Sorry, something went wrong. Please try again or contact us via WhatsApp."
            : "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi kami via WhatsApp."));
        }
      } catch (err) {
        // fetch() itself threw - almost always means the API endpoint
        // could not be reached at all (PHP not enabled on this host,
        // wrong path, or no network). Offer the mailto fallback so the
        // visitor is never stuck with a dead form.
        const lang2 = window.GB_CURRENT_LANG || "id";
        if (statusEl) {
          statusEl.className = "form-status is-visible form-status--error";
          statusEl.innerHTML = window.GB_ICONS.alert +
            "<span>" + (lang2 === "en"
              ? "Could not reach the server. "
              : "Tidak dapat menghubungi server. ") +
            '<a href="' + buildMailtoFallback(form, lang2) + '" style="text-decoration:underline;">' +
            (lang2 === "en" ? "Send via email instead" : "Kirim lewat email sebagai gantinya") +
            "</a> " + (lang2 === "en" ? "or use WhatsApp." : "atau gunakan WhatsApp.") + "</span>";
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initContactForm);
})();
