# Shared Cart Contract

**Copy this file into BOTH repos.** It is the interface between
www.stayliftd.com (Next.js) and shop.stayliftd.com (Shopify theme).

Neither side may change anything below without changing the other. If you are
an agent working in one repo and something here seems wrong, say so — do not
silently pick a different value. A mismatch here does not throw an error. It
produces two carts that never see each other, which reads like a cookie bug
and costs a day to find.

> Corrected 18 Aug 2026 against production. Three earlier claims were wrong:
> the Next.js route is POST-only (not POST/PUT/DELETE), it takes a product
> `handle` (not a `merchandiseId`), and the canonical Next.js surface is
> `www.stayliftd.com` (the apex 307-redirects to it).

---

## The model

There is **one cart**: a Shopify Storefront API `Cart` object.

Shopify's Ajax/Liquid cart is not used anywhere. `cart.item_count` in Liquid
will always be 0. Anything rendering from the Liquid `cart` object is a bug.

Both surfaces read and write the same Cart, identified by an ID stored in a
cookie scoped to the parent domain.

## The two surfaces speak different dialects — deliberately

Both write the same Cart object, so they interoperate. But their request
shapes are different, and **the theme cannot copy the Next route's request
shape**:

| Surface | Talks to | Line input |
|---|---|---|
| www.stayliftd.com browser JS | Its own BFF at `/api/cart` | product `handle` — the server resolves the variant |
| shop.stayliftd.com theme JS | Storefront API directly | `merchandiseId` (variant GID) |

This is intentional, not an inconsistency to fix. The Next server resolves
handle → variant at request time so no variant ID is ever stored in the
Next repo; the theme has the variant GID in Liquid and talks to Shopify
directly, so it sends the GID.

---

## The Next.js BFF — `/api/cart` on www.stayliftd.com

Canonical host is `www.stayliftd.com`; `stayliftd.com` answers with a 307 to
it. Non-browser clients must call the www host (or follow redirects), or the
POST body may be dropped in transit.

**POST only**, dispatched on an `action` field in the JSON body. There are no
PUT or DELETE handlers. All responses are `{ "cart": Cart | null,
"userErrors": [{ "message": string }] }`, and every response re-sets or
clears the cookie.

### `GET /api/cart`

Returns the cart for the cookie's ID, or `{"cart": null, "userErrors": []}`
when there is no cookie or the cart is completed/expired (the stale cookie is
cleared in the same response).

### `POST /api/cart` — actions

```jsonc
// add — server resolves handle → first variant, creates a cart if needed
{ "action": "add", "handle": "punch", "quantity": 1 }        // quantity optional, default 1

// update — quantity 0 removes the line
{ "action": "update", "lineId": "gid://shopify/CartLine/...", "quantity": 2 }

// remove
{ "action": "remove", "lineId": "gid://shopify/CartLine/..." }
```

Errors: 400 for a malformed body, 502 when Shopify is unreachable, 503 when
the server is missing its Shopify configuration. Business failures (sold out,
inventory caps) are HTTP 200 with a populated `userErrors` array.

---

## Cookie — exact spec

| Field | Value |
|---|---|
| Name | `liftd_cart_id` |
| Domain | `.stayliftd.com` (leading dot — covers www and shop) |
| Path | `/` |
| Max-Age | `2592000` (30 days) |
| SameSite | `Lax` |
| Secure | yes |
| HttpOnly | **no** — theme JS must read it |

`SameSite=Lax` is correct and sufficient: both surfaces are subdomains of one
registrable domain. Do not use `None`.

Do not extend the 30-day max-age. Never store customer data on the cart — a
leaked cart ID exposes cart contents and a usable checkout URL.

---

## API version

`2025-10`

Pinned in **one constant per repo** (here: `lib/shopify/cart-contract.ts`).
Never inlined into a URL string.

Both repos must use the same version. Bump them together, never separately.

---

## Tokens — different per surface, deliberately

| Surface | Context | Token | Header |
|---|---|---|---|
| www.stayliftd.com | Server (`/api/cart`) | **Delegate** | `Shopify-Storefront-Private-Token` |
| shop.stayliftd.com | Browser | **Public** | `X-Shopify-Storefront-Access-Token` |

The server route must also forward the visitor's IP as
`Shopify-Storefront-Buyer-IP`. Without it, Shopify throttles every customer
against one shared bucket keyed to Vercel's egress IPs, and the site fails
under load in a way that looks random.

**The delegate token never reaches the browser.** No `NEXT_PUBLIC_` variant of
it. If the token is public, the BFF is not a security boundary.

Generate the delegate token with `delegateAccessTokenCreate`, not
`storefrontAccessTokenCreate` — that mismatch is the usual cause of 403s.

---

## ID formats

| Thing | Format |
|---|---|
| Variant | `gid://shopify/ProductVariant/123456789` |
| Cart | `gid://shopify/Cart/abc123?key=...` |
| Cart line | `gid://shopify/CartLine/...` |

Liquid gives bare numeric IDs. Convert:
`gid://shopify/ProductVariant/{{ variant.id }}`

---

## Product join key

`handle`. Not variant ID, not product ID.

Handles are permanent: `just-orange`, `grape`, `blue-rizz`, `punch`.
Renaming one in Shopify silently breaks the matching page on stayliftd.com.

The catalog is exactly those four products. There is no 12-pack and no
subscription.

**Never hardcode a variant ID in either repo.** Variant IDs go stale the
moment someone recreates a variant in Shopify, and they fail silently.

---

## Required behaviours

Both sides must implement all four.

### 1. Handle `userErrors`

Shopify returns HTTP 200 with a populated `userErrors` array for unavailable
variants, inventory limits, and invalid lines. Checking only top-level
`errors` makes a failed add look like a success — the drawer opens empty and
the customer sees nothing happen.

Every mutation payload must be checked for `userErrors` before use.

### 2. Handle a null cart

A completed or expired cart returns `cart: null`. Clear the stale cookie and
create a fresh cart on the next write. Without this, a returning customer has
a permanently broken cart with no error message.

### 3. Return the whole cart

Every mutation returns the full cart via a shared fragment. Clients never
reconcile partial state.

### 4. Reconcile on return-to-tab

Refetch the cart on `visibilitychange` and `focus`, debounced ~300ms. This is
what makes a line added on the other surface appear without a reload.

---

## Checkout

Both surfaces: a plain navigation to `cart.checkoutUrl` from the cart object.

Never construct a checkout URL by hand. Never touch payments, tax, or PCI
scope — Shopify owns the transaction.

`shop.stayliftd.com` must be the store's **primary domain** in Shopify, or
`checkoutUrl` renders as `xxxx.myshopify.com` and customers see a stranger's
domain at the payment step. (Confirmed: it is, and `checkoutUrl` resolves to
`shop.stayliftd.com/cart/c/...`.)

---

## Test matrix

Both must pass before either side ships.

| # | Path | Expected |
|---|---|---|
| 1 | Add on www.stayliftd.com → reload | Line persists |
| 2 | Add on shop.stayliftd.com → reload | Line persists |
| 3 | Add on shop → switch tab to www.stayliftd.com | Line appears, no reload |
| 4 | Add on www.stayliftd.com → switch tab to shop | Line appears, no reload |
| 5 | Add same variant on both surfaces | Quantity 2, **not** two lines |
| 6 | Change quantity on one, check the other | Reflects on refocus |
| 7 | Complete checkout → return to either surface | Fresh empty cart, no error |
| 8 | Add a sold-out variant | Visible error message, not silence |

Test 5 is the one that catches a double-cart. Test 7 is the one that catches
missing null handling. Neither fails loudly on its own.
