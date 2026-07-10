---
name: testing-shopify-theme
description: Test Shopify Dawn theme changes locally with theme dev, Theme Check, template assignment workarounds, and visual verification guidance for sections and page templates.
---

# Shopify Dawn Theme Testing

## Overview
This skill covers how to test Shopify Dawn theme changes locally, including page templates, sections, and visual verification.

## Devin Secrets Needed
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API access token (loaded via `.envrc` / direnv)
- `SHOPIFY_CLI_THEME_TOKEN` - Shopify CLI theme token for dev server authentication
- `SHOPIFY_FLAG_STORE` - Shopify store URL (e.g., `store-name.myshopify.com`)
- `SHOPIFY_CLI_THEME_TOKEN_TEST` - Theme Access Token for test store (org-scoped)
- `SHOPIFY_STORE_PASSWORD_TEST` - Storefront password for password-protected test store (org-scoped)

Primary store secrets are configured in the repo's `.envrc` file and loaded automatically by direnv.
Test store secrets are org-scoped and loaded via `/run/secrets/`.

## Local Development Server

### Starting the dev server
```bash
cd ~/repos/dawn && shopify theme dev --store $SHOPIFY_FLAG_STORE --password $SHOPIFY_CLI_THEME_TOKEN
```
- Preview URL: `http://127.0.0.1:9292`
- The dev server uploads theme files to a temporary development theme on the Shopify store
- Changes to theme files are automatically synced

### ⚠️ CRITICAL: never pass `--theme` pointing at a GitHub-connected named theme
- **DO NOT run `shopify theme dev --theme "dawn/develop"`** (or `dawn/main`, or any theme whose name matches a branch connected via the Shopify⇄GitHub integration).
- `theme dev` **uploads/syncs your local branch files into whatever theme you target**. If that target is a GitHub-connected theme (e.g. `dawn/develop`), Shopify's GitHub integration then commits the theme's new state back to the linked branch as a `shopify[bot]` "Update from Shopify for theme ..." commit. This silently round-trips your **unreviewed** local changes into `develop`/`main`.
  - This actually happened once: `theme dev --theme "dawn/develop"` pushed the local 3-tier nav change into the `dawn/develop` theme, which auto-synced into the `develop` branch (commit `a9f4bae2`) with no PR/review.
- **Correct usage**: run `theme dev` **without** `--theme` so the CLI creates/reuses a throwaway *development* theme (isolated, not GitHub-connected). Only add `--store`/`--password`/`--store-password` flags — never `--theme <connected-name>`.
- If you must target a specific theme, create/pick a disposable throwaway theme that is NOT one of the `dawn/<branch>` managed themes, and confirm it is not GitHub-connected first via `shopify theme list` (managed themes show the `[live]`/connected role or the `dawn/<branch>` naming).
- Remember the token is a `shptka_` Theme Access token with **write/push** permission, so an accidental push to a managed theme has real consequences.

### Lint checking
```bash
cd ~/repos/dawn && shopify theme check
```

## Testing Page Templates

### Key limitation: Template assignment
- Page templates (e.g., `page.decorte-counseling.json`) need to be **assigned to a page** in the Shopify admin panel
- The dev server uploads template files but does NOT automatically assign them to pages
- The `SHOPIFY_ACCESS_TOKEN` may lack `read_content` scope, preventing API-based template assignment
- Modifying the default `page.json` to test a different section may cause errors if the dev server validates JSON strictly

### Workaround: Standalone HTML preview
When you cannot change template assignments (no admin access, no API scope):
1. Create a standalone HTML file (`/tmp/preview.html`) containing the exact HTML/CSS from the Liquid section
2. Open it in the browser to verify visual rendering
3. This works well for sections with **static content** (no Liquid variables like `{{ page.content }}`)
4. For sections that use Liquid variables, you'll need Shopify admin access to assign the template

### Ideal testing flow (with admin access)
1. Start the dev server
2. Navigate to Shopify admin → Online Store → Pages → [page name]
3. Change the page template to the new template
4. Preview the page at `http://127.0.0.1:9292/pages/[handle]`
5. Verify rendering on desktop and mobile
6. Revert template assignment after testing if needed

## CI Checks
- **Theme Check**: Validates Liquid syntax and best practices
- **Lighthouse**: Performance, accessibility, best practices, SEO scores
- Both run automatically on PRs

## Existing Section/Template Patterns
- Brand-specific pages (DECORTE, CPB, BSI) follow a pattern:
  - Banner section: `main-page-banner-{brand}.liquid` (breadcrumb + logo + navigation)
  - Main section: `main-page-{feature}.liquid` (page content)
  - Template: `page.{feature}.json` (references banner + main sections)
- Styling uses a mix of Tailwind CSS utility classes (`tw-` prefix) and scoped CSS (BEM naming)
- Content is often hardcoded in sections (not using `{{ page.content }}`)

## Testing Collection/Brand Pages

### Brand top pages vs category pages
- Brand top pages (e.g., `/collections/sekkisei-blue`) show a different layout than category pages (e.g., `/collections/sekkisei-blue/スキンケア`)
- Brand top sections render when `current_tags == blank` (no tag filter)
- Category pages use Shopify's standard faceted filtering UI
- Test both views separately when making changes to brand-specific sections

### Product grid testing limitations
- Test stores may not have products in all collections
- Verify the HTML structure is correct even if no products render (check for `product-grid` and `grid__item` classes in HTML source)
- For full product grid verification, use a store with actual product data

### Multiple test stores
- Primary test store credentials are the repo-scoped secrets `SHOPIFY_FLAG_STORE` + `SHOPIFY_CLI_THEME_TOKEN`, found in `/run/repo_secrets/perfumerie-sukiya/dawn/.env.secrets` (source this file). As of last test these pointed to `perfumerie-sukiya-test.myshopify.com` and worked with no storefront password.
- Additional test stores may need separate tokens stored as secrets (e.g., `SHOPIFY_CLI_THEME_TOKEN_TEST` for `perfumerie-sukiya-online-test.myshopify.com`).
- **Token gotcha**: `SHOPIFY_CLI_THEME_TOKEN_TEST` may return `GraphQL Error (Code: 401): Invalid API key or access token` (expired/rotated). If so, fall back to the repo-scoped `SHOPIFY_CLI_THEME_TOKEN` primary-store creds. Diagnose quickly with `shopify theme list --store X --password Y` before starting `theme dev`.
- When switching stores, pass `--store` and `--password` flags to `shopify theme dev`. **Never** add `--theme "dawn/develop"`/`"dawn/main"` (see the CRITICAL warning above — it round-trips unreviewed changes into the branch).

### Multi-tier PC global nav (PRODUCTS dropdown) — BLUE brand headers
- Files: `snippets/header-navigation-{sekkisei,predia}-blue.liquid`. The PRODUCTS dropdown can be 3-tier: PRODUCTS → category → detail category.
- The nav bar is `tw-hidden md:tw-flex` — only visible at desktop width (≥768px). Maximize the browser first.
- 3rd-tier flyouts use `tw-group/nest2` + `group-hover/nest2:tw-block`; cascade CSS is `cpb-header .nested-menu .nested-menu{left:100%;top:0}` in `assets/main.css` (already compiled — no rebuild needed to add more nest2 groups).
- To verify without the store: `curl -s http://127.0.0.1:9292/collections/sekkisei-blue | grep -o 'group/nest2' | wc -l` (one per category with a submenu). The full expanded 3rd-tier `<a>` list is present in the DOM even while hidden.
- Visual test: hover PRODUCTS (2nd tier appears), then hover a category to reveal the 3rd-tier flyout to the RIGHT. Categories with submenus show a chevron; single-link categories (e.g. `その他`) have no chevron and no nested `<div>`.
- Detail category link targets are tag-filter URLs like `/collections/sekkisei-blue/クレンジング`; `すべて` links back to the category tag. On an empty test store these show "商品が見つかりません" — that is expected (data, not nav, issue).
- For full product-list verification, `perfumerie-sukiya-online-test.myshopify.com` HAS real BLUE product data (verified: 雪肌精BLUE クレンジング → 2 products, Prédia BLUE ヘアケア → 11 products). It is storefront-password protected, so use `--store-password "$SHOPIFY_STORE_PASSWORD_TEST"`. Remember: preview it with a throwaway dev theme, NOT `--theme "dawn/develop"`.

### Password-protected test stores
- Password-protected stores require TWO separate credentials:
  1. `--password` — Theme Access Token (from Shopify Admin → Themes → Theme access)
  2. `--store-password` — Storefront password (from Shopify Admin → Online Store → Preferences → Password protection)
- Both must be passed as command-line flags to avoid interactive prompts:
  ```bash
  shopify theme dev --store STORE_URL --password "$THEME_TOKEN" --store-password "$STORE_PASSWORD" --live-reload=off
  ```
- Theme Access Token is NOT the same as Admin API Access Token (`shpat_` prefix = Admin API token, not Theme Access Token)
- If you get a 401 error, verify the token type is correct
- Use `--live-reload=off` to reduce noise in automated testing

## Tips
- Always run `shopify theme check` before committing - it catches syntax errors and best practice violations
- The dev server creates a temporary theme with ID visible in the output (e.g., `preview_theme_id=185110298902`)
- For visual comparison, open the reference design and your preview side-by-side
- Test mobile responsive by using Chrome DevTools device toolbar (F12 → toggle device toolbar)
- Use `ctrl+shift+m` in Chrome DevTools to toggle device toolbar for mobile viewport testing
- Check HTML source with curl when visual elements might not render due to missing data (e.g., `curl -s URL | grep 'class-name'`)
- When a test store has no product data, verify HTML structure via curl and then use a store with real data for visual verification
- Run `shopify theme dev --help` to discover available flags when troubleshooting authentication issues
