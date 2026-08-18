# LIFTD Shopify Theme

Custom Shopify theme for LIFTD, a hemp-derived THC beverage brand.
Built from Shopify's Skeleton theme. Storefront lives at shop.stayliftd.com.
The brand's primary site is stayliftd.com (Next.js on Vercel) — this theme
must look like it, not like a Shopify theme.

Source of truth for design: LIFTD Brand Guidelines v1.0. The rules below are
extracted from it. Where this file and your instinct disagree, this file wins.

---

## Catalog

Four products, one per flavour, one variant each ("Pack Size: 4-Pack").

| Handle | Flavour | Metafield `custom.flavour_world` |
|---|---|---|
| `just-orange` | Just Orange | `just-orange` |
| `grape` | Grape | `grape` |
| `blue-rizz` | Blue Rizz | `blue-rizz` |
| `punch` | Punch | `punch` |

There is no variant picker, no faceted filtering, no size selector. Do not
build them. If the catalog grows, we add them then.

---

## Non-negotiables

These are compliance and accessibility requirements, not style preferences.
Never "improve" them, never make them quieter, never move them below the fold.

1. **The compliance block renders on every page.** Rendered from
   `layout/theme.liquid`, not from an editable section group — it must not be
   removable from the customizer. See `snippets/liftd-compliance-footer.liquid`.
2. **Never state a product fact that isn't in the approved list below.**
   Unapproved numbers on a live page are a regulatory problem, not a copy bug.
   Approved and locked:
   - `3mg THC + 9mg CBG per 12oz can`
   - `Hemp-derived THC`
   - `21+ only`
   - `Zero alcohol`

   UNRESOLVED — do not put these anywhere until told they are resolved:
   - Calories (site says 80, FAQ says "approximately 80-100")
   - Onset time (homepage says 10-15 min, FAQ says 15-30 min)
   - THC source phrasing (FAQ contradicts "hemp-derived" elsewhere)
3. **Never make a therapeutic claim.** No treatment, cure, prevention,
   diagnosis, health-supplement or recovery framing. No wellness register:
   avoid *journey, ritual, mindful, wellness, self-care, elevate*.
4. **Never state shipping availability without the state-law qualifier.**
5. **Never depict consumption alongside driving, machinery, or pregnancy.**
   Never target, or appear to target, anyone under 21.
6. **Reduced motion is required.** Every animated element must resolve to
   `opacity: 1; transform: none` under `prefers-reduced-motion: reduce`.
   Content must never depend on motion to become visible.

---

## Colour

Three constants carry every surface. Over them, four flavour worlds take over
entire sections — background and ink together, never separated.

### Spine

| Token | Hex | Role |
|---|---|---|
| Ink | `#0D0D10` | Primary ground |
| Paper | `#FBF7EF` | Warm cream |
| Pink | `#FF9BCA` | Sole accent |

### Worlds — locked background/ink pairs

| World | Background | Ink | Contrast | Permitted use |
|---|---|---|---|---|
| `just-orange` | `#FF6A1A` | `#252060` | 5.04:1 | Any text size |
| `grape` | `#6422A5` | `#D6FF3D` | 7.88:1 | Any text size |
| `blue-rizz` | `#1642BD` | `#FF9BCA` | 4.24:1 | **Display only** — 24px+, or bold 19px+ |
| `punch` | `#C44AE0` | `#611126` | 3.34:1 | **Display only** — 24px+, or bold 19px+ |

### Rules

- The ink is part of the colour, not a choice. Never substitute it. Cream on
  Orange measures 2.68:1 and ink on Grape 2.14:1 — both fail.
- In Blue Rizz and Punch, body-size copy goes on a cream panel (`.liftd-copy`),
  never directly on the ground. This is handled in `liftd.css`; use the class.
- Pink is the only accent. Never introduce a second.
- **Retired palette — never use:** `#EBFF7A` (volt green), `#FF0000`, or any
  `liftd-*` legacy token. If you find these anywhere, they are bugs.
- A world takes a whole section edge-to-edge. The device is the takeover, not
  an accent stripe.

Drive worlds with `data-liftd-world="{{ product.metafields.custom.flavour_world }}"`
on a section wrapper. Nothing downstream needs to know which flavour it is.

---

## Typography

Three faces, three jobs. The oblique slant is the brand's single strongest
signal — drop it and the identity goes with it.

| Role | Face | Size | Treatment |
|---|---|---|---|
| Page title | Anton 400 | `clamp(3rem, 8vw, 7rem)` | italic, uppercase, -0.02em, lh .9 |
| Section headline | Archivo 800 | `clamp(2.6rem, 7.5vw, 6.5rem)` | italic, uppercase, -0.035em, lh .91 |
| Card title / subhead | Archivo 900 | 1.25–1.5rem | upright, uppercase |
| Eyebrow / label | Archivo 800 | 0.7rem | uppercase, +0.18em tracking |
| Button | Archivo 800 | 0.8rem | uppercase, +0.03em tracking |
| Lead paragraph | Inter 600 | `clamp(1rem, 2vw, 1.3rem)` | lh 1.6, max 42rem |
| Body | Inter 400–500 | 1rem | lh 1.6, max 68ch |

### Rules

- **The slant is synthetic.** Anton has no italic cut; Archivo is loaded
  `font-style: normal` only. Every oblique is a browser-synthesised skew.
  Never load a true italic — Archivo's real italic has different letterforms
  and will not match stayliftd.com.
- **Never apply a font-weight to Anton.** It is loaded at 400 only; setting 700
  produces a faux bold. `font-synthesis-weight: none` enforces this in CSS —
  don't remove it.
- **One Anton page title per page.** Everything below it is Archivo 800 italic.
  Two display faces at near-identical size reads as inconsistency, not
  hierarchy. This is a known defect on stayliftd.com's `/order`; don't
  reproduce it.
- Fonts are self-hosted in `assets/` (Anton and Archivo are OFL). Do not use
  Shopify's font picker — it carries neither face.

---

## Components

Every interactive surface is bordered and offset. No blur, no gradient, no soft
elevation. The shadow is a flat duplicate of the border colour.

| Token | Value | Applied to |
|---|---|---|
| Shadow — large | `8px 8px 0` | Hero badge, comparison board |
| Shadow — stamped | `7px 7px 0` | Hero buttons |
| Shadow — small | `4px 4px 0` | Pills, labels, list items |
| Border — heavy | `3px solid` | Flavour cards, comparison board |
| Border — standard | `2px solid` | Buttons, pills, inputs, cards |
| Radius — pill | `999px` | Buttons, tags, filter chips |
| Radius — card | `0.75–1rem` | Cards, panels |
| Radius — chip | `0.35–0.55rem` | Pills, badges, labels |
| Min touch target | `44px` | Every interactive element |
| Section rhythm | `clamp(5rem, 10vw, 9rem)` | Vertical padding |
| Content width | `min(100% - 2.5rem, 80rem)` | Standard wrapper |
| Focus ring | `3px solid #FF9BCA`, offset `4px` | All focusable elements |

Stamped buttons are **hero only**. Press feedback: the element travels into its
shadow — `translate(7px, 7px)` against a `7px` offset, shadow collapsing to
zero. Hover lifts 2px. Nothing shrinks on press.

Never set placeholder text with opacity. Use a real hex at 4.5:1 minimum.

---

## Motion

Motion overshoots and settles, like something pressed into place. Nothing eases
politely in.

| Purpose | Curve | Duration |
|---|---|---|
| Signature (stamps, pops, entrances) | `cubic-bezier(.16, 1.2, .3, 1)` | 450–800ms |
| Interaction feedback | `cubic-bezier(.2, .8, .2, 1)` | 140–200ms |
| Flavour world change | `cubic-bezier(.4, 0, .2, 1)` | 600ms |
| Ambient loops | — | 3–6s |

Scroll reveals use `animation-timeline: view()`, range `entry 8%` → `cover 28%`,
siblings staggered 65–80ms.

---

## Voice

Short. Certain. Never earnest.

- Short declaratives. Full stops over commas. *"Tastes like then. Hits like now."*
- Lead with the sensory claim, follow with the spec. Flavour first, milligrams second.
- Own the invented words — **Highdration**, **Blue Rizz** — spelled consistently.
- Address the reader directly.
- Nostalgic, not childish. Adult, loud, confident. Never cartoon, never cute.
- Anti-wellness. LIFTD is the alternative to a beer, not to a green juice.
- No hedging: no "may help", "could support", "we think".
- Don't over-explain the cannabinoid science. Three sentences, then stop.

---

## Architecture

```
assets/       liftd.css (primary stylesheet), fonts, JS
blocks/       reusable nestable UI components
config/       settings_schema.json, settings_data.json
layout/       theme.liquid
locales/      en.default.json
sections/     full-width page components
snippets/     reusable fragments
templates/    JSON templates per page type
```

- `assets/liftd.css` is the single source of design tokens. Add tokens there,
  never inline hex values in a section or snippet.
- Keep sections dumb. Colour comes from `data-liftd-world`, type from the
  `.liftd-*` classes. A section should not know a hex value.
- Cart is the **shared Storefront API cart** defined in `CART_CONTRACT.md` —
  one Cart object shared with stayliftd.com via the `liftd_cart_id` cookie on
  `.stayliftd.com`. `assets/liftd.js` owns it: it intercepts add-to-cart,
  keeps `[data-cart-count]` in sync, and renders `/cart` from the shared cart.
  It activates only when the "Storefront public access token" theme setting is
  filled; without it the theme falls back to the native Liquid/Ajax cart so
  the storefront still sells standalone. (An earlier version of this file
  forbade the Storefront cart — that decision was reversed on 18 Aug 2026 at
  the owner's request; the two surfaces were shipping two carts that never saw
  each other.) The Liquid `cart` object is always empty in shared mode —
  anything rendering from it outside the native fallback is a bug.

---

## Commands

```bash
shopify theme dev          # local dev with hot reload
shopify theme check        # lint — run before every commit
shopify theme push --unpublished
```

Run `shopify theme check` before committing. It catches Liquid errors and
accessibility issues that don't surface until a customer hits them.

---

## Out of scope

Don't build these unless asked:

- Variant pickers, filtering, faceted search
- Age gate UI (AgeChecker is an app install — leave a clean mount point)
- Payment or shipping logic (Bankful and Shippo are Shopify-side config)
- Subscription or bundle logic
