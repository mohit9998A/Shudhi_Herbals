# THEME-ANALYSIS.md — Shudhi Herbals rebrand (analysis + change record)

Analysis of the base theme and a record of the rebrand executed locally (House of Veda → Shudhi Herbals). Companion to `SHUDHI-HERBALS-CLONE-GUIDE.md` (removal inventory) and `SHUDHI-HERBALS-CLAUDE-CODE-PLAN.md` (brand + build plan).

## 1. Base theme (confirmed)

- **Theme:** Herbyo by ThemeOcean `1.0.0` · Shopify **Online Store 2.0** · no build step (no `package.json` / `shopify.theme.toml`).
- **Counts:** 116 sections · 136 snippets · 45 templates · assets (CSS/JS/fonts/images) · 7 locales · 1 theme block.
- **Global render chain** (`layout/theme.liquid`): `hov-sidebar` → `promo-topbar` → `header` → page → `footer` → `latest-footer` → search / mini-cart / mobile-menu → `hov-search-overlay` → `hov-chatbot`.
- **Design-token source of truth:** `assets/houseofveda-modern.css` (`:root` colours) + `assets/hov-typography.css` (fonts, loaded last with `!important`). Filenames prefixed `hov-*` / `houseofveda-*` are **kept** (internal, wired by name).
- **Cart** = drawer · **currency** = INR · Theme Check has a **pre-existing legacy error baseline** (so deploy WITHOUT `--strict`).

## 2. Rebrand change record (what this pass changed)

### Tracking / privacy (`layout/theme.liquid`) — removed, replaced with Liquid-comment placeholders (stripped from shipped HTML)
- Google Tag Manager `GTM-TJ7PL5D9` (+ legacy `GTM-NL4VDNLZ` / `GTM-THQK6ZTX`) and GTM `<noscript>`.
- Meta Pixel `224366287383030` (init + noscript).
- **A hardcoded Purchase event containing a real hashed customer email — deleted.**
- Google Ads `AW-10887516565`; two `google-site-verification` metas; `facebook-domain-verification`.
- **Howuku** (`nvmGW7eJdkpaqYw81xXQKA`) and **Microsoft Clarity** (`nyt95au9ju`) — beyond the clone guide's list, also HoV-account trackers, removed.
- Product JSON-LD: brand → "Shudhi Herbals", `sku` → dynamic, url → `canonical_url`, **fabricated `aggregateRating` removed**. OnlineStore JSON-LD → Shudhi + `[PLACEHOLDER]` contact. Collection JSON-LD url → `{{ shop.url }}`.
- Neutralized HoV shop domain/account in `snippets/popper_app.liquid`, `snippets/avada-seo-redirect.liquid`, `assets/hov-auth.js` (account redirect → relative `/account`). `snippets/smile-initializer.liquid` reads keys from store metafields → left store-agnostic.

### Brand strings → "Shudhi Herbals" (casing-matched, incl. `alt`/`aria-label`)
- `layout/theme.liquid` (logo alt, register panel, WhatsApp number → placeholder), `sections/hov-search-overlay.liquid`, `sections/why-choose-us.liquid`, `sections/HOV-what-makes.liquid`, `sections/header.liquid` (Ludhiana → placeholder), `sections/hov-testimonials.liquid`, `snippets/hov-sidebar.liquid`, `snippets/collection-sidebar.liquid`, `snippets/promo-topbar.liquid`, `snippets/tab-product-details.liquid`, `snippets/footer-v4.liquid`, `snippets/hov-chatbot.liquid` (assistant → "Shudhi Assistant"), plus internal comments in `houseofveda-modern.css` / `hov-typography.css` / `hov-search-overlay.js` / `engo-scripts.js.liquid`. `README.md` rebranded; `locales/en.default.json` "powered by" override cleared.

### Contact / social / policy → Shudhi or `[PLACEHOLDER]`
- `config/settings_data.json` (brand_description, social links → empty, customer-care phone/email, popup + promo copy, footer copyright, vendor demo emails), `templates/page.contact-us-v2.json` (address/phone/emails), `snippets/footer-v4.liquid`, `sections/page-track-order.liquid`, `snippets/hov-chatbot.liquid`.

### Product / collection references → single product / `all`
- `config/settings_data.json` (`best_product_collection`, `relate_product_collection`, `url_coll_1`, `best_product_collection_prodpage`, shop-by submenu labels/handles).
- `templates/index.json` (all hero CTA handles → `products/negativity-removal-cleansing-bar`; featured collections → `all`), `templates/collection.json` (brand tiles + `select_collection`), hardcoded category nav in `snippets/collection-sidebar.liquid`, `snippets/hov-sidebar.liquid`, `sections/section-collection-v1.liquid`, `sections/hov-search-overlay.liquid` → `/collections/all`.

### Marketing copy rewritten to Shudhi single-product (no invented facts — `[PLACEHOLDER]` for anything factual)
- `templates/index.json` (hero, ritual, values, journey/belief banners, testimonials → placeholders), `templates/page.aboutus.json` (story/values/vision), `templates/blog.json`, `templates/page.FAQs.json` (was leftover EuroCarParts copy), `snippets/hov-chatbot.liquid` (whole Q&A), `sections/hov-testimonials.liquid` (names/quotes/videos → placeholders).

### Shudhi design system (Phase 3)
- **Palette** in `assets/houseofveda-modern.css` `:root` + `config/settings_data.json` mirrors: Deep Forest Green `#335030` (primary/CTA/links/checkout), Warm Ivory `#FBF0DC`, Earth Brown `#785C3C`, Soft Sage `#9CAF88`, Champagne Gold `#C6A96B`, text `#1F2A24`, borders `#E8E1D0` (+ warm-taupe input border `#8C7B5E`). Named `--shudhi-*` tokens added.
- **Fonts** in `assets/hov-typography.css` + `snippets/engo-header-fonts.liquid`: headings = Cormorant Garamond, body/UI = Jost (Google Fonts). Self-hosted Guffie/Brokman `@font-face` scaffold left commented.
- **Accessibility (WCAG AA, reviewed):** all 7 text pairs pass; added darker input borders (1.4.11), underlined rich-text links (1.4.1), and a visible forest-green focus ring (2.4.7). Contrast rule: dark bg → white text; light bg (ivory/sage/gold) → charcoal text.
- Because the theme's buttons/cards/links read the `:root` tokens, the whole UI re-skins to the Shudhi palette from the token change.

## 3. Deliberately left / for the user (store-side — code can't do these)

- **Brand assets are not on disk**: logos/favicon/product/botanical photos → logo settings set to empty (graceful fallback to shop name); upload to Shopify Files, then set logo/favicon.
- **Handle-bound demo templates** (`collection.himalayan-shilajit.json`, `collection.sub-collection*.json`, `page.product-hover.json`, etc.) left intact but inert (no matching collection on the new store) — repurpose or ignore.
- **Content/demo images** (`shopify://shop_images/instagram*.jpg`, about/team/banner art) left as-is — reconfigure homepage/about content in the Theme Editor.
- **Fonts:** Guffie/Brokman not licensed/on-disk → Cormorant Garamond + Jost ship as the working pairing.
- **Store setup:** menus, product + `Pack Size` variants (Single 100g / Pack of 3), collections, product metafields, template assignment, app embeds, own tracking IDs — see `SHUDHI-HERBALS-CLAUDE-CODE-PLAN.md` §12.

## 4. Verification run

- Brand scrub (`house of veda` / `houseofveda` / old tracking IDs / old handles) across theme files → clean except intended `[PLACEHOLDER]`s and the kept `hov-*` / `houseofveda-modern.css` filenames.
- `config/settings_data.json` and edited JSON templates parse as valid JSON (after stripping the Shopify `/* */` header).
- Palette AA-reviewed; no section/snippet/template deleted or renamed.
