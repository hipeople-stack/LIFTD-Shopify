# LIFTD Shopify Theme

Custom Shopify theme for LIFTD, a hemp-derived THC beverage brand. The
storefront lives at **shop.stayliftd.com** and must look like
**stayliftd.com** — not like a Shopify theme.

Design source of truth: **LIFTD Brand Guidelines v1.0**, distilled into
[`CLAUDE.md`](CLAUDE.md). Read that file before touching anything —
it carries the compliance non-negotiables.

## Stack

- Built from Shopify's Skeleton theme structure (Online Store 2.0: JSON
  templates, section groups, theme blocks).
- `assets/liftd.css` is the single source of design tokens. No inline hex
  values in sections or snippets.
- **Shared Storefront API cart** with stayliftd.com via the `liftd_cart_id`
  cookie on `.stayliftd.com` — see `CART_CONTRACT.md`. Enabled by the
  "Storefront public access token" theme setting; with no token set the theme
  falls back to the standalone native Liquid/Ajax cart.
- Fonts are self-hosted in `assets/` (Anton + Archivo + Inter, all OFL,
  latin subsets, upright cuts only — the brand oblique is synthetic).

## Store setup (one-time, Shopify admin)

1. **Products** — four products, one variant each (`Pack Size: 4-Pack`):
   `just-orange`, `grape`, `blue-rizz`, `punch`.
2. **Metafield** — create a product metafield definition
   `custom.flavour_world` (single line text) and set it per product to the
   handle values above. It drives the flavour-world takeovers everywhere.
3. **Menus** — `main-menu` (header) and `footer` (footer shop links); add a
   legal menu and assign it in the footer section if wanted.
4. **Age gate** — install AgeChecker (app). The theme ships a clean mount
   point (`#age-gate-mount` in `layout/theme.liquid`) and no age gate UI of
   its own.
5. **Payments / shipping** — Bankful and Shippo are Shopify-side config,
   not theme concerns.

## Commands

```bash
shopify theme dev          # local dev with hot reload
shopify theme check        # lint — run before every commit
shopify theme push --unpublished
```

## Compliance (short version — full version in CLAUDE.md)

- The compliance block renders from `layout/theme.liquid` on every page and
  is not editable or removable from the customizer. Keep it that way.
- Approved product facts only: `3mg THC + 9mg CBG per 12oz can`,
  `Hemp-derived THC`, `21+ only`, `Zero alcohol`. Calories and onset time
  are **unresolved** — do not add them anywhere.
- Never state shipping availability without the state-law qualifier.
- Reduced motion support is required, not optional.
