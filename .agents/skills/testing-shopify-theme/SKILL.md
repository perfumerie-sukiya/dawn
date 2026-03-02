# Shopify Dawn Theme Testing

## Overview
This skill covers how to test Shopify Dawn theme changes locally, including page templates, sections, and visual verification.

## Devin Secrets Needed
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API access token (loaded via `.envrc` / direnv)
- `SHOPIFY_CLI_THEME_TOKEN` - Shopify CLI theme token for dev server authentication
- `SHOPIFY_FLAG_STORE` - Shopify store URL (e.g., `store-name.myshopify.com`)

These are typically configured in the repo's `.envrc` file and loaded automatically by direnv.

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

## Tips
- Always run `shopify theme check` before committing - it catches syntax errors and best practice violations
- The dev server creates a temporary theme with ID visible in the output (e.g., `preview_theme_id=185110298902`)
- For visual comparison, open the reference design and your preview side-by-side
- Test mobile responsive by using Chrome DevTools device toolbar (F12 → toggle device toolbar)
