# Repository Guidelines

## Theme Conventions
- Favor server-rendered Liquid and progressive enhancement (HTML first, JS as needed).
- Brand variants use template/section/snippet suffixes such as `*-cpb`, `*-decorte`, and `*-shiseido`; follow the relevant brand's existing pattern.
- `src/` contains build sources; `assets/` contains both compiled output and standalone brand/page assets. Check how an asset is produced before editing it.
- Tailwind utilities use the `tw-` prefix. Formatting is defined in `.editorconfig` and `.prettierrc.json`.
- Zeno pages use `zeno-page-[ID].liquid` and related assets.

## Build, Test, and Development Commands
- `npm run build` — build assets with Webpack (development defaults).
- `npm run prod` — production build with optimizations.
- `npm run watch` — rebuild on file changes.
- `npm test` — run Jest test suite.
- `shopify theme check` — lint Liquid/theme files via Theme Check.
- Frontend changes must always be followed by `npm run build` before handing work back.

## Validation and Preview
- Add or update `test/*.test.js` for behavior changes (Jest with jsdom).
- Before opening a PR, run the relevant checks listed above. After they pass, repeat only when further changes or failures require it.
- Run preview commands from the current checkout using the intended store's current authentication settings. `shopify theme dev` uploads files to a development theme on that store.
- Page template assignment is a store-level content change, separate from theme preview. Change it only on a test store/page within the authorized scope; a development theme does not make a production page assignment temporary.
- Standalone HTML can verify static appearance, but does not verify Liquid, Shopify data, or storefront behavior. Report which checks passed and any unverified behavior.

- For brand collection changes, verify both the unfiltered brand top and tag-filtered category views. Empty test collections cannot verify populated product grids.
- Theme access credentials and storefront passwords are distinct. For authentication issues, check current `shopify theme dev --help` and the intended store's configuration.

## Commit & Pull Request Guidelines
- Commit messages are short, sentence-case, and verb-led (e.g., “Add …”, “Remove …”, “Update from Shopify …”).
- PRs should include: a concise summary, linked issue/ticket if applicable, and screenshots for UI changes.
- If using GitHub CLI, write PR bodies to a temp file and pass it via `gh pr create --body-file` (or `gh pr edit --body-file`), then delete the temp file.
