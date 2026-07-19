# Shudhi Herbals Shopify Theme

Custom Shopify storefront theme for Shudhi Herbals, a premium herbal wellness brand. Rebranded from a customized **Herbyo** (ThemeOcean) theme. See `SHUDHI-HERBALS-CLAUDE-CODE-PLAN.md` and `SHUDHI-HERBALS-CLONE-GUIDE.md` for the rebrand/brand system.

This repository contains the complete theme source used by Shopify: Liquid layouts and components, Online Store 2.0 JSON templates, theme settings, translations, and vendored frontend assets. It is a customized version of the **Herbyo** theme by **ThemeOcean** (`1.0.0`), not a standalone Node.js application.

> Last documentation audit: 2026-06-11

## Project Status

- Default branch: `main`
- Shopify theme source: complete
- Local asset build step: not required
- `package.json`: not present
- `shopify.theme.toml`: not present
- Theme metadata: Herbyo by ThemeOcean, version `1.0.0`
- Repository size: 402 files
- Theme Check status: failing on pre-existing legacy theme issues; see [Validation](#validation)

## Storefront Features

- Responsive Shopify storefront and mobile navigation
- Online Store 2.0 JSON templates
- Configurable homepage sections and promotional content
- Product galleries, variants, swatches, quick view, and related products
- AJAX cart, mini-cart, cart drawer support, and cart recommendations
- Collection filtering, sorting, pagination, and alternate collection layouts
- Wishlist page and customer account templates
- Blog, article, search, contact, FAQ, lookbook, Instagram, and custom landing pages
- Newsletter, cookie, login, recent-product, and promotional popups
- Multi-currency settings and localized storefront content
- Custom Shudhi Herbals visual styles
- Rule-based "Veda Assistant" storefront chatbot
- WhatsApp contact shortcut
- Responsive image lazy loading, Slick sliders, Fancybox, and Masonry layouts
- SEO metadata and structured data integrations

## Technology

- [Shopify](https://www.shopify.com/)
- [Liquid](https://shopify.dev/docs/api/liquid)
- HTML, CSS, SCSS, and JavaScript
- Shopify Online Store 2.0 JSON templates
- Bootstrap
- jQuery
- Slick carousel
- Fancybox
- Lazysizes
- Masonry
- Font Awesome

Third-party libraries are committed under `assets/`. There is no npm, Yarn, Vite, Webpack, Gulp, or other local compilation pipeline in this repository.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `layout/theme.liquid` | Global HTML shell, shared assets, analytics, app snippets, header, footer, and page content |
| `config/settings_schema.json` | Theme Editor setting definitions and theme metadata |
| `config/settings_data.json` | Saved theme setting values exported from Shopify |
| `sections/` | 112 configurable Shopify sections |
| `snippets/` | 130 reusable Liquid components and app-generated snippets |
| `templates/` | 45 storefront, customer, product, collection, and page templates |
| `assets/` | 102 stylesheets, scripts, fonts, icons, and images |
| `locales/` | Seven locale files: English, German, Spanish, French, Portuguese, Brazilian Portuguese, and Vietnamese |

## Important Files

- `layout/theme.liquid`: main runtime entry point for storefront pages.
- `templates/index.json`: current homepage section composition and merchant content.
- `templates/product.json`: default product page structure.
- `sections/header.liquid` and `sections/footer.liquid`: primary theme chrome.
- `sections/latest-footer.liquid`: additional modern footer rendered globally.
- `assets/style-main.scss.liquid`: base theme styling compiled by Shopify.
- `assets/houseofveda-modern.css`: Shudhi Herbals-specific visual overrides.
- `assets/engo-scripts.js.liquid`: shared storefront interactions.
- `snippets/hov-chatbot.liquid`: static rule-based support assistant rendered on every page.
- `snippets/weglot_switcher.liquid`: Weglot initialization.
- `snippets/avada-seo.liquid`: AVADA SEO integration.

## Prerequisites

For Shopify CLI development:

- A Shopify store or development store
- Staff or collaborator access with theme permissions
- Node.js supported by the current Shopify CLI
- The latest [Shopify CLI](https://shopify.dev/docs/api/shopify-cli)

Install or update Shopify CLI:

```bash
npm install -g @shopify/cli@latest
```

Confirm the installation:

```bash
shopify version
```

## Local Development

Clone the repository and enter the theme directory:

```bash
git clone https://github.com/mohit9998A/Shudhi_Herbals-.git
cd Shudhi_Herbals-
```

Start a Shopify development theme:

```bash
shopify theme dev --store your-store.myshopify.com
```

Shopify CLI uploads a temporary development theme and prints local preview, Theme Editor, and shareable preview links. CSS and section changes hot reload; other changes refresh the preview.

This theme depends on store data such as products, collections, menus, pages, metafields, files, app embeds, and saved Theme Editor settings. A local preview connected to an empty store will not reproduce the production storefront.

## Configuration

After connecting the theme to a store, review these areas in Shopify Admin:

1. **Theme settings**: colors, fonts, logos, currency, social links, popups, and mobile navigation.
2. **Homepage**: section order and content defined by `templates/index.json`.
3. **Navigation**: main menu, mobile menu, footer menus, and mega-menu labels.
4. **Products and collections**: handles referenced by saved templates and section settings.
5. **Pages and blogs**: assign the appropriate alternate templates where required.
6. **Markets and languages**: currencies, country selector, language selector, and Weglot configuration.
7. **Apps and metafields**: restore app embeds and app-owned metafields used by the theme.
8. **Store files**: confirm all `shopify://shop_images/` and `shopify://files/` references exist in the target store.

### Theme Editor Files

`config/settings_data.json` and JSON templates contain merchant-selected content and Shopify resource references. Shopify may rewrite these files when changes are saved in the Theme Editor.

Before pulling or pushing theme-editor changes:

```bash
git status
git diff
```

Do not blindly overwrite newer merchant changes from the live store.

## Third-Party Integrations

The global layout and snippets currently reference:

- Google Tag Manager
- Google Ads
- Meta Pixel
- Microsoft Clarity
- Howuku
- AVADA SEO Suite
- AVADA Boost Sales
- Weglot
- Smile.io customer rewards data
- CM Commerce snippets
- WhatsApp

Several IDs, API keys, domains, phone numbers, contact details, and tracking scripts are hard-coded in theme files. Before deploying to another store or environment, audit at least:

- `layout/theme.liquid`
- `snippets/weglot_switcher.liquid`
- `snippets/avada-seo-redirect.liquid`
- `snippets/hov-chatbot.liquid`
- `config/settings_data.json`

Public browser-side analytics IDs are not server secrets, but they are store-specific configuration and can send data to the wrong account. Confirm consent, privacy, and cookie behavior for every tracking integration.

## Validation

Run Shopify Theme Check before opening a pull request or deploying:

```bash
shopify theme check
```

Use Shopify-aware tooling for validation. Shopify permits comments and trailing commas in `config/settings_schema.json` and section schema tags, while generated JSON templates can contain an auto-generated comment header. Generic strict JSON parsers can therefore report false errors.

The current theme does not pass the latest Theme Check error baseline. The June 2026 audit reported legacy JavaScript/CSS Liquid parser errors, unsupported old `image` setting types, parser-blocking scripts, missing image dimensions, and locale key mismatches. A full scan also exceeded five minutes because of the volume of existing findings. Treat these as migration and maintenance work; `shopify theme push --strict` will not succeed until the error-level findings are resolved or an appropriate reviewed Theme Check configuration is added.

Recommended manual checks:

1. Homepage at desktop and mobile breakpoints
2. Header, mega-menu, mobile menu, search, and footer
3. Product variants, swatches, media, quantity, add-to-cart, and quick view
4. Cart drawer, cart page, discounts, and checkout handoff
5. Collection filters, sorting, pagination, and empty states
6. Customer login, registration, account, address, and order pages
7. Search, blog, article, contact, FAQ, and custom page templates
8. Currency and language switching
9. Newsletter, cookie notice, chatbot, WhatsApp, and promotional popups
10. Analytics, pixels, SEO metadata, canonical URLs, and structured data
11. Performance, accessibility, and browser console errors

## Deployment

### Push an Unpublished Theme

The safest CLI deployment creates a new unpublished theme:

```bash
shopify theme push \
  --store your-store.myshopify.com \
  --unpublished \
  --strict
```

`--strict` requires Theme Check to pass without errors. Review the returned preview and Theme Editor links before publishing.

### Update an Existing Theme

```bash
shopify theme push \
  --store your-store.myshopify.com \
  --theme THEME_ID \
  --strict
```

Avoid `--publish` and `--allow-live` unless a production release has been explicitly approved. A theme push can overwrite remote files and can remove remote files that do not exist locally.

### Create an Uploadable ZIP

```bash
shopify theme package
```

Upload the generated ZIP from **Shopify Admin > Online Store > Themes > Import theme > Upload zip file**.

## Recommended Git Workflow

```bash
git checkout -b feature/short-description
shopify theme dev --store your-store.myshopify.com
shopify theme check
git add <changed-files>
git commit -m "Describe the theme change"
git push -u origin feature/short-description
```

Keep theme changes focused. Pay particular attention to diffs in `settings_data.json` and JSON templates because Theme Editor saves can produce large content changes.

## Known Risks and Maintenance Notes

- The theme mixes modern JSON templates with legacy Liquid patterns such as `{% include %}` and vendor-specific code.
- `layout/theme.liquid` contains store-specific analytics, schema, contact information, and app code.
- Some app snippets depend on app-managed metafields or script tags and may do nothing when the related app is not installed.
- The chatbot is a client-side scripted FAQ, not a live AI or customer support service. Its offers, policies, addresses, and contact details must be kept synchronized with actual business policy.
- Several libraries are vendored and should be upgraded cautiously because theme scripts may depend on their current APIs.
- The repository does not include automated tests, CI, a custom Theme Check configuration, or a deployment environment file.
- The latest Shopify Theme Check currently reports a large pre-existing error baseline, so strict deployment is not yet available.
- No license file is included. Theme source remains subject to the rights of Shudhi Herbals and the original ThemeOcean theme license.

## Useful Documentation

- [Shopify theme architecture](https://shopify.dev/docs/storefronts/themes/architecture)
- [Shopify CLI for themes](https://shopify.dev/docs/storefronts/themes/tools/cli)
- [Shopify Liquid reference](https://shopify.dev/docs/api/liquid)
- [Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check)
- [Theme development best practices](https://shopify.dev/docs/storefronts/themes/best-practices)
