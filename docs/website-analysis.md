# LIFTD storefront — website analysis

**Date:** 2026-08-18
**Scope:** Full audit of the theme source in this repository (every layout,
section, snippet, template, asset, and locale file) against the LIFTD brand
rules and compliance non-negotiables in `CLAUDE.md`, plus WCAG contrast math
and a `shopify theme check` lint pass.

> **Note on method:** outbound network access to `stayliftd.com` and
> `shop.stayliftd.com` is blocked from this environment, so the live pages
> could not be fetched. This analysis covers the website as built in this
> repo — which is the storefront's source of truth. A visual cross-check
> against the live primary site should be re-run from an environment with
> network access to those domains.

---

## Verdict

The theme is in strong shape. Token discipline is real (no stray hex values
outside `liftd.css`), the locked product facts are hardcoded where it counts,
reduced motion is handled correctly, the synthetic-oblique typography rules
are followed, and `shopify theme check` passes with **zero offenses across
60 files**. Voice in the shipped copy is on-brand throughout.

Two findings are serious enough to fix before launch (compliance block
missing on the gift-card page; illegible small text in the Blue Rizz and
Punch worlds). The rest are medium/low polish items.

---

## 1. Compliance non-negotiables — audit results

| # | Rule | Status |
|---|---|---|
| 1 | Compliance block on every page | ❌ **Fails on the gift-card page** (see F1) |
| 2 | Only approved product facts | ⚠️ Two homepage copy items to review (F3) |
| 3 | No therapeutic claims / wellness register | ✅ Clean — grep for *journey, ritual, mindful, wellness, self-care, elevate, may help, could support* returns only the guardrail comments |
| 4 | Shipping never stated without state-law qualifier | ✅ Qualifier present in the compliance block, the cart tax/shipping note, and the FAQ answer |
| 5 | No driving/machinery/pregnancy depiction, no under-21 targeting | ✅ Warning text present; no imagery in the theme itself |
| 6 | Reduced motion | ✅ Correct — global duration kill plus explicit `.liftd-reveal { animation: none; opacity: 1; transform: none }` |

Also verified: **no unresolved numbers anywhere** (no calories, no onset
times, no 80/80-100/10-15/15-30), and the **retired palette is absent**
(`#EBFF7A`, `#FF0000`, legacy `--liftd-*` tokens: zero hits).

---

## 2. Findings

### F1 — HIGH · Gift-card page has no compliance block
`templates/gift_card.liquid` declares `{% layout none %}` and builds its own
HTML document, but never renders `snippets/liftd-compliance-footer.liquid`.
Non-negotiable #1 says the block renders on **every** page, and gift-card
recipients land on this page directly from Shopify's email — it is a real
customer-facing page for a THC product with no 21+ notice, no THC warning,
and no FDA disclaimer. (`layout/password.liquid`, the other standalone
layout, does render it — this one was just missed.)
**Fix:** add `{% render 'liftd-compliance-footer' %}` before `</body>`.

### F2 — HIGH · Body-size text on the ground in Blue Rizz and Punch worlds
The brand rule (and CLAUDE.md) locks Blue Rizz (4.24:1) and Punch (3.34:1)
to **display sizes only** — body copy must sit on a cream panel. The cream
panel exists (`.liftd-copy`) and the product *description* uses it, but
several body-size elements render in world ink directly on the world ground
when `data-liftd-world` is `blue-rizz` or `punch`:

- **Product page** (`sections/main-product.liquid`): the approved-facts
  pills (0.7rem), the price (1.05rem), the add-to-cart status line (1rem),
  and the variant eyebrow (0.7rem).
- **Flavour cards** (`snippets/liftd-product-card.liquid`): the tagline
  eyebrow (0.7rem), the price (1.05rem), and the "Shop now" chip (0.7rem).

Verified ratios: Punch 3.34:1 fails WCAG AA at any text size below the
large-text threshold; Blue Rizz 4.24:1 fails AA for non-large text. The
card *titles* are fine (24px+). This breaks both WCAG AA and the theme's
own locked-pair rule.
**Fix options:** put the pills/price/meta rows on the cream panel in those
two worlds (a `.liftd-copy`-style treatment scoped with the same
`[data-liftd-world='blue-rizz'], [data-liftd-world='punch']` selectors the
CSS already uses), or bump those elements to the display threshold.

### F3 — MEDIUM · Homepage copy states product facts outside the approved list
`templates/index.json` ships two lines worth a legal/copy review against
non-negotiable #2 ("never state a product fact that isn't in the approved
list"):

- Story body: *"…crisp carbonation, **real cane sugar**, so you actually
  taste it."* — an ingredient claim that is not on the approved list.
  (`blocks/text.liquid` carries the same line as its schema default.)
- Story heading: *"One drains you. **One hydrates you.**"* — a functional
  benefit claim. It skirts the anti-wellness rule's spirit; "Highdration"
  is an owned brand word, but "hydrates you" is a plain product-effect
  statement.

These may well be approved brand copy lifted from stayliftd.com — but the
approved list in CLAUDE.md doesn't include them, so they should be either
confirmed and added to the approved list, or reworded.

### F4 — MEDIUM · Interactive `.liftd-chip` elements miss the 44px touch target
`.liftd-chip` (padding `0.3rem 0.7rem`, ~26px tall, no `min-height`) is
used as a **link/button** in several places, violating the locked 44px
minimum touch target:

- Cart line "Remove" link (`sections/main-cart.liquid`)
- "Forgot password?" / "Create account" (`sections/main-login.liquid`)
- "Addresses" / "Log out" (`sections/main-account.liquid`)
- Address "Delete" button (`sections/main-addresses.liquid`)

The chip was designed as a static badge (it has no hover/active states).
**Fix:** give interactive chips `min-height: var(--touch-target)` +
`display: inline-flex; align-items: center` (or use `.liftd-btn` at a
small scale for these).

### F5 — MEDIUM · Stamped hero button shadows are invisible on the ink hero
`.liftd-btn--stamped` hardcodes its shadow to `var(--ink)`, and the hero
section is ink-grounded — so the 7px stamped shadow is invisible, and the
signature press interaction ("the element travels into its shadow") reads
as plain movement. Worse, the secondary stamped button's border is
`currentColor` (paper) while its shadow is ink, breaking the component
rule that *"the shadow is a flat duplicate of the border colour."*
**Fix:** on the ink ground, shadow the stamped buttons in a visible colour
that duplicates their border (paper for the secondary; for the pink
primary, its ink border argues for an offset ground treatment — e.g. shadow
in pink or paper — a deliberate design call to make).

### F6 — MEDIUM · No way to reach search; no address editing
- A full search page exists (`templates/search.json`, `sections/main-search.liquid`)
  but nothing links to it — no header icon, no footer link. Dead feature
  unless a merchant adds a manual menu link.
- `sections/main-addresses.liquid` supports add and delete but not **edit**;
  fixing a typo means delete + re-add. Shopify's `customer_address` form
  supports editing an existing address.

### F7 — LOW · Assorted polish
- **Focus ring on cream:** the pink ring measures **1.82:1** on paper
  ground — far below the 3:1 non-text contrast minimum. The CSS comment
  acknowledges this is a brand-spec trade-off (and correctly falls back to
  ink on pink buttons); consider extending the ink fallback to
  paper-grounded sections.
- **Reduced-motion strips the badge's static tilt:** the hero badge carries
  both `liftd-hero__badge` (static `rotate(-2deg)`) and `liftd-reveal`; the
  reduced-motion rule's `transform: none !important` removes the intentional
  static rotation. Scope the reset to the animated transform instead.
- **Logo SVG a11y:** `snippets/liftd-logo.liquid` sets both `role="img"`
  and `aria-hidden="true"` (contradictory), and the header link stacks an
  `aria-label` on top of a visually-hidden shop-name span — triple naming.
  Harmless, but one accessible name is enough.
- **Card titles are italic:** `.liftd-product-card__title` is Archivo 900
  *italic* up to 2rem; the brand table specs card titles as **upright**
  1.25–1.5rem. If the flavour cards are deliberately display-treated, fine —
  otherwise drop the italic.
- **Country select default:** `data-default` is emitted on the addresses
  country `<select>` but no JS consumes it, so the default country never
  pre-selects.
- **Mobile nav requires JS:** the hamburger toggle has no no-JS fallback
  (the Ajax cart degrades correctly; the nav doesn't).
- **Head polish:** no favicon setting and no `theme-color` meta;
  `og:image` renders only when `page_image` exists (fine, Dawn-style
  `http:`/`https:` prefixes are correct for Shopify's protocol-relative
  URLs).

---

## 3. What's working well

- **Token discipline holds.** Every colour in sections/snippets flows from
  `--world-bg` / `--world-ink` or a spine token; the only hex values outside
  `liftd.css` are none — verified by grep. Inline styles are spacing-only.
- **The compliance architecture is right.** The block renders from
  `layout/theme.liquid` (not a section group), with locked wording matching
  the approved list exactly; `facts-strip` and the product-page pills
  hardcode facts with **no free-text settings**, so the customizer can't
  introduce unapproved numbers. Editable text settings that could carry
  claims (announcement bar, FAQ answers) carry warning `info` text.
- **Typography rules are implemented faithfully.** No italic cuts loaded;
  Anton at 400 only with `font-synthesis-weight: none`; one Anton
  `.liftd-title` per template (checked all 20 templates — the stayliftd.com
  `/order` double-display defect is not reproduced); Archivo obliques are
  synthetic as specced; fonts self-hosted and preloaded.
- **Reduced motion is genuinely safe.** Reveals resolve to
  `opacity: 1; transform: none`; scroll-timeline reveals are wrapped in
  `@supports` with a keyframe fallback, so content never depends on motion.
- **Cart is native Liquid/Ajax with honest progressive enhancement** — every
  mutation works as a plain form post without JS, and the Ajax layer only
  decorates it. No Storefront API, per the integration plan.
- **Scope discipline:** no variant pickers, no filtering, no age-gate UI
  (clean `#age-gate-mount` left in the layout), no subscription logic —
  matching the out-of-scope list.
- **Contrast math checks out** for the locked pairs (5.04 / 7.88 / 4.24 /
  3.34 — matching the brand table) and the placeholder colour (6.62:1,
  real hex, no opacity).
- **Voice:** shipped copy is short, certain, sensory-first
  ("Tastes like then. Hits like now.", "Your cart is empty. Fix that.",
  "That page is gone. The flavor isn't."), with no hedging anywhere.

---

## 4. Recommended fix order

1. **F1** — one-line fix, regulatory exposure. Do first.
2. **F2** — CSS-only fix, WCAG failure on two of four product pages.
3. **F4** — small CSS fix, systemic touch-target failure.
4. **F3** — needs a human call (legal/brand), not a code change.
5. **F5, F6, F7** — batch into a polish pass.

`shopify theme check`: ✅ 60 files, 0 offenses (2026-08-18).
