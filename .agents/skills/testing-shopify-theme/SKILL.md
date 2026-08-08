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
- Primary test store credentials are in `.envrc` (loaded via direnv)
- Additional test stores may need separate tokens stored as secrets (e.g., `SHOPIFY_CLI_THEME_TOKEN_TEST`)
- When switching stores, pass `--store` and `--password` flags to `shopify theme dev`

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

## Shopify CLI install / Node version pitfalls
If `shopify: command not found` or the CLI crashes with
`SyntaxError: The requested module 'node:module' does not provide an export named 'enableCompileCache'`:
- The default global npm prefix may not be writable, and the default Node (v20) may be too old for recent CLI versions.
- Working setup:
  ```bash
  mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global
  npm install -g @shopify/cli@latest
  export PATH=$HOME/.nvm/versions/node/v22.12.0/bin:$HOME/.npm-global/bin:$PATH
  shopify version   # expect 4.x
  ```
- Keep that PATH export in every shell that runs `shopify theme dev`.

## Identifying the right store domain
When the `.myshopify.com` domain is unknown, inspect the public storefront
(e.g. `curl -s https://online.sukiya.biz | grep -o '[a-z0-9-]*\.myshopify\.com' | head`)
— Shopify embeds `shopId`/domain metadata in the page. Guessing domains with curl is slow and unreliable.

## Verifying CPB / brand CLOSE UP blocks
- The CLOSE UP block in `sections/main-collection-product-grid-cpb.liquid` only renders on the
  unfiltered brand top URL `/collections/cle-de-peau-beaute` (no `filter.p.tag`).
- Its `詳細はこちらから` links are absolute `https://online.sukiya.biz/...` URLs, so clicking them
  leaves the local dev preview and hits the production storefront. That is expected; verify the
  destination heading/filter chip, then use browser Back to return to `127.0.0.1:9292`.
- Percent-encoded tags in hrefs are easy to get wrong (e.g. `ファンデーション` vs `ファンデンション`).
  Decode them before trusting them:
  ```bash
  python3 -c "from urllib.parse import unquote;print(unquote('%E3%83%95...'))"
  ```
  and confirm the landing page shows the expected `カテゴリー:` filter chip with a non-zero product count.

## Tips
- Always run `shopify theme check` before committing - it catches syntax errors and best practice violations
- The dev server creates a temporary theme with ID visible in the output (e.g., `preview_theme_id=185110298902`)
- For visual comparison, open the reference design and your preview side-by-side
- Test mobile responsive by using Chrome DevTools device toolbar (F12 → toggle device toolbar)
- Use `ctrl+shift+m` in Chrome DevTools to toggle device toolbar for mobile viewport testing
- Check HTML source with curl when visual elements might not render due to missing data (e.g., `curl -s URL | grep 'class-name'`)
- When a test store has no product data, verify HTML structure via curl and then use a store with real data for visual verification
- Run `shopify theme dev --help` to discover available flags when troubleshooting authentication issues
