# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run build` - Build production assets using Webpack
- `npm run prod` - Build production assets with optimization
- `npm run watch` - Watch for changes and rebuild automatically
- `npm test` - Run Jest tests

### Theme Development
- `shopify theme check` - Lint Shopify theme files using Theme Check
- Use Shopify CLI for theme development workflow (serve, publish, deploy)

## Architecture Overview

This is a customized Shopify Dawn theme with extensive brand-specific customizations for beauty/cosmetics brands including CPB, Decorte, and Shiseido.

### Build System
- **Webpack**: Compiles JavaScript and Sass/CSS with source maps in development mode
- **Tailwind CSS**: Used with `tw-` prefix, custom spacing/font scale configured for rem-based design
- **Sass**: Main styling system with component-based architecture in `src/sass/`
- **PostCSS**: Autoprefixer and Tailwind processing

### Key Architectural Patterns

#### Multi-Brand Support
The theme supports multiple beauty brands through template variants:
- Collection templates: `collection.cpb.json`, `collection.decorte.json`, `collection.shiseido.json`
- Brand-specific sections and snippets with consistent naming: `*-cpb.liquid`, `*-decorte.liquid`, etc.
- Brand-specific JavaScript files: `cpb-connect.js`, `shiseido-connect.js`, `counseling-modal-*.js`

#### Zeno Integration
Extensive integration with Zeno page builder:
- `zeno-*.liquid` templates and sections
- Hundreds of individual page snippets: `zeno-page-[ID].liquid`
- Corresponding CSS/JS assets for each Zeno page

#### Template Structure
- **Layout**: Main theme layout in `layout/theme.liquid`, with special Zeno fullscreen variant
- **Sections**: Modular page sections, many with brand-specific variants
- **Snippets**: Reusable components, heavily used for brand customizations
- **Templates**: Page templates with JSON schema configuration

### JavaScript Architecture
- **Entry Point**: `src/index.js` imports CSS and initializes Swiper components
- **Component Pattern**: Individual JS files in `assets/` for specific functionality
- **Swiper Integration**: Configured with Navigation, Pagination, EffectFade, and Autoplay modules
- **Special Handling**: Cart page DOM manipulation for third-party anygift integration

### Styling Architecture
- **Main Styles**: `src/sass/app.scss` imports component styles
- **Component-Based**: Individual Sass files in `src/sass/components/` for brand pages and features
- **Tailwind Integration**: Custom configuration with rem-based scaling
- **CSS Output**: Compiled to `assets/main.css` via Webpack

### Brand-Specific Features
- **CPB**: Story pages, connection integration, specialized navigation
- **Decorte**: Similar brand page structure with unique styling
- **Shiseido**: Connection features and specialized modals
- **Counseling Modals**: Brand-specific customer interaction features

### Testing
- **Jest**: Testing framework with jsdom environment
- **Line Login**: Specific testing for LINE authentication integration
- **Mocking**: localStorage and DOM element mocking for browser APIs

### Development Notes
- Theme follows Shopify's Dawn principles: HTML-first, progressive enhancement
- Extensive Japanese localization support
- Integration with external services (LINE, anygift, brand-specific APIs)
- Performance-focused with deferred script loading