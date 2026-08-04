# Gerobak Betawi: Website (Vercel Edition)

Static HTML/CSS/JS site (7 pages, bilingual Indonesian/English) plus a
single Vercel serverless function (`api/contact.js`) that sends the
contact form via [Resend](https://resend.com). No database, no build
step, no framework - deploys to Vercel's free (Hobby) plan as-is.

---

## 1. What changed from the original PHP package

The site used to ship with a PHP backend (`api/contact.php`), which
**cannot run on Vercel** (Vercel doesn't execute PHP). This version:

- Removes all PHP/Apache/Cloudflare-specific files (`api/*.php`,
  `.htaccess`, `nginx.conf.sample`, `_headers`, `_redirects`, `data/`).
- Adds `api/contact.js`, a Vercel Node.js serverless function that
  validates the form server-side and sends email via the Resend API.
- Adds `vercel.json` for security headers (the Vercel-native
  equivalent of the old `.htaccess`/`_headers`).
- Adds `package.json` (metadata only - there are no npm dependencies;
  `api/contact.js` uses the `fetch()` built into Node 18+).
- Adds `llms.txt` and FAQ structured data for AI-assistant/answer
  engine visibility (see section 4).

Everything else - all 7 pages, the design, the i18n toggle, the
WhatsApp integration, the YouTube video embed - is unchanged and
works exactly the same.

---

## 2. Step-by-step: GitHub -> Vercel deploy

### A. Push this code to your GitHub repo

```bash
cd gerobak-betawi-fixed
git init
git remote add origin https://github.com/leontzy9898-collab/gerobak-betawi.git
git add .
git commit -m "Vercel-ready: Resend contact form, nav/hero fixes, SEO/AEO"
git branch -M main
git push -u origin main
```

If the repo already has commits, skip `git init`/`remote add` and just
`git add . && git commit -m "..." && git push`.

### B. Get a Resend API key (2 minutes)

1. Go to [resend.com](https://resend.com) and sign up (free tier: 100
   emails/day, 3,000/month - plenty for a contact form).
2. In the Resend dashboard, go to **API Keys -> Create API Key**.
   Give it any name (e.g. "gerobak-betawi-website"), full access is
   fine. Copy the key (starts with `re_`) - you won't see it again.
3. **About the "from" address**: by default this code sends from
   `onboarding@resend.dev`, which works immediately with zero setup
   but looks like a Resend address to recipients. Once you own a
   domain (e.g. `gerobakbetawi.com`), go to **Domains -> Add Domain**
   in Resend, add the DNS records it gives you at your domain
   registrar, wait for verification, then set `CONTACT_FROM_EMAIL` to
   something like `Gerobak Betawi <noreply@gerobakbetawi.com>` (step D
   below). Until then, leave it on the default - it still delivers to
   your inbox correctly, it just shows `onboarding@resend.dev` as the
   sender.

### C. Import the project into Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub login is
   easiest).
2. **Add New... -> Project**, then **Import** your
   `leontzy9898-collab/gerobak-betawi` repo.
3. Framework Preset: leave it as **Other** (it's a static site, no
   build step needed). Build Command and Output Directory can stay
   blank/default.
4. **Before clicking Deploy**, expand **Environment Variables** and
   add the ones in the next section.

### D. Set environment variables in Vercel

In the Vercel project's **Settings -> Environment Variables** (or the
import screen), add:

| Name                 | Value                                                   | Required? |
|----------------------|----------------------------------------------------------|-----------|
| `RESEND_API_KEY`     | The `re_...` key from step B                             | **Yes** |
| `CONTACT_TO_EMAIL`   | `leotzy9898@gmail.com`                                    | No - already the default, but explicit is safer |
| `CONTACT_FROM_EMAIL` | `Gerobak Betawi Website <onboarding@resend.dev>`          | No - only change once you've verified your own domain in Resend |
| `ALLOWED_ORIGIN`     | `https://gerobakbetawi.com` (or your final domain)        | No - leave unset until you have a real domain, see note below |

Apply each to **Production, Preview, and Development** (the default
checkboxes).

> **About `ALLOWED_ORIGIN`**: this is an optional anti-abuse check.
> Leave it unset for your first deploy so the form works on your
> `*.vercel.app` URL. Once you've attached your real domain (step F),
> come back and set `ALLOWED_ORIGIN` to that domain, so the API
> rejects requests that don't come from your own site.

Click **Deploy**. First deploy takes under a minute.

### E. Test the live site

1. Open the `*.vercel.app` URL Vercel gives you.
2. Check pages load correctly on desktop and your phone.
3. Click a WhatsApp button - it should open WhatsApp with a pre-filled
   message.
4. Scroll to the video section - the YouTube embed should load and
   play.
5. Go to **Hubungi Kami** (Contact), fill out the form with a real
   email address, and submit. You should get the email at
   `leotzy9898@gmail.com` within a few seconds. You should **not** see
   the "opened locally" notice anywhere - that only ever appears if
   someone opens the HTML file directly from their computer
   (`file://...`), never on a real `https://` deploy.

If the email doesn't arrive: check **Vercel -> your project ->
Deployments -> (latest) -> Functions -> api/contact** logs for an
error, and check the Resend dashboard's **Logs** tab, which shows
every send attempt and why it failed if it did.

### F. Point your domain at it (optional, once you own one)

1. In Vercel: **Project -> Settings -> Domains -> Add**, enter your
   domain, follow the DNS instructions (usually one `A`/`CNAME`
   record at your registrar).
2. Once it's live on your domain, update:
   - `ALLOWED_ORIGIN` (env var, step D) to your real domain.
   - Every `https://www.gerobakbetawi.com` reference in `index.html`
     `<head>`, `sitemap.xml`, `robots.txt`, and the JSON-LD blocks in
     `kontak.html`/`lokasi.html`, if your final domain differs from
     that placeholder.
3. Vercel issues a free SSL certificate automatically - no extra setup
   needed for HTTPS.

That's the whole deployment. Every future `git push` to `main`
auto-redeploys.

---

## 3. What was fixed in this revision pass

- **Burger -> X animation**: the button now stays visible in the same
  spot and morphs smoothly into an X when the mobile menu opens,
  instead of being covered and swapped for a separate close button in
  a different position.
- **Gerobak cart animation** (mobile/tablet only): moved up, closer to
  the "6 Cabang / 100% Halal" stat text, no more dead gap between
  them. Desktop/laptop layout is untouched.
- **Header "Menu" dropdown font**: was rendering in a monospace label
  font that looked larger/heavier than the rest of the header links at
  the same font-size. Switched to match the header's regular font, and
  sized slightly smaller than the trigger link.
- **"Opened locally" notice**: unchanged logic, verified correct - it
  only ever shows on `file://`, never on a real deploy. No action was
  needed here beyond confirming it, since the contact form's new
  Vercel backend doesn't change that detection.
- **Contact form**: fully rebuilt for Vercel + Resend (see section 1).
- **Image reference bugs fixed while auditing**: two dish photos on
  the menu page pointed at wrong-case filenames
  (`nasi-kucing-jamur.png` vs the actual `NASI-KUCING-JAMUR.png`), one
  had a missing closing quote in its `src` attribute that broke the
  tag, and the homepage's Sate Kambing / Nasi Goreng Kambing photos
  pointed at filenames that don't exist in `images/`. All four now
  point at real files.
- **One missing translation fixed**: a "Nasi Kotak" package label used
  a translation key (`nkt.paket.f`) that was never defined (only
  `nkt.paket.p` was), so it rendered blank. Aligned to the existing
  key. **Worth double-checking**: the original package already flagged
  that this item's name/price ("Nasi Kotak F" on the physical menu
  board vs "Nasi Kotak P" in the code, same Rp 39.000 price point)
  should be confirmed with whoever manages pricing before launch -
  this pass didn't change which name is correct, only made sure the
  page renders the text either way.

---

## 4. SEO / GEO / AEO (AI-assistant visibility)

Already in place from the original package: per-page `<title>`/meta
description, canonical URLs, Open Graph tags, `Restaurant` JSON-LD
(address, hours, price range, rating) on the homepage, plus per-branch
`Restaurant` JSON-LD on `lokasi.html`, `sitemap.xml`, and `robots.txt`.

Added in this pass:

- **`llms.txt`** (site root): a plain-language, structured summary of
  what Gerobak Betawi sells, where every branch is, and why someone
  should choose it, written specifically for AI assistants and answer
  engines (ChatGPT, Claude, Perplexity, Google AI Overviews, etc.) to
  read and cite accurately. This is an emerging convention some AI
  crawlers already check, similar in spirit to `robots.txt`.
- **FAQPage JSON-LD + a visible FAQ section on the homepage**
  (`index.html`), covering exactly the kind of questions people
  actually ask ("is it halal", "what's the signature dish", "where are
  the branches", "do you cater office events"). Structured data alone
  without matching visible content can look manipulative to search
  engines, so the FAQ is a real, visible accordion on the page - the
  JSON-LD just makes it easier for a crawler to extract precisely.

**On "recommending Gerobak Betawi for best Betawi food" searches**: no
one - not a website owner, not this codebase - can force Google or an
AI assistant to recommend a specific business; ranking/citation
depends on the engine's own algorithm, competitors, reviews, and
real-world signals. What this pass does is remove every technical
reason those systems might overlook or misread the site: clean
structured data, an FAQ that answers the literal questions people ask,
and a plain-text summary an AI can quote from directly. Two things
outside this codebase's control also move the needle a lot in
practice: (1) a verified **Google Business Profile** for each of the 6
branches with photos and real reviews, and (2) getting the site
actually indexed - after deploying, submit `sitemap.xml` in [Google
Search Console](https://search.google.com/search-console).

---

## 5. Updating content later

- **Prices, dishes, photos**: replace the image file in `images/`
  (same filename) or edit the relevant `.html` file's text directly.
- **Phone numbers / WhatsApp / addresses**: edit `js/outlets-data.js`
  once - every page that lists branches reads from this single file.
- **Wording (Indonesian or English)**: every piece of translatable
  text lives in `js/i18n.js`, organized by page/section.
- **Contact form recipient**: change `CONTACT_TO_EMAIL` in Vercel's
  environment variables (no code change or redeploy needed - Vercel
  functions pick up new env vars on the next request after you save).

---

## 6. Local preview (optional)

Since there's no build step, you can still just open `index.html`
directly in a browser to preview layout/content. The contact form
won't be able to send real email this way (no serverless function
runs from a plain file) - it'll fall back to opening your email app
instead, and you'll see a small notice explaining that. This is
expected and disappears automatically once the site is live on
Vercel.

To preview the API function locally instead of just the static pages,
install the [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g
vercel`), run `vercel dev` from the project folder, and set
`RESEND_API_KEY` in a local `.env` file first.
