# SHUDHI HERBALS — Claude Code Build, Rebrand & Deploy Plan

> **What this file is:** the single instruction set for taking the existing *House of Veda* Shopify theme, (1) stripping every trace of House of Veda — brand, logos, products, contacts, and privacy‑critical tracking — and (2) rebuilding it as a premium **Shudhi Herbals** storefront, then committing it to the Shudhi GitHub repo and pushing it to the Shudhi Shopify store as an **unpublished** theme.
>
> **Base theme:** *Herbyo* by ThemeOcean · Shopify **Online Store 2.0** (JSON templates + Liquid) · no build step.
> **Hero product:** *Negativity Removal Cleansing Bar* — one product, `Pack Size` option → **Single Bar – 100g** and **Pack of 3**.
> **Target repo (currently blank):** `https://github.com/mohit9998A/Shudhi_Herbals-.git`
>
> This plan is the **brand + creative + git layer** on top of the line‑by‑line removal inventory in `SHUDHI-HERBALS-CLONE-GUIDE.md`. Keep both files in the repo root so any executing session has the file:line map (§6 of that guide) plus the brand system below.
>
> **Authority:** where this file and the clone guide disagree on *branding/creative* (e.g. colours), **this file wins** — the clone guide's "keep `#2D5A27` green" note is superseded by the Shudhi palette in §2.2. The clone guide remains the authority for the *file:line removal inventory*.

---

## 0. Quick start (read this first)

**Prerequisites on your machine (Mohit):**
1. The theme repo cloned locally, and you are running Claude Code **from inside that folder**.
2. **Shopify CLI** installed and logged into the **Shudhi Herbals** store → `shopify version` works.
3. **Git** installed and authenticated to GitHub (SSH key or PAT).
4. `SHUDHI-HERBALS-CLONE-GUIDE.md` present in the repo root (the file:line inventory).
5. Your **brand assets** ready to hand over / upload (logos, favicon, product + botanical photography — see §3).

> ⚠️ **Asset reality check:** the Shudhi logo/photography files are **not currently in the repo folder**. Claude Code cannot reference an image that isn't on disk or in Shopify Files. Until you add them, all logo/favicon/image references are set to clearly‑marked `[PLACEHOLDER]` with a TODO. Put the real files in `assets/` (to self‑host) or upload them to **Shopify Admin → Content → Files** and then point the settings at them.

**How to run it:**
1. Open a fresh Claude Code session in the theme folder.
2. Paste the **Master Prompt** (§11). Keep this file and `SHUDHI-HERBALS-CLONE-GUIDE.md` open in the same session.
3. Review the diff → connect the repo (§9) → push to Shopify unpublished (§10).
4. Finish the **store‑side manual steps** (§12) that code can't do, then QA (§13).

**The golden rule:** *Keep every feature and the OS 2.0 architecture. Replace the brand, the tracking, and the product presence. You have full creative freedom on styling, copy, imagery, layout polish, and animation — but never delete a template/section/snippet or break a feature.*

---

## 1. Objective

Reuse the House of Veda theme's **structure and feature set** as the engine for a new, standalone brand: **Shudhi Herbals** — a premium D2C herbal wellness brand. The finished storefront must:

- Contain **zero** House of Veda strings, logos, images, domains, contacts, testimonials, or tracking IDs.
- Present as a **luxury, editorial, calming wellness brand** (think Aesop / Le Labo / Rituals), not a mass‑market herbal‑soap shop.
- Sell **one** hero product with two variants.
- Live in **your** GitHub repo and push cleanly to **your** Shopify store.

---

## 2. Shudhi Herbals brand kit — *source of truth*

Bake this into the theme. Where the theme's design tokens conflict with these, **these win**.

### 2.1 Positioning & voice
- **Category:** premium herbal wellness / lifestyle (not "another handmade soap").
- **Core idea:** *"Purify your skin. Cleanse your aura."*
- **Seal / secondary line:** *"Purify Your Presence."*
- **USP:** Spiritual + Ayurvedic + handmade, in small batches.
- **Personality:** elegant · minimal · premium · calming · grounded · authentic · timeless · modern · natural. **Never** loud, overly spiritual, overly medicinal, or cluttered.
- **Values (use as a section):** **Purity · Balance · Nature.**
- **Trust badges (icon row):** **Natural · Herbal · Handmade · Pure.**
- **Claim discipline:** position as a premium wellness *ritual*. Do **not** write medical or supernatural claims. Avoid "cures / removes disease / guarantees." "Aura cleansing / grounding / refreshing ritual" framing is fine.

### 2.2 Colour palette
Confirmed brand swatches (from the brand deck + logo files). Sample the sage exactly from the supplied logo PNGs if you want pixel‑perfect.

| Role | Name | Hex | Primary use |
|---|---|---|---|
| Primary | Deep Forest Green | `#335030` | Logo, headings, links, primary CTA, footer, checkout accent/button |
| Neutral / background | Warm Ivory | `#FBF0DC` | Page + section backgrounds, cards, light surfaces |
| Secondary | Earth Brown | `#785C3C` | The logo "purity" dot, dividers, seal, warm accents |
| Accent | Soft Sage Green | `#9CAF88` *(sample exact from assets)* | Secondary buttons, tags, subtle fills, hovers |
| Text | Deep Charcoal‑Green | `#1F2A24` | Body copy |
| Border / hairline | Soft Sand | `#E8E1D0` | Borders, inputs, dividers |
| Optional metallic | Champagne Gold | `#C6A96B` *(use sparingly)* | Hairline accents / foil‑style detail on dark green, seal outline |

> The brand deck names "Champagne Gold" as the secondary while the printed swatches show Earth Brown `#785C3C`. Treat **brown as the working secondary** and gold as an **optional premium accent** used sparingly (thin dividers, seal outline, small caps flourishes on dark backgrounds).

**Ignore** any Bootstrap vendor hexes in the theme (`#007bff`, `#28a745`, etc.) — those are library defaults, not brand colours.

#### 2.2.1 Contrast rules (WCAG AA — non‑negotiable)
The palette mixes dark and light tones; label colour must be chosen per background or text fails AA:

| Surface | Use this text | Why |
|---|---|---|
| Deep Forest Green `#335030` | **White** `#FFFFFF` (~8.7:1) | Passes AA + AAA — safe for primary buttons/footer |
| Earth Brown `#785C3C` | **White** (large text ✓; verify ~4.5:1 for body) | Borderline for small text — prefer for headings/large UI |
| Soft Sage `#9CAF88` | **Dark** `#1F2A24` — never white | Sage is light; white‑on‑sage fails AA badly |
| Champagne Gold `#C6A96B` | **Dark** `#1F2A24` — never white | Gold is light; use as accent/hairline, not a light‑labelled button |
| Warm Ivory `#FBF0DC` | **Charcoal‑green** `#1F2A24` | High contrast, comfortable body reading |

Rule of thumb: **dark backgrounds (green/brown) → white text; light backgrounds (ivory/sage/gold) → charcoal‑green text.** Keep focus states visible and image `alt` text intact through every restyle.

### 2.3 Typography
- **Primary (display / headings):** **Guffie** — an elegant high‑contrast serif.
- **Secondary (body / UI):** **Brokman** — a clean geometric sans.
- **Reality:** Guffie & Brokman are **not** free web fonts (not on Google Fonts) and are **not currently in `assets/`**. So:
  - **Working default now → the fallback pairing (visually very close), loadable immediately from Google Fonts:**
    - Headings → **Cormorant Garamond** (matches the spaced, refined serif wordmark).
    - Body/UI → **Jost** (geometric sans; pairs cleanly with Cormorant). *(Montserrat is an acceptable alternative.)*
  - **To upgrade to real Guffie/Brokman later:** drop the licensed `.woff2`/`.woff` files into `assets/`, then activate the `@font-face` scaffold left (commented) in `assets/hov-typography.css` and remove the Google‑Fonts fallback link. Confirm the licence permits web/`@font-face` use.
- **Type feel:** wide letter‑spacing on the wordmark and section headings (the logo sets `SHUDHI` in generously tracked caps). Prices/counts forced to `lining-nums tabular-nums`.

### 2.4 Logo & mark
The mark is a **seated meditating human** rendered in line: a **brown dot** (head) above a **forest‑green stylised lotus / crossed‑legs** curve, with the **SHUDHI / HERBALS** wordmark beneath.

- **Logo meaning (great "About the mark" content):** the figure = the human; **dot = Purity**, **upper curve = Balance**, **base = Nature**.
- **Variants to upload** to Shopify **Files** (and/or place in `assets/`):
  - Full colour on ivory (primary).
  - Reversed on **brown** and on **sage** backgrounds.
  - **Mark only** (for favicon / app icon / seal).
  - **Wordmark only** (for the tote / minimal placements).
  - **TM** lockup version.
- **Placement rules:**
  - **Header:** full‑colour lockup (or green mono) on transparent/ivory.
  - **Favicon:** mark‑only.
  - **Footer:** ivory/mono lockup on the deep‑green footer.
  - **Packaging / seal motif:** circular "SHUDHI HERBALS · PURIFY YOUR PRESENCE" stamp.

### 2.5 Imagery direction
Cinematic, editorial, botanical. Textures: **stone, marble, wood, linen, herbs, water, morning light.** Generous negative space. **Never** use generic stock photos with smiling models.

---

## 3. Assets you (Mohit) must provide / upload

Claude Code cannot invent CDN images or reference files that aren't on disk. These are set as `[PLACEHOLDER]` in code with a clear TODO; upload the real files to **Shopify Admin → Content → Files** (and/or place them in `assets/`), then point the settings at them.

- **Logos:** the Shudhi logo PNGs (colour, TM, mark‑only, wordmark‑only, reversed variants).
- **Favicon:** the mark‑only version exported at favicon sizes.
- **Product photography:** the Negativity Removal Cleansing Bar (single bar + pack of 3), on stone/linen with morning light.
- **Hero / lifestyle / botanical imagery:** for the homepage hero, ritual section, and About.
- **Optional:** packaging / seal renders, ingredient/herb shots; the licensed **Guffie/Brokman** `.woff2` files if you want to self‑host the true brand fonts.

*(Expected filenames from the brand deck: `SHUDHI_HERBALS_LOGO_COLOR-01.png`, `SHUDHI_HERBALS_LOGO_TM_COLOR-01.jpeg`, `shudhi_herbal.png`, plus colour/mark/wordmark variants. None are in the repo yet — add them before the store goes live.)*

---

## 4. PHASE 1 — Analyse the base theme

Build a fresh map before touching anything (line numbers in the clone guide may have shifted). Deliverable: **`THEME-ANALYSIS.md`** in the repo root, covering:

1. **Structure:** counts and roles of `layout/`, `templates/` (JSON + legacy `.liquid` + `customers/`), `sections/`, `snippets/`, `blocks/`, `assets/`, `config/`, `locales/`.
2. **Global render chain** in `layout/theme.liquid` (topbar → header → content → footer → overlays → chatbot).
3. **Feature inventory** (preserve all): AJAX/drawer cart, mini‑cart, cart recommendations, wishlist, quick view, variant swatches, related/complementary products, collection filtering/sorting/pagination/infinity‑scroll, mega‑menu + mobile menu, search overlay, rule‑based chatbot, WhatsApp shortcut, newsletter/cookie/login/recently‑viewed popups, multi‑currency + language (Weglot), blog/article, lookbook, Instagram grids, testimonials slider, the **`fresh-0-*` metafield‑driven PDP builder**, Slick/Fancybox/Masonry, lazy loading, SEO metadata + structured data.
4. **Design tokens today:** the `:root` blocks in `assets/houseofveda-modern.css` and `assets/hov-typography.css`, and the mirrors in `config/settings_data.json` (`color_main2`, `checkout_accent_color`, `checkout_button_color`, logo/favicon settings).
5. **A grep‑based inventory** of every House‑of‑Veda footprint (brand strings, domains, handles, tracking IDs) with file:line — cross‑checked against `SHUDHI-HERBALS-CLONE-GUIDE.md` §6.

---

## 5. PHASE 2 — Strip House of Veda (privacy‑critical)

Work top to bottom using the clone guide §6 as the file:line map. If a line has moved, **search the quoted string**.

### 5.1 Tracking / verification / account IDs — remove or replace (do this first)
These send data to House of Veda's accounts and **must not survive** in Shudhi's store. In `layout/theme.liquid` unless noted:

- `google-site-verification` metas (2×) → remove.
- **Live GTM `GTM-TJ7PL5D9`** (plus commented `GTM-NL4VDNLZ`, `GTM-THQK6ZTX`) and the GTM `<noscript>` → remove.
- **Meta Pixel `224366287383030`** (init + noscript) → remove.
- **Hardcoded Purchase event containing a REAL hashed customer email → DELETE outright.**
- **Google Ads `AW-10887516565`** → remove.
- `facebook-domain-verification` meta → remove.
- `snippets/popper_app.liquid` shop `houseofveda-pnb.myshopify.com` → neutralise.
- `snippets/avada-seo-redirect.liquid` shop domain → neutralise.
- `snippets/smile-initializer.liquid` (HoV Smile.io account) → neutralise.
- `assets/hov-auth.js` redirect `houseofveda.com/account` → replace with placeholder.

Leave clearly‑labelled `[PLACEHOLDER — Shudhi GTM/Pixel/Ads]` slots so Shudhi's own IDs (if any) can be dropped in later.

### 5.2 Brand strings
Replace `House of Veda` / `HouseOfVeda` / `HOUSE OF VEDA` → **`Shudhi Herbals`** (match each occurrence's casing), including **alt text and aria‑labels**. Files per guide §6‑A: `layout/theme.liquid`, `sections/hov-search-overlay.liquid`, `snippets/hov-sidebar.liquid`, `snippets/collection-sidebar.liquid`, `snippets/promo-topbar.liquid`, `snippets/tab-product-details.liquid` (the vendor label), `sections/why-choose-us.liquid`, `sections/hov-testimonials.liquid`, `sections/HOV-what-makes.liquid`, `sections/header.liquid` (the "Ludhiana" location string too).

### 5.3 Contact / social / policy / domains
Replace with Shudhi values or `[PLACEHOLDER]` (guide §6‑D): emails, phone, postal address, WhatsApp number, social handles (`houseofvedaofficial`, `x.com/houseofveda_`), policy links (`houseofveda.com/policies/*`), and the About‑page Instagram user id.

### 5.4 Product / collection references
Repoint to the single product handle **`negativity-removal-cleansing-bar`** (or collection `all` / a new `cleansing-bars`) — guide §6‑C: `config/settings_data.json` (`best_product_collection`, `relate_product_collection`, `url_coll_1`), `templates/index.json` hero + featured handles, `templates/collection.json` brand tiles.

### 5.5 Marketing copy / testimonials / chatbot
Rewrite for Shudhi's single product (guide §6‑F): homepage hero + belief/journey banners, named testimonials, About‑Us story + values, promo bar, popups/coupons, and the **entire chatbot Q&A dataset**. **Do not invent** fake reviews, ratings, coupons, or claims — use obvious `[PLACEHOLDER]` markers for anything factual (price, ingredients, process steps, contact).

### 5.6 Locale / docs
`locales/en.default.json` line 32 (the "powered by" override), and brand refs in `README.md` / `Claude.MD`.

### 5.7 Keep the filenames
Leave `hov-*` / `HOV-*` **filenames** as‑is (`houseofveda-modern.css`, `hov-typography.css`, `hov-chatbot.liquid`, etc.). They're internal, invisible to shoppers, and wired by name across the theme; renaming risks breakage. (Rename later only with coordinated reference updates.)

---

## 6. PHASE 3 — Apply the Shudhi design system

1. **Colours:** rewrite the `:root` tokens in **`assets/houseofveda-modern.css`** (lines ~18–30) to the §2.2 palette. Update the legacy mirrors in **`config/settings_data.json`** (`color_main2`, `checkout_accent_color`, `checkout_button_color`) and the product‑label / cart‑badge colours to brand tones. Apply the §2.2.1 contrast rules (dark bg → white text; light bg → charcoal text).
2. **Fonts:** in **`assets/hov-typography.css`** (`:root`, lines ~12–17) set the families to the Cormorant Garamond + Jost fallback (or self‑hosted Guffie/Brokman via `@font-face` if licensed and on disk); update the Google Fonts link in **`snippets/engo-header-fonts.liquid`** (line ~50) to match. Add wide heading letter‑spacing. Leave a commented `@font-face` scaffold for future Guffie/Brokman.
3. **Logo / favicon:** set the logo + favicon settings in `config/settings_data.json` to `[PLACEHOLDER]` with a TODO listing exactly which files to upload to Files. Keep the desktop/mobile logo max‑width sensible for the wordmark. Do **not** fabricate CDN paths.
4. **Checkout:** background `#FFFFFF`, accent/button `#335030`.

---

## 7. PHASE 4 — Premium creative enhancements (creative freedom)

**Elevate the design** to match the luxury‑editorial mood — *within* the constraint that you **preserve all existing features and the OS 2.0 architecture, delete nothing, and break nothing.** Restyle freely; re‑content freely; add tasteful sections/blocks only if they sit alongside (not replace) existing ones, using the theme's existing section‑schema pattern.

Suggested moves (adapt with taste — guidance, not a spec):

- **Hero:** full‑width, generous whitespace, soft botanical/leaf backdrop, the tagline *"Purify your skin. Cleanse your aura."*, one calm CTA. Large product photography over busy carousels.
- **The Ritual:** an editorial section describing the mindful **6–7 step small‑batch process** (`[PLACEHOLDER]` for exact steps) — calm, grounding, restorative.
- **About the mark:** visualise the logo meaning — **Purity (dot) · Balance (curve) · Nature (base)** — with the "Human + Nature" annotation.
- **Ingredients / herbs:** Ayurvedic herbs + essential oils, presented like a fine‑fragrance note list (`[PLACEHOLDER]` for specifics). No medical claims.
- **Values band:** **Purity · Balance · Nature.**
- **Trust badges row:** **Natural · Herbal · Handmade · Pure** (line icons).
- **Story:** the four‑generation / ~100‑year family herbal heritage, reinterpreted for modern wellness.
- **Gifting / seal motif:** the circular "PURIFY YOUR PRESENCE" stamp; premium unboxing / gifting language.
- **Motion:** subtle fade/slide on scroll, soft transitions (reuse the theme's existing Slick + animate.css rather than adding heavy new libraries). Slow‑luxury pacing, no clutter.
- **Type & spacing:** refined modular scale, roomy line‑height, wide tracking on headings; big imagery, lots of ivory space.

**Guardrails for this phase:** no fake reviews/testimonials/ratings; no medical or supernatural claims; don't remove any page, template, section, or feature; keep performance and **accessibility** intact (keyboard nav, visible focus states, alt text, AA contrast per §2.2.1).

---

## 8. PHASE 5 — Product setup (theme side)

The product itself is created in **Shopify Admin** (see §12). In the theme:

- Repoint product/collection references (§5.4) to `negativity-removal-cleansing-bar`.
- Update the product **JSON‑LD** in `layout/theme.liquid`: set `brand.name` = `"Shudhi Herbals"` and make the SKU dynamic (`{{ product.selected_or_first_available_variant.sku }}`) — remove any hardcoded `"sku"`.
- Model = **one product, `Pack Size` option** → variants **Single Bar – 100g** and **Pack of 3**. One clean PDP, one review pool.

---

## 9. PHASE 6 — Connect the GitHub repo (blank repo, fresh history)

The target repo is empty and public, and the current repo's git history contains House‑of‑Veda code, live tracking IDs, and a **real hashed customer email**. Those must never reach a public Shudhi repo — so seed a **fresh history**.

**First, add a Shopify‑appropriate `.gitignore`:**

```gitignore
# Shopify CLI
.shopify/
*.log

# OS / editor
.DS_Store
Thumbs.db

# Node (only if any tooling was added)
node_modules/

# Secrets / env
.env
.env.*
```

**Then reset history and wire the remote (recommended — clean history):**

```bash
# Start a brand-new history so nothing House-of-Veda survives in the public repo:
rm -rf .git
git init
git branch -M main

# Point origin at the (blank) Shudhi repo:
git remote add origin https://github.com/mohit9998A/Shudhi_Herbals-.git

# Stage, commit, push:
git add .
git commit -m "Shudhi Herbals: initial theme (rebranded from base, HoV removed)"
git push -u origin main
```

> **Sanity check before committing:** run the brand‑scrub greps in §13 so no House‑of‑Veda string or tracking ID is committed to your public repo.
>
> *(If you specifically need to preserve provenance and accept that removed HoV data stays recoverable in history, you can instead `git remote set-url origin <shudhi repo>` and keep the existing commits — not recommended for a public repo.)*

---

## 10. PHASE 7 — Deploy to Shopify (CLI)

```bash
# Confirm you're logged into the Shudhi store
shopify version

# Push as a NEW, UNPUBLISHED theme (does not touch the live store)
shopify theme push --unpublished --store <shudhi-store>.myshopify.com
#   ⚠ Do NOT add --strict  (Theme Check has a legacy error baseline that will block the push)
#   ⚠ Do NOT use --publish / --allow-live until QA passes
```

Open the preview + Theme Editor links the CLI prints, QA against §13, then **publish from Admin → Online Store → Themes → Publish** when ready.

**ZIP fallback:** `shopify theme package` → Admin → Online Store → Themes → Add theme → Upload zip.

---

## 11. ▶️ MASTER PROMPT — paste into Claude Code

> Paste everything in the box into a **fresh Claude Code session** opened inside the theme folder, with **Shopify CLI logged into the Shudhi store** and **git authenticated to GitHub**. Keep this file and `SHUDHI-HERBALS-CLONE-GUIDE.md` open in the session.

```text
You are a senior Shopify theme developer. This repo is a customized "Herbyo"
(ThemeOcean) Online Store 2.0 theme currently branded for "House of Veda". I am
reusing it as the structural + feature base for a NEW premium D2C wellness brand,
"Shudhi Herbals". Their only launch product is a "Negativity Removal Cleansing Bar",
sold as ONE product with a "Pack Size" option (variants: "Single Bar - 100g" and
"Pack of 3").

TWO REFERENCE FILES ARE IN THE REPO ROOT — use them as the source of truth:
- SHUDHI-HERBALS-CLONE-GUIDE.md  → the line-by-line House-of-Veda removal inventory (§6).
- SHUDHI-HERBALS-CLAUDE-CODE-PLAN.md → the Shudhi brand kit, creative direction, and git/deploy steps.

GOAL: Remove every trace of House of Veda, rebuild as Shudhi Herbals with a premium,
editorial, calming aesthetic (Aesop / Le Labo / Rituals feel), connect the repo to
https://github.com/mohit9998A/Shudhi_Herbals-.git , and push the theme to the Shudhi
store as an UNPUBLISHED theme. PRESERVE every feature and the OS 2.0 architecture —
do NOT delete or rename any template/section/snippet/asset and do NOT break anything.
You DO have creative freedom on styling, copy, imagery, layout polish, and animation.

DO THIS IN ORDER:

PHASE 1 — ANALYSE. Produce THEME-ANALYSIS.md: structure + counts, the global render
chain in layout/theme.liquid, a full feature inventory (preserve all), current design
tokens (assets/houseofveda-modern.css, assets/hov-typography.css, and the mirrors in
config/settings_data.json), and a grep-based footprint of every House-of-Veda string,
domain, product/collection handle, and tracking ID with file:line. Cross-check against
the clone guide §6. If a line has shifted, search the quoted string.

PHASE 2 — STRIP HOUSE OF VEDA (privacy-critical first). In layout/theme.liquid remove:
the two google-site-verification metas; the live GTM container GTM-TJ7PL5D9 (and the
commented GTM-NL4VDNLZ / GTM-THQK6ZTX) plus the GTM noscript; the Meta Pixel
224366287383030 (init + noscript); the Google Ads tag AW-10887516565; the
facebook-domain-verification meta; and DELETE the hardcoded Purchase event that
contains a REAL hashed customer email. Neutralise the House-of-Veda shop domain /
account in snippets/popper_app.liquid, snippets/avada-seo-redirect.liquid,
snippets/smile-initializer.liquid, and assets/hov-auth.js. Leave clearly-labelled
[PLACEHOLDER] slots for Shudhi's own IDs. Then replace all brand strings
"House of Veda" / "HouseOfVeda" / "HOUSE OF VEDA" with "Shudhi Herbals" (match each
occurrence's casing, incl. alt text + aria-labels) across the files in guide §6-A, and
the "Ludhiana" string in sections/header.liquid. Replace contacts / social / policy /
domains (guide §6-D) with [PLACEHOLDER]. Repoint product/collection references
(guide §6-C) to handle "negativity-removal-cleansing-bar" (or collection "all").
Rewrite testimonials, the entire chatbot Q&A dataset, About-Us story/values, hero copy,
promo bar, and popups into Shudhi single-product copy — using obvious [PLACEHOLDER]
markers for anything factual. KEEP all hov-*/HOV-* FILENAMES as-is.

PHASE 3 — APPLY SHUDHI BRAND SYSTEM (see PLAN.md §2 + §6):
- Colours in assets/houseofveda-modern.css :root →
  Deep Forest Green #335030 (primary), Warm Ivory #FBF0DC (background),
  Earth Brown #785C3C (secondary), Soft Sage Green ~#9CAF88 (accent),
  text #1F2A24, border #E8E1D0; champagne gold #C6A96B only as a sparing accent.
  Update config/settings_data.json mirrors color_main2, checkout_accent_color,
  checkout_button_color, and label/cart-badge colours. Checkout button #335030.
  Apply the contrast rules: dark bg (green/brown) -> white text; light bg
  (ivory/sage/gold) -> charcoal-green #1F2A24 text. Never white-on-sage/gold.
- Fonts in assets/hov-typography.css → Cormorant Garamond (display) + Jost (body)
  via the Google Fonts link in snippets/engo-header-fonts.liquid; leave a commented
  @font-face scaffold for self-hosted Guffie/Brokman to swap in later. Wide
  letter-spacing on the wordmark + section headings.
- Logo + favicon settings in config/settings_data.json → [PLACEHOLDER] with a TODO
  listing exactly which image files I must upload to Shopify Files. Do NOT fabricate CDN paths.

PHASE 4 — PREMIUM CREATIVE ENHANCEMENTS (you have latitude here; PLAN.md §7):
Elevate to a luxury-editorial wellness feel — generous ivory whitespace, large product
photography, refined type scale, subtle fade/slide-on-scroll using the theme's existing
Slick/animate libraries (don't add heavy new deps), soft transitions, slow-luxury pacing.
Add tasteful sections ALONGSIDE existing ones (never replacing them): a "Ritual" section
(mindful 6-7 step small-batch process, [PLACEHOLDER] steps); an "About the mark" section
(Purity=dot, Balance=curve, Nature=base); an Ingredients/herbs section (Ayurvedic herbs +
essential oils, [PLACEHOLDER]); a Values band (Purity / Balance / Nature); a trust-badge
row (Natural / Herbal / Handmade / Pure); the brand story (four-generation herbal heritage);
and the "Purify Your Presence" seal motif. NO fake reviews/ratings, NO medical or
supernatural claims. Keep accessibility (keyboard nav, focus states, alt text, AA contrast).

PHASE 5 — PRODUCT WIRING. Repoint theme product/collection refs to
"negativity-removal-cleansing-bar". In layout/theme.liquid set the product JSON-LD
brand.name = "Shudhi Herbals" and make sku dynamic
({{ product.selected_or_first_available_variant.sku }}); remove any hardcoded sku.

PHASE 6 — GIT (fresh history). Add the .gitignore from PLAN.md §9. Then:
rm -rf .git && git init && git branch -M main, set origin to
https://github.com/mohit9998A/Shudhi_Herbals-.git , and commit. Before committing,
run the brand-scrub greps below and confirm nothing remains except intended [PLACEHOLDER]s.
(Only push once I've reviewed.)

PHASE 7 — DEPLOY. Run:
  shopify theme push --unpublished --store <shudhi-store>.myshopify.com
(NO --strict — Theme Check has a legacy error baseline; NO --publish/--allow-live.)

GUARDRAILS — do NOT:
- delete or rename any section, snippet, template, or asset file;
- remove any page or feature;
- invent fake reviews, testimonials, ratings, prices, health/spiritual claims, or coupons;
- reuse any House-of-Veda tracking ID, domain, or account;
- reference image/font files that are not on disk (use [PLACEHOLDER] + TODO instead);
- run theme push with --publish / --allow-live.

WHEN DONE:
- run `git status` and `git diff` and summarise the changes;
- print the store-side manual checklist (menus, product+variants, collections, images,
  metafields, template assignment, apps, favicon, currency, tracking) from PLAN.md §12;
- run the brand-scrub greps and report anything left except intended [PLACEHOLDER]s:
    grep -ri "house of veda" .
    grep -ri "houseofveda" .
    grep -rEi "GTM-TJ7PL5D9|224366287383030|AW-10887516565" .
```

---

## 12. Post‑push manual checklist (store‑side — code can't do these)

- [ ] **Menus:** recreate in Admin → Navigation (`main-menu`, `header`, `footer`, `info`, `shop`, `about`, `category`, `category-collection`, `footer-v4`).
- [ ] **Product:** create *Negativity Removal Cleansing Bar* with the `Pack Size` option + two variants (Single 100g / Pack of 3) — price, SKU, weight, inventory each.
- [ ] **Collections:** create/assign the collection(s) the theme references (`all` or `cleansing-bars`).
- [ ] **Images:** upload the Shudhi logo (all variants), favicon (mark‑only), hero + product + botanical photography to **Files**, then replace the `[PLACEHOLDER]` `shopify://…` references.
- [ ] **Metafields:** recreate the `custom.*` product metafield definitions used by `product.latest-product` + `fresh-0-*`, **or** assign the product to the simpler standard `product.json` template until metafields are set up.
- [ ] **Templates:** assign alternate templates to their pages (About, Contact, FAQ, Track‑order, Wishlist).
- [ ] **Apps:** install/configure or remove the app embeds (Avada SEO/Boost Sales, Smile.io, Weglot, currency converter, popper). Snippets referencing an uninstalled app simply do nothing.
- [ ] **Tracking:** add Shudhi's own GTM / Meta Pixel / Google Ads if wanted (the `[PLACEHOLDER]` slots).
- [ ] **Favicon & branding:** set favicon; confirm all logos render on ivory / green / brown backgrounds.
- [ ] **Markets/currency:** confirm INR + any language/country selectors.

---

## 13. QA / verification checklist

Walk the storefront on **desktop + mobile**:

1. Home — hero, featured product/collections, ritual + values + badges, story, newsletter.
2. Header, mega‑menu, mobile menu, search overlay, footer.
3. Product — variants (Single 100g / Pack of 3), swatches, media, quantity, add‑to‑cart, quick view.
4. Cart drawer → cart page → checkout handoff.
5. Collection — filters, sorting, pagination, empty state.
6. Customer — login, register, account, addresses, order.
7. Search, blog, article, contact, FAQ, custom pages.
8. Currency / language switching.
9. Newsletter, cookie notice, chatbot, WhatsApp, popups.
10. Analytics/pixels/SEO/canonical/structured data → **Shudhi's or removed, never House of Veda's.**
11. Performance, accessibility (keyboard nav, focus, alt text, AA contrast per §2.2.1), zero console errors.

**Final brand scrub (from repo root — should return only intended `[PLACEHOLDER]`s):**

```bash
grep -ri "house of veda" .
grep -ri "houseofveda" .
grep -rEi "GTM-TJ7PL5D9|224366287383030|AW-10887516565" .
grep -riE "organic-moringa|himalayan-shilajit|best-seller" .   # old product/collection handles
```

---

## 14. Guardrails summary

**Do:** preserve every feature + OS 2.0 architecture · remove all HoV branding/tracking/contacts/products · apply the Shudhi palette + fonts + logo · elevate the design tastefully · use `[PLACEHOLDER]` for anything factual or any not‑yet‑uploaded asset · push unpublished · commit clean (no HoV strings/IDs in your public repo).

**Don't:** delete/rename templates, sections, snippets, or assets · remove pages or features · invent reviews, ratings, prices, medical/spiritual claims, or coupons · reuse any HoV tracking ID, domain, or account · reference files not on disk · publish to live before QA.

---

## 15. Freelancer notes (housekeeping)

- **Theme licence:** *Herbyo* by ThemeOcean is a commercial theme; theme licences are typically **per store**. Confirm the Shudhi store has its own valid licence before going live.
- **Privacy:** the base carries live tracking IDs and a hardcoded **real hashed customer email** — removing these (Phase 2) isn't optional, it's the responsible baseline, and a fresh git history (§9) keeps them out of your public repo.
- **Copy:** rewrite House of Veda's marketing/testimonial/chatbot copy in Shudhi's own words rather than reusing it verbatim.
- **Claims:** keep the wellness‑ritual framing; avoid medical or supernatural promises.
- **Fonts:** confirm Guffie/Brokman web‑font licensing before self‑hosting; until then the Cormorant Garamond + Jost pairing ships.

---

*Prepared as the Shudhi Herbals brand + build + git layer over the theme clone guide. Brand: Deep Forest Green `#335030` · Warm Ivory `#FBF0DC` · Earth Brown `#785C3C` · Soft Sage `#9CAF88`; display serif (Guffie / Cormorant Garamond) + geometric sans (Brokman / Jost). Hero: Negativity Removal Cleansing Bar — Single Bar 100g & Pack of 3. Target repo: https://github.com/mohit9998A/Shudhi_Herbals-.git*
