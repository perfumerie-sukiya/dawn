# Repository Guidelines

## Project Structure & Module Organization
- `layout/`, `templates/`, `sections/`, `snippets/`: Shopify theme structure (Liquid + JSON templates).
- `assets/`: compiled theme assets plus brand- and page-specific JS/CSS.
- `src/`: source JS/Sass/Tailwind (`src/index.js`, `src/sass/`, `src/css/`).
- `config/` and `locales/`: theme settings and translations.
- `test/`: Jest tests (e.g., `test/line-login.test.js`).
- `scripts/` and `docs/`: project utilities and documentation.

## Build, Test, and Development Commands
- `npm run build` — build assets with Webpack (development defaults).
- `npm run prod` — production build with optimizations.
- `npm run watch` — rebuild on file changes.
- `npm test` — run Jest test suite.
- `shopify theme check` — lint Liquid/theme files via Theme Check.

## Coding Style & Naming Conventions
- Indentation: 4 spaces by default; 2 spaces for `.liquid`, `.js`, and `.html` (see `.editorconfig`).
- Prettier: `printWidth` 120, single quotes in JS; Liquid uses double quotes (`.prettierrc.json`).
- Tailwind: uses a `tw-` prefix for utilities.
- Brand-specific files follow suffixes like `*-cpb.liquid`, `*-decorte.liquid`, `*-shiseido.liquid` and related JS (e.g., `cpb-connect.js`).
- Zeno pages use `zeno-page-[ID].liquid` and related assets.

## Testing Guidelines
- Framework: Jest with `jsdom` environment.
- Location and naming: `test/*.test.js`.
- Expectation: add or update tests for behavior changes; no explicit coverage target defined.

## Commit & Pull Request Guidelines
- Commit messages are short, sentence-case, and verb-led (e.g., “Add …”, “Remove …”, “Update from Shopify …”).
- PRs should include: a concise summary, linked issue/ticket if applicable, and screenshots for UI changes.
- Before opening a PR, run relevant checks (`npm test`, `npm run build`, `shopify theme check`).
- If using GitHub CLI, write PR bodies to a temp file and pass it via `gh pr create --body-file` (or `gh pr edit --body-file`), then delete the temp file.

## Architecture Notes
- Multi-brand variants are implemented via template/section/snippet variants per brand.
- The theme favors progressive enhancement (HTML-first, JS as needed) and server-rendered Liquid.
