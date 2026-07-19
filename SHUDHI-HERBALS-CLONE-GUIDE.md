# Shudhi Herbals — Theme Clone & Rebrand Guide

> **Purpose:** Reuse the existing **House of Veda** Shopify theme for a new client, **Shudhi Herbals**, by removing every trace of House of Veda (brand, logos, products, contact details, tracking) and rebranding to Shudhi Herbals — **without changing the theme's structure, layout, or features**.
>
> **Launch SKU:** *Negativity Removal Cleansing Bar* — sold as **Single Bar – 100g** and **Pack of 3**.
>
> This file is **self-contained**. You can hand it to a fresh Claude Code chat that has no other context and it has everything needed to execute the rebrand and push the theme.

---

## 1. Overview & how to use this guide

**What this is:** a complete map of the theme (structure, colors, fonts, features), a line-by-line inventory of everything that says "House of Veda," a rebrand plan, and a ready-to-paste prompt (§9) that drives the whole job.

**How to run it:**
1. Open a **fresh Claude Code session** inside the cloned theme repo.
2. Make sure **Shopify CLI is installed and logged into the Shudhi Herbals store** (`shopify version` should work).
3. Paste the guide + the **§9 execution prompt**.
4. Review the diff, push the theme **unpublished**, then finish the **store-side manual steps** (§11) that code alone can't do.

**The golden rule:** *Clone the structure. Replace the brand and the product presence. Keep every page.* Do not delete sections/templates, do not rename files, do not invent fake reviews or health claims.

**What travels with the theme vs. what does NOT:**

| Travels with `theme push` (in this repo) | Does NOT travel — must be recreated in the Shudhi store |
| --- | --- |
| Liquid layout, sections, snippets, blocks | Products, variants, prices, SKUs |
| JSON templates + `settings_data.json` | Collections & their handles |
| CSS/JS/font assets in `assets/` | Navigation **menus** (live in Admin) |
| Locale files | **Images** on Shopify CDN (`shopify://shop_images/…`, `shopify://files/…`) |
| Theme settings values | **Product metafields** (`custom.*`) used by the custom PDP |
| | **Apps / app embeds** (Avada, Smile.io, Weglot, currency, etc.) |

---

## 2. Theme identity & tech stack

| Property | Value |
| --- | --- |
| Base theme | **Herbyo** by **ThemeOcean** |
| Version | `1.0.0` (`config/settings_schema.json` → `theme_info`) |
| Architecture | Shopify **Online Store 2.0** (JSON templates + Liquid) |
| Build step | **None** — no `package.json`, no `shopify.theme.toml`, no npm/Vite/Webpack |
| Repo size | ~402 files |
| Cart | Slide-out **drawer** (`ajax_cart_method: drawer`) |
| Currency | **INR** (`default_currency: IND`, multi-currency enabled) |
| Vendored libraries | Bootstrap, jQuery, Slick carousel, Fancybox, Lazysizes, Masonry, Font Awesome |
| Theme Check | **Currently fails** on a legacy error baseline → push **without** `--strict` |

**File counts:** 116 sections · 136 snippets · 45 templates · 124 assets · 7 locales · 1 theme block.

---

## 3. Full site structure map

```
House-of-Veda/
├── layout/          theme.liquid  (global HTML shell: head, tracking, header, footer, chatbot)
├── templates/       45 files  (JSON OS-2.0 templates + legacy .liquid + customers/)
├── sections/        116 files (theme chrome, custom HOV sections, versioned Herbyo builders)
├── snippets/        136 files (header/footer variants, product cards, cart, custom hov-*, app snippets)
├── blocks/          1 file    (ai_gen_block_c7cab55.liquid — OS 2.0 theme block)
├── assets/          124 files (CSS, JS, fonts, images/icons)
├── config/          settings_schema.json (definitions) + settings_data.json (saved values)
├── locales/         7 files   (en.default, de, es, fr, pt-BR, pt-PT, vi)
├── README.md        Theme docs (deploy, integrations, risks) — HoV-branded
└── Claude.MD        LLM behavioral guidelines
```

**Global render chain** (in `layout/theme.liquid`):
`hov-sidebar` → `promo-topbar` → `{% section 'header' %}` → **page content** → `{% section 'footer' %}` → `{% section 'latest-footer' %}` → search / mini-cart / mobile-menu → `{% section 'hov-search-overlay' %}` → `hov-chatbot`.

### Templates (pages that exist)

| Template | Renders |
| --- | --- |
| `index.json` | Home — slideshow, featured collections/products, banners, testimonials, why-choose-us, gallery, insta-videos, blog, newsletter |
| `product.json` | Default product page (`product-template`) |
| `product.latest-product.json` | **Custom metafield-driven PDP** (uses `fresh-0-*` sections + `custom.*` metafields) |
| `collection.json` (+ `.24`, `.48`, `.list`, and handle-bound variants) | Collection grids / layouts |
| `collection.himalayan-shilajit / .health-supplements / .organic-peanut / .organic-poha / .staple-packaged-food / .sub-collection1–4 / .alternate` | Handle-specific collection templates |
| `cart.json` | Cart page (`page-cart`) |
| `page.json` + `page.aboutus(-v2/-v3/-v4)`, `page.contactus / .contact-us-v2 / -v3`, `page.FAQs`, `page.track-order`, `page.wishlist`, `page.instagram`, `page.lookbook1/2`, `page.product-hover`, `page.aahar-exhibition`, `page.staple-package-food` | Standard + custom landing pages |
| `blog.json`, `article.json`, `search.json`, `404.json`, `password.json`, `list-collections.json` | Standard storefront pages |
| `templates/customers/*.liquid` | account, login, register, order, addresses, activate_account, reset_password |
| `gift_card.liquid`, `search.avada-seo.liquid`, `search.json.liquid` | Legacy Liquid templates |

### Sections (grouped)

- **Chrome / global:** `header.liquid` (switches `header-v1..v6`), `footer.liquid` (switches `footer-v1..v6`), `latest-footer.liquid`, `hov-search-overlay.liquid`. (No standalone announcement-bar section — promo bar is the `promo-topbar` snippet.)
- **Page mains:** `main-page`, `main-search`, `main-404`, `main-password`, `product-template`, `collection-template`, `blog-template`, `article-template`, `list-collection`, `page-cart`.
- **Custom House-of-Veda sections:** `latest-product-template`, `hov-testimonials`, `HOV-what-makes`, `why-choose-us`, `insta-videos`, `ctm--gallery-text`, `ctm-review-slider`, `related-product-new`, `page-wishlist`, `page-track-order`, `page-instagram`, `product-hover`, and the **`fresh-0-*` PDP builder family** (`fresh-0-carousel`, `-certification`, `-faq`, `-images-slider`, `-images-slider-1`, `-product-des-tab`, `-review-slider`, `-text-and-image`, `-video`, `-video-columns`).
- **Versioned Herbyo builders:** banners `section-banner-v1..v12`; slideshows `section-slideshow-v1..v5`; products `section-product-v1..v6`; collections `section-collection-v1..v3` + `sub-collection1..5-template`; blog `section-blog-v1..v3`; instagram `section-instagram-v1..v4`; testimonials/reviews; service/info/brand/logos; newsletter variants; countdown, flash-sale, gallery, rich-text; about/contact/FAQ/lookbook families.

### Snippets (grouped)

- **Header/footer:** `header-v1..v6`, `footer-v1..v6`, `menu`, `menu_mobile`, `menu-toolbar`, `eveland-menu`, `topbar`, `promo-topbar`, `hov-sidebar`, `breadcrumb`.
- **Product/cards:** `product-item-grid/-list/-v1/-v1-new`, `product-extended`, `product-quick-view`, `product-gallery-*`, `product-details-*`, `product-tabs`, `related-product`, `complementary-products`, `swatch`, `price`, `size-guide`, `add-to-cart-sticky`.
- **Cart:** `mini-cart`, `minicart`, `ajax-cart-template`, `template-popup-ajax-addtocart`.
- **Custom HOV:** `hov-chatbot` (rule-based "Veda Assistant"), `hov-wishlist`, `hov-price-filter`, `hov-search-bar`, `hov-sidebar`, `hov-popup`, `hov-reel-popup`, `hov-free-shipping-bar`.
- **Collection filtering:** `collection-sidebar`, `collection-sorting`, `collection-widget-*`, `collection.shopby-*`, `collection-infinity-scroll`, etc.
- **Third-party app snippets:** `avada-*` (SEO + Boost Sales), `weglot_switcher`, `weglot_hreftags`, `smile-initializer`, `cmcommerce*`, `popper_app`, `currencies`, `currency-picker`, `engo-header-fonts`.

### Assets (grouped)

- **Theme/brand CSS:** `style-main.scss.liquid`, `base.css`, `general.css`, `custom-code.css`, **`houseofveda-modern.css`** (brand tokens), **`hov-typography.css`** (font override), `section-footer.css`, plus `fresh-*`, `HOV-what-makes.css`, `hov-*` feature CSS.
- **Vendor CSS:** `bootstrap.min.css`, `font-awesome.min.css`, `animate.min.css`, `slick*.css`, `jquery.fancybox*.css`, `flipclock.min.css`, `threesixty.css`.
- **Custom JS:** `hov-auth.js`, `hov-cart-checkout.js`, `hov-location.js`, `hov-search-overlay.js`, `hov-wishlist.js`, `engo-scripts.js.liquid`, `engo-plugins.js`, `ajax-cart.js.liquid`, `collection.js.liquid`, `quickview.js.liquid`.
- **Vendor JS:** `jquery*.js`, `bootstrap.bundle.min.js`, `slick.min.js`, `lazysizes.min.js`, `masonry.pkgd.min.js`, `instafeed.min.js`, `handlebars.min.js`, `gmaps.min.js`, `modernizr*.js`, etc.
- **Fonts:** `SofiaPro*.woff/ttf` (legacy — overridden), `fontawesome-webfont.woff`.
- **Images/icons:** SVG UI icons (`arrow-*`, `icons.svg`, social icons), brand/marketing WebP/PNG (`banner.webp`, `whychoose.webp`, `triphala_powder.webp`, `*featurecollection*.webp`, `*-transparent.png`, `favicon.png`, `note.jpg`).

---

## 4. Design system / brand kit

**Canonical source of truth = two CSS files** that override the legacy theme settings with `!important`. Reproduce these to reproduce the look.

### Color palette — `assets/houseofveda-modern.css` `:root`

| Token | Hex | Role |
| --- | --- | --- |
| `--hov-green` | `#2D5A27` | **Primary brand green** — all CTAs, links, accents, checkout button |
| `--hov-green-dk` | `#1F3D1A` | Button hover, gradient end |
| `--hov-dark` | `#1a1a1a` | Body & heading text |
| `--hov-gray` | `#6b7280` | Muted / secondary text |
| `--hov-light` | `#f7f5f2` | Light surface / section background |
| `--hov-border` | `#e8e4de` | Borders, dividers, input outlines |

Product label colors (`config/settings_data.json`): NEW `#2786b6`, SALE `#e12c43`, HOT `#000000`, SOLD-OUT `#000000` (all white text). Cart count badge `#7fc9c4`.
Checkout: body `#ffffff`, sidebar `#fafafa`, accent/button `#2D5A27`, error `#ff6d6d`.

> **Ignore** the high-frequency Bootstrap hexes (`#007bff`, `#6c757d`, `#dee2e6`, `#212529`, `#28a745`, `#dc3545`, `#ffc107`) — they are vendor defaults from `bootstrap.min.css`, **not** brand colors. The only real brand color is `#2D5A27` and its dark variants (`#1F3D1A`, `#1a2e1a`).

### Typography — `assets/hov-typography.css` `:root`

- **Everything (body + h1–h6 + UI):** `Plus Jakarta Sans`, weights **400/500/600/700/800**.
- **Cursive accent** (`.vibes-font`): `Great Vibes`.
- **Loader:** `snippets/engo-header-fonts.liquid` pulls both from Google Fonts.
- Prices/counts forced to `lining-nums tabular-nums`.
- Legacy Sofia Pro / Barlow / Jost fonts exist but are **overridden** — ignore them.

### Layout tokens

| Token | Value |
| --- | --- |
| Container width | `max-width: 1240px` (`.container`) |
| Corner radius | `8px` base · `14px` cards |
| Shadows | `0 2px 12px rgba(0,0,0,.07)` · `0 4px 24px rgba(0,0,0,.10)` |
| Transition | `.25s ease` |
| Logo max width | `450` desktop · `120` mobile |

### Global toggles (`config/settings_data.json` → `current`)

Cart = drawer · currency INR · promo topbar ON · sale/sold-out labels ON, new label OFF · product swatches ON · sticky mobile bar ON · related products limit 12, 4 columns.

### 🎨 Shudhi Herbals color decision `[PLACEHOLDER]`

**Default:** keep the existing green `#2D5A27` family (it reads as clean/herbal and already themes the whole store).

**To swap in a Shudhi palette instead**, edit the `:root` blocks in **`assets/houseofveda-modern.css`** and update the legacy mirrors (`color_main2`, `checkout_accent_color`, `checkout_button_color`) in `config/settings_data.json`. Change font by editing the family in **`assets/hov-typography.css`** and the Google Fonts URL in **`snippets/engo-header-fonts.liquid`**.

---

## 5. Feature inventory (preserve all of these)

AJAX / drawer cart · mini-cart · cart recommendations · wishlist page · product quick view · variant swatches · related & complementary products · collection filtering / sorting / pagination / infinity-scroll · mega-menu + mobile menu · custom search overlay · rule-based chatbot ("Veda Assistant") · WhatsApp shortcut · newsletter / cookie / login / recently-viewed popups · multi-currency + language (Weglot) · blog / article · lookbook · Instagram video grids · testimonials slider · **`fresh-0-*` metafield-driven PDP builder** · Slick sliders · Fancybox · Masonry · lazy loading · SEO metadata + structured data.

---

## 6. COMPLETE "House of Veda" removal inventory

> This is the heart of the guide. Every trace, with **exact file:line** references. Work top to bottom. Line numbers are from the current repo state — if a file has shifted, search the quoted text.

### A. Brand name / logo text (hardcoded strings → "Shudhi Herbals")

| File | Lines |
| --- | --- |
| `layout/theme.liquid` | 68, 73, 305–323 (whole JSON-LD block), 339, 845, 850, 1113 |
| `sections/hov-search-overlay.liquid` | 15, 29, 31, 33 |
| `snippets/hov-sidebar.liquid` | 18, 22, 27, 326 |
| `snippets/collection-sidebar.liquid` | 14, 19, 25 |
| `snippets/promo-topbar.liquid` | 88, 113 |
| `snippets/tab-product-details.liquid` | 113 (hardcoded `<span>House of Veda</span>` vendor label) |
| `sections/why-choose-us.liquid` | 190, 220, 267 |
| `sections/hov-testimonials.liquid` | 16, 42, 44, 205, 244–266 |
| `sections/HOV-what-makes.liquid` | 70 |
| `sections/header.liquid` | 311 ("Ludhiana") |

### B. Logos & images (swap settings + re-upload files)

| Item | Where |
| --- | --- |
| Logo settings | `config/settings_data.json` lines 19, 49, 79, 298, 320, 366, 381, 391, 3954, 3963 |
| PDP logo refs | `templates/product.latest-product.json` 189, 196 |
| CDN files to re-upload to Shudhi's **Files** and re-point | `image_7.png`, `logo.png`, `hov-logo.png`, `HOV_Logo.png`, `wwf_logo_with_HOV(_3).webp/png`, `logonewhov.png`, `hov_logo_a-1/2.jpg` |
| Local `assets/` marketing art to replace | `banner.webp`, `whychoose.webp`, `note.jpg`, `triphala_powder.webp`, `oil/pulse/sweetner/tea-transparent.png`, `a2desigheefeaturedcollection.webp`, `honeyfeaturecollection.webp`, `stapledfoodcollectionfeature.webp`, `teacollectionfeatureimage.webp`, `favicon.png` |

Generic UI images (`ajax-loader.gif`, `fancybox_*`, `arrow-*.svg`, social icons) are theme-generic — **keep**.

### C. Product / collection references (repoint to the single Cleansing Bar)

| File | Lines / handles |
| --- | --- |
| `config/settings_data.json` | 53 (`best_product_collection`), 67 (`relate_product_collection`), 434 (`url_coll_1`), 505 |
| `templates/index.json` | hero handles at 31, 54, 77, 100, 123, 146; featured 310; 615 |
| `templates/collection.json` | 27, 42, 57, 72 (brand tiles → `teas`, `organic-pulses…`, `organic-sweeteners`, `organic-cooking-oils`) |
| Handle-bound templates (repurpose or leave unused) | `collection.himalayan-shilajit.json`, `collection.health-supplements.json`, `collection.organic-peanut.json`, `collection.organic-poha.json`, `collection.staple-packaged-food.json`, `collection.sub-collection1–4.json`, `page.aahar-exhibition.json`, `page.staple-package-food.json` |

### D. Contact / social / policy (→ Shudhi values or `[PLACEHOLDER]`)

| File | Lines |
| --- | --- |
| `config/settings_data.json` | 18, 21, 22, 23, 520, 6158, 6159 (+ stray placeholder emails at 1188, 1216, 1217, 1724–1732, 1758, 2061, 2195, 3055, 3734) |
| `layout/theme.liquid` | 308 (email), 310 (phone), 311–317 (postal address), 319–321 (social sameAs), 562 (WhatsApp `wa.me/917743011109`) |
| `snippets/footer-v4.liquid` | 23–27, 39–45, 113–117, 129–135 (policy + social links, all `houseofveda.com`) |
| `templates/page.contact-us-v2.json` | 20, 28, 36 |
| `templates/page.aboutus.json` | 589 (`ins_userid: houseofvedaofficial`) |
| `sections/page-track-order.liquid` | 1226 (`support@houseofveda.com`) |
| `snippets/hov-chatbot.liquid` | 136, 212, 230, 250, 269, 287, 445 |

### E. Tracking / verification / app-account IDs — **PRIVACY-CRITICAL, remove or replace**

| File | What | Lines |
| --- | --- | --- |
| `layout/theme.liquid` | google-site-verification (2×) | 6, 299 |
| | **Live GTM `GTM-TJ7PL5D9`** (+ commented `GTM-NL4VDNLZ`, `GTM-THQK6ZTX`) | 24–30, 8–21 |
| | Meta Pixel `224366287383030` | 44–56, 112–115 |
| | **Hardcoded Purchase event containing a REAL hashed customer email — DELETE outright** | 87–110 |
| | Google Ads `AW-10887516565` | 284 |
| | facebook-domain-verification | 288 |
| | JSON-LD schema logo + long brand description | 306–307 |
| | GTM noscript | 364 |
| `snippets/popper_app.liquid` | shop `houseofveda-pnb.myshopify.com` | 31 |
| `snippets/avada-seo-redirect.liquid` | shop domain | 117 |
| `snippets/smile-initializer.liquid` | Smile.io rewards (HoV account) | whole snippet |
| `assets/hov-auth.js` | redirect `houseofveda.com/account` | 279 |

> Browser-side analytics IDs are not server secrets, but they **send data to House of Veda's accounts** — they must not remain in Shudhi's store. Replace with Shudhi's own IDs or remove entirely.

### F. Marketing / story copy to rewrite (→ Shudhi Cleansing-Bar `[PLACEHOLDER]`)

| File | Lines / content |
| --- | --- |
| `templates/index.json` | 286–290 ("Vedic worldview" copy), 319–348 (named testimonials), 388, 499, 905, 911 (belief/journey banners) |
| `templates/page.aboutus.json` | 84–104 (story), 181–230 (GROW values), 247–259 (vision), 579–608 (Instagram) |
| `templates/blog.json` | 43 (brand description) |
| `config/settings_data.json` | 27 (promo bar "Flat 26% off…"), 34–36 ("Diwali" popup + coupon `HOVDIWALI`), 54–55 (fake purchase-notification names), 520 |
| `snippets/hov-chatbot.liquid` | **entire Q&A dataset** (offers, coupon `VEDA10`, return policy, contact block) |
| `templates/page.FAQs.json` | leftover **EuroCarParts** placeholder copy — rewrite regardless |

### G. Locale / docs

| File | Lines |
| --- | --- |
| `locales/en.default.json` | 32 (`powered_by_shopify_html` override → "…powered by ShopiLaunch, LLC") |
| `README.md` | 1, 3, 32, 33, 75, 107, 108, 255 (brand refs + GitHub repo URL) |
| `Claude.MD` | brand references |

### Note on `hov-*` / `HOV-*` filenames

Files like `houseofveda-modern.css`, `hov-typography.css`, `hov-chatbot.liquid`, `HOV-what-makes.liquid`, `hov-auth.js`, `hov-search-overlay.js`, `hov-wishlist.js`, `hov-sidebar.liquid` carry the brand in their **filename** and are wired by name across `layout/theme.liquid` and section schemas. **Leave the filenames as-is by default** — they're internal and invisible to shoppers. Renaming is optional and requires coordinated reference updates across every `{% include %}`, `{{ 'file' | asset_url }}`, and `type` field, so only do it if you specifically want it.

---

## 7. Shudhi Herbals rebrand map

| Category | House of Veda → | Shudhi Herbals |
| --- | --- | --- |
| Brand name | `House of Veda`, `HouseOfVeda`, `HOUSE OF VEDA` | `Shudhi Herbals` (match the casing of each occurrence) |
| Domain | `houseofveda.com`, `houseofveda-pnb.myshopify.com` | `[PLACEHOLDER — shudhi domain]` / `<shudhi-store>.myshopify.com` |
| Product handles | `organic-moringa-powder`, `pure-himalayan-shilajit`, … | `negativity-removal-cleansing-bar` (the single product) |
| Collection handles | `best-seller`, `organic-sweeteners`, `ghee`, … | `all` or a new `cleansing-bars` collection |
| Contact | email/phone/address | `[PLACEHOLDER — Shudhi contact]` |
| Social | `houseofvedaofficial`, `x.com/houseofveda_` | `[PLACEHOLDER — Shudhi social]` |
| Policy links | `houseofveda.com/policies/*` | `[PLACEHOLDER]` (or the Shudhi store's own policy URLs) |
| Tracking IDs | GTM / Pixel / Ads / verification | `[PLACEHOLDER — Shudhi's own, or leave removed]` |
| Testimonials / story / chatbot | product-specific HoV copy | Shudhi single-product `[PLACEHOLDER]` copy about the Cleansing Bar |

---

## 8. Product setup — Negativity Removal Cleansing Bar

**Chosen model: ONE product with variants** (created in Shopify Admin, not in theme code).

```
Product title:  Negativity Removal Cleansing Bar
Option name:    Pack Size
Variants:
  • Single Bar – 100g   → price, SKU, weight 100g, inventory
  • Pack of 3           → price, SKU, weight ~300g, inventory
Handle:         negativity-removal-cleansing-bar
Images:         Shudhi product photos (upload to Files)
```

- After creating it, point the theme's product/collection references (§6-C) at this product / its collection.
- Update the product JSON-LD in `layout/theme.liquid` lines 63–84: set `brand.name` to "Shudhi Herbals" and either make the `sku` dynamic (`{{ product.selected_or_first_available_variant.sku }}`) or remove the hardcoded `"sku": "45"`.

> *(A two-separate-products model — one page per pack size — is possible but was **not** chosen; the single-product-with-variants model gives one clean page and one review pool.)*

---

## 9. ▶️ COPY-PASTE EXECUTION PROMPT

> Paste everything in the box below into a **fresh Claude Code session** opened inside the cloned theme repo, with **Shopify CLI already logged into the Shudhi Herbals store**. Keep this guide open in the same session for the file:line inventory.

```text
You are a senior Shopify theme developer. This repo is a customized "Herbyo"
(ThemeOcean 1.0.0) Online Store 2.0 theme currently branded for "House of Veda".
I am reusing it for a new client, "Shudhi Herbals". Their only launch product is
a "Negativity Removal Cleansing Bar" sold as one product with a "Pack Size" option
(variants: "Single Bar – 100g" and "Pack of 3").

GOAL: Remove every trace of House of Veda, rebrand to Shudhi Herbals, and push the
theme to the Shudhi store as an UNPUBLISHED theme — WITHOUT changing the theme's
structure, layout, sections, or features. Use the file:line inventory in
SHUDHI-HERBALS-CLONE-GUIDE.md (§6) and the rebrand map (§7) as the source of truth.

DO THIS, IN ORDER:
1. Brand name: replace "House of Veda" / "HouseOfVeda" / "HOUSE OF VEDA" with
   "Shudhi Herbals" (matching each occurrence's casing) across every file listed
   in §6-A. Also update alt text and aria-labels.
2. Logos/favicon: in config/settings_data.json (§6-B) set the logo/favicon settings
   to [PLACEHOLDER] values and leave a clear TODO comment listing which images I must
   re-upload to Files. Do not fabricate CDN paths.
3. Tracking (PRIVACY-CRITICAL, §6-E): in layout/theme.liquid, remove the live GTM
   block, the Meta Pixel block, the Google Ads tag, the facebook/google verification
   metas, and DELETE the hardcoded Purchase event at lines ~87–110 (it contains a real
   hashed email). Replace with clearly-labeled [PLACEHOLDER] slots for Shudhi's own IDs.
   Neutralize the House-of-Veda shop domain in popper_app.liquid, avada-seo-redirect.liquid,
   smile-initializer.liquid, and hov-auth.js.
4. Contact/social/policy (§6-D): replace with [PLACEHOLDER] values.
5. Marketing copy (§6-F): rewrite testimonials, chatbot Q&A, About-Us story, hero copy,
   promo bar, and popups into Shudhi single-product [PLACEHOLDER] text centered on the
   Cleansing Bar. Do NOT invent fake reviews, ratings, health/spiritual claims, coupons,
   or policies — use obvious [PLACEHOLDER] markers I will fill in.
6. Product/collection refs (§6-C): repoint to the single product handle
   "negativity-removal-cleansing-bar" (or collection "all"). Update the product JSON-LD
   in layout/theme.liquid (~63–84): brand.name = "Shudhi Herbals", make sku dynamic.
7. Locale/docs (§6-G): fix locales/en.default.json line 32, and update README.md brand refs.
8. Keep ALL hov-*/HOV-* FILENAMES as-is (they are internal; renaming risks breakage).

GUARDRAILS — do NOT:
- delete or rename any section, snippet, template, or asset file;
- remove any page or feature;
- invent fake reviews, testimonials, prices, health claims, or coupon codes;
- reuse any House-of-Veda tracking ID, domain, or account;
- run `theme push --publish` or `--allow-live`.

WHEN DONE:
- run `git status` and `git diff` and summarize the changes;
- run: shopify theme push --unpublished --store <shudhi-store>.myshopify.com
  (do NOT use --strict — Theme Check has a legacy error baseline that will block it);
- print the post-push manual checklist (menus, product+variants, images, metafields,
  template assignment, apps, favicon, currency) from §11 of the guide;
- run `grep -ri "house of veda"` and a search for the old product handles to confirm
  nothing remains except intended [PLACEHOLDER]s.
```

---

## 10. Deployment & connect (CLI-ready path)

```bash
# 1. Confirm CLI is installed and you're logged into the Shudhi store
shopify version

# 2. Push as a NEW, UNPUBLISHED theme (safe — does not affect the live store)
shopify theme push --unpublished --store <shudhi-store>.myshopify.com
#    ⚠ Do NOT add --strict: Theme Check currently fails on a legacy error baseline.
#    ⚠ Do NOT use --publish / --allow-live until you've QA'd it.

# 3. Open the preview + Theme Editor links the CLI prints. QA against §12.

# 4. Publish from Shopify Admin > Online Store > Themes > Publish when ready.
```

**ZIP fallback** (if you prefer manual upload): `shopify theme package` → Admin > Online Store > Themes > Add theme > Upload zip file.

---

## 11. Post-push manual checklist (store-side — code can't do these)

- [ ] **Menus:** recreate in Admin > Navigation — `main-menu`, `header`, `footer`, `info`, `shop`, `about`, `category`, `category-collection`, `footer-v4`.
- [ ] **Product:** create *Negativity Removal Cleansing Bar* with the `Pack Size` option + two variants (§8).
- [ ] **Collections:** create/assign the collection(s) the theme references (e.g. `all` or `cleansing-bars`).
- [ ] **Images:** re-upload Shudhi logo, favicon, hero/marketing images to **Files**, then update the `shopify://shop_images/…` references left as `[PLACEHOLDER]`.
- [ ] **Metafields:** recreate the `custom.*` product metafield definitions used by `product.latest-product` + `fresh-0-*` **OR** assign the product to the simpler standard `product.json` template until metafields are set up.
- [ ] **Templates:** assign alternate templates to their pages (About, Contact, FAQ, Track-order, Wishlist).
- [ ] **Apps:** install/configure or remove the app embeds — Avada SEO/Boost Sales, Smile.io, Weglot, currency converter, Anglerfox/popper. Snippets referencing an uninstalled app simply do nothing.
- [ ] **Tracking:** add Shudhi's own GTM / Meta Pixel / Google Ads if wanted (the `[PLACEHOLDER]` slots).
- [ ] **Favicon & branding:** set favicon and confirm logos render.
- [ ] **Markets/currency:** confirm INR + any language/country selectors.

---

## 12. QA / verification checklist

Run through the storefront (desktop + mobile):

1. Home — hero, featured products/collections, testimonials, newsletter.
2. Header, mega-menu, mobile menu, search overlay, footer.
3. Product page — variants (Single 100g / Pack of 3), swatches, media, quantity, add-to-cart, quick view.
4. Cart drawer → cart page → checkout handoff.
5. Collection — filters, sorting, pagination, empty state.
6. Customer — login, register, account, addresses, order.
7. Search, blog, article, contact, FAQ, custom pages.
8. Currency / language switching.
9. Newsletter, cookie notice, chatbot, WhatsApp, popups.
10. Analytics, pixels, SEO metadata, canonical URLs, structured data (confirm they're Shudhi's or removed — **not** House of Veda's).
11. Performance, **accessibility** (keyboard nav, focus states, alt text, color contrast on the green CTAs), and browser console errors.

**Final brand-scrub check** — from the repo root, these should return **nothing** but intended `[PLACEHOLDER]`s:

```bash
grep -ri "house of veda" .
grep -ri "houseofveda" .
grep -rEi "GTM-TJ7PL5D9|224366287383030|AW-10887516565" .
```

---

*Guide generated from a full read of the theme: base **Herbyo** by **ThemeOcean 1.0.0**; brand green **#2D5A27**; font **Plus Jakarta Sans**; live tracking IDs present in `layout/theme.liquid`. Keep this file in the repo root for the executing session.*
