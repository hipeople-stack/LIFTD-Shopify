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

1. **Products** — eight products, one 4-pack variant each: four flavours in
   5MG (`just-orange`, `grape`, `blue-rizz`, `punch`) and 10MG
   (`just-orange-4-pack-10mg-thc`, `grape-4-pack-10mg-thc`,
   `blue-rizz-4-pack-10mg-thc`, `punch-4-pack-10mg-thc`).
2. **Metafields (optional)** — flavour world and strength are read from the
   handle. To override, set `custom.flavour_world` (`just-orange` / `grape`
   / `blue-rizz` / `punch`) or `custom.strength` (`5mg` / `10mg`) on a
   product; the metafield wins.
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
- Approved product facts only: `5mg THC + 5mg CBG per 12oz can` (5MG),
  `10mg THC + 10mg CBG per 12oz can` (10MG), `Hemp-derived THC`,
  `21+ only`, `Zero alcohol`, `80 calories`. The launch formula,
  `3mg THC + 9mg CBG`, is retired — history only. Onset time is still
  **unresolved** — do not state it anywhere.
- Never state shipping availability without the state-law qualifier.
- Reduced motion support is required, not optional.
