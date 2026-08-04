/* ===================================================================
   GEROBAK BETAWI - CONTACT FORM API (Vercel Serverless Function)
   Receives the contact form as JSON, validates it server-side, and
   sends an email via the Resend API (https://resend.com).

   Required environment variable (set in Vercel Project Settings ->
   Environment Variables):
     RESEND_API_KEY   Your Resend API key (starts with "re_")

   Optional environment variables:
     CONTACT_TO_EMAIL    Inbox that receives messages (default below)
     CONTACT_FROM_EMAIL  "From" address Resend sends as (default below)
     ALLOWED_ORIGIN       Your live domain, e.g. https://gerobakbetawi.com
                           Used as a lightweight anti-abuse check; if
                           unset, the check is skipped.
   =================================================================== */

const DEFAULT_TO = "leotzy9898@gmail.com";
const DEFAULT_FROM = "Gerobak Betawi Website <onboarding@resend.dev>";

// Extremely small in-memory rate limiter. Serverless functions are
// ephemeral, so this only limits bursts hitting the *same* warm
// instance - it is a bonus speed bump on top of the honeypot field,
// not a substitute for it.
const hits = new Map();
function isRateLimited(key) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const max = 8;
  const record = hits.get(key) || { count: 0, start: now };
  if (now - record.start > windowMs) {
    record.count = 0;
    record.start = now;
  }
  record.count += 1;
  hits.set(key, record);
  return record.count > max;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  // Lightweight same-origin check. Skipped automatically if
  // ALLOWED_ORIGIN isn't configured, so the form keeps working on a
  // fresh Vercel *.vercel.app URL before a custom domain is attached.
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || req.headers.referer || "";
  if (allowedOrigin && origin && !origin.startsWith(allowedOrigin)) {
    return res.status(403).json({ success: false, message: "Forbidden." });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({
      success: false,
      message: "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit."
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: real visitors never fill this hidden field. Bots that
  // do get a fake "success" so they don't retry with a different
  // payload.
  if (body.website) {
    return res.status(200).json({ success: true, message: "Terima kasih! Pesan Anda telah terkirim." });
  }

  const firstName = (body.first_name || "").toString().trim().slice(0, 80);
  const lastName = (body.last_name || "").toString().trim().slice(0, 80);
  const email = (body.email || "").toString().trim().slice(0, 160);
  const phone = (body.phone || "").toString().trim().slice(0, 30);
  const outlet = (body.outlet || "").toString().trim().slice(0, 120);
  const message = (body.message || "").toString().trim().slice(0, 1000);
  const consent = !!body.consent;
  const lang = body.lang === "en" ? "en" : "id";

  const errors = [];
  if (!firstName) errors.push("first_name");
  if (!email || !EMAIL_RE.test(email)) errors.push("email");
  if (!message || message.length < 10) errors.push("message");
  if (!consent) errors.push("consent");

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: lang === "en"
        ? "Please check the fields marked in red."
        : "Mohon periksa kembali kolom yang ditandai merah.",
      fields: errors
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set in the Vercel project's environment variables.");
    return res.status(500).json({
      success: false,
      message: lang === "en"
        ? "Email is not configured yet on the server. Please try WhatsApp instead."
        : "Email belum dikonfigurasi di server. Silakan hubungi kami via WhatsApp."
    });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || DEFAULT_TO;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;
  const fullName = (firstName + " " + lastName).trim();

  const textLines = [
    `Nama: ${fullName}`,
    `Email: ${email}`,
    phone ? `Telepon: ${phone}` : null,
    outlet ? `Cabang Tujuan: ${outlet}` : null,
    "",
    "Pesan:",
    message
  ].filter((l) => l !== null);

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#271713;">
      <h2 style="color:#c97200;margin:0 0 12px;">Pesan Baru dari Website</h2>
      <p><strong>Nama:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${phone ? `<p><strong>Telepon:</strong> ${escapeHtml(phone)}</p>` : ""}
      ${outlet ? `<p><strong>Cabang Tujuan:</strong> ${escapeHtml(outlet)}</p>` : ""}
      <p><strong>Pesan:</strong></p>
      <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>`;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `Pesan Baru dari Website - ${fullName}`,
        text: textLines.join("\n"),
        html
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => "");
      console.error("Resend API error:", resendRes.status, errText);
      return res.status(502).json({
        success: false,
        message: lang === "en"
          ? "Sorry, something went wrong sending your message. Please try again or use WhatsApp."
          : "Maaf, terjadi kesalahan saat mengirim pesan. Silakan coba lagi atau hubungi kami via WhatsApp."
      });
    }

    return res.status(200).json({
      success: true,
      message: lang === "en" ? "Thank you! Your message has been sent." : "Terima kasih! Pesan Anda telah terkirim."
    });
  } catch (err) {
    console.error("Contact API error:", err);
    return res.status(500).json({
      success: false,
      message: lang === "en"
        ? "Sorry, something went wrong. Please try again or contact us via WhatsApp."
        : "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi kami via WhatsApp."
    });
  }
};
