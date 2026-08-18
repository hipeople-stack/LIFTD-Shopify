/* LIFTD theme JS.

   Cart model (see CART_CONTRACT.md): there is ONE cart — a Storefront API
   Cart shared with stayliftd.com via the `liftd_cart_id` cookie on
   `.stayliftd.com`. When the public Storefront token is configured in theme
   settings, this file runs the shared cart: it intercepts add-to-cart,
   keeps the header count in sync, and renders /cart from the shared cart.

   When the token is NOT configured, everything below degrades to the native
   Liquid/Ajax cart so the storefront still sells on its own. Everything
   degrades further to plain form posts without JS. */
(function () {
  'use strict';

  var CART_COUNT_SELECTOR = '[data-cart-count]';
  var config = window.LIFTD_SHARED_CART || {};
  var SHARED = Boolean(config.token);

  function updateCartCount(count) {
    document.querySelectorAll(CART_COUNT_SELECTOR).forEach(function (el) {
      el.textContent = count;
      el.toggleAttribute('hidden', count === 0);
    });
  }

  /* ------------------------------------------------------------------
     Header menu toggle
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-menu-toggle]');
    if (!toggle) return;
    var nav = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!nav) return;
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ------------------------------------------------------------------
     Quantity steppers (product + cart)
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (event) {
    var step = event.target.closest('[data-qty-step]');
    if (!step) return;
    var input = step.parentElement.querySelector('input[type="number"]');
    if (!input) return;
    var next =
      (parseInt(input.value, 10) || 0) +
      (step.getAttribute('data-qty-step') === 'up' ? 1 : -1);
    var min = parseInt(input.min, 10) || 0;
    if (next < min) next = min;
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ==================================================================
     SHARED CART — Storefront API cart via the `liftd_cart_id` cookie
     ================================================================== */

  var COOKIE_NAME = 'liftd_cart_id';
  var COOKIE_ATTRS = '; Domain=.stayliftd.com; Path=/; SameSite=Lax; Secure';

  function readCartId() {
    var match = document.cookie.match(
      new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  }
  function writeCartId(id) {
    document.cookie =
      COOKIE_NAME + '=' + encodeURIComponent(id) + COOKIE_ATTRS + '; Max-Age=2592000';
  }
  function clearCartId() {
    document.cookie = COOKIE_NAME + '=' + COOKIE_ATTRS + '; Max-Age=0';
  }

  var CART_FRAGMENT =
    'fragment CartFields on Cart { id checkoutUrl totalQuantity' +
    ' cost { subtotalAmount { amount currencyCode } }' +
    ' lines(first: 100) { nodes { id quantity' +
    '  cost { totalAmount { amount currencyCode } }' +
    '  merchandise { ... on ProductVariant { id title' +
    '   product { handle title featuredImage { url altText } } } } } } }';

  function gql(query, variables) {
    return fetch('/api/' + config.apiVersion + '/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': config.token
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Storefront API ' + response.status);
        return response.json();
      })
      .then(function (json) {
        if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
        return json.data;
      });
  }

  /* Every mutation returns the whole cart and is checked for userErrors.
     A null cart means completed/expired — clear the stale cookie so the
     next write starts a fresh cart. */
  function toPayload(node) {
    var cart = (node && node.cart) || null;
    if (cart) writeCartId(cart.id);
    else clearCartId();
    return { cart: cart, userErrors: (node && node.userErrors) || [] };
  }

  function sharedFetchCart() {
    var id = readCartId();
    if (!id) return Promise.resolve({ cart: null, userErrors: [] });
    return gql(
      'query($id: ID!) { cart(id: $id) { ...CartFields } } ' + CART_FRAGMENT,
      { id: id }
    ).then(function (data) {
      return toPayload({ cart: data.cart, userErrors: [] });
    });
  }

  function sharedCartCreate(lines) {
    return gql(
      'mutation($lines: [CartLineInput!]!) { cartCreate(input: { lines: $lines }) {' +
        ' cart { ...CartFields } userErrors { message } } } ' + CART_FRAGMENT,
      { lines: lines }
    ).then(function (data) {
      return toPayload(data.cartCreate);
    });
  }

  function sharedLinesAdd(lines) {
    var id = readCartId();
    if (!id) return sharedCartCreate(lines);
    return gql(
      'mutation($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) {' +
        ' cart { ...CartFields } userErrors { message } } } ' + CART_FRAGMENT,
      { cartId: id, lines: lines }
    ).then(function (payload) {
      payload = toPayload(payload.cartLinesAdd);
      // Stale cookie pointed at a completed or expired cart — start fresh.
      if (!payload.cart) return sharedCartCreate(lines);
      return payload;
    });
  }

  function sharedLinesUpdate(lineId, quantity) {
    var id = readCartId();
    if (!id) return Promise.resolve({ cart: null, userErrors: [] });
    if (quantity < 1) return sharedLinesRemove(lineId);
    return gql(
      'mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) {' +
        ' cart { ...CartFields } userErrors { message } } } ' + CART_FRAGMENT,
      { cartId: id, lines: [{ id: lineId, quantity: quantity }] }
    ).then(function (data) {
      return toPayload(data.cartLinesUpdate);
    });
  }

  function sharedLinesRemove(lineId) {
    var id = readCartId();
    if (!id) return Promise.resolve({ cart: null, userErrors: [] });
    return gql(
      'mutation($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {' +
        ' cart { ...CartFields } userErrors { message } } } ' + CART_FRAGMENT,
      { cartId: id, lineIds: [lineId] }
    ).then(function (data) {
      return toPayload(data.cartLinesRemove);
    });
  }

  function money(amount) {
    var value = parseFloat(amount.amount);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: amount.currencyCode,
        minimumFractionDigits: value % 1 === 0 ? 0 : 2
      }).format(value);
    } catch (error) {
      return '$' + amount.amount;
    }
  }

  function imageUrl(url, width) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
  }

  /* ---------- shared cart page (/cart) ----------
     The Liquid cart is always empty in shared mode, so the section's
     [data-shared-cart] container renders the shared cart instead, reusing
     the theme's own classes. Strings come from data attributes so they stay
     translatable through the locale files. */

  function sharedRoot() {
    return document.querySelector('[data-shared-cart]');
  }

  function renderSharedCart(cart) {
    var root = sharedRoot();
    if (!root) return;
    var native = document.querySelector('[data-native-cart]');
    if (native) native.setAttribute('hidden', '');
    root.removeAttribute('hidden');

    var t = {
      empty: root.getAttribute('data-text-empty') || 'Your cart is empty.',
      continueShopping: root.getAttribute('data-text-continue') || 'Continue shopping',
      continueUrl: root.getAttribute('data-continue-url') || '/collections/all',
      subtotal: root.getAttribute('data-text-subtotal') || 'Subtotal',
      note: root.getAttribute('data-text-note') || '',
      checkout: root.getAttribute('data-text-checkout') || 'Checkout',
      remove: root.getAttribute('data-text-remove') || 'Remove',
      decrease: root.getAttribute('data-text-decrease') || 'Decrease quantity',
      increase: root.getAttribute('data-text-increase') || 'Increase quantity'
    };

    var lines = cart ? cart.lines.nodes : [];
    var html = '';

    if (!lines.length) {
      html =
        '<div class="liftd-empty">' +
        '<p class="liftd-lead">' + t.empty + '</p>' +
        '<a href="' + t.continueUrl + '" class="liftd-btn liftd-btn--pink">' +
        t.continueShopping + '</a></div>';
    } else {
      html += '<div role="list">';
      lines.forEach(function (line, index) {
        var product = line.merchandise.product;
        var image = product.featuredImage;
        var productUrl = '/products/' + product.handle;
        html +=
          '<div class="liftd-cart-line" role="listitem">' +
          '<div class="liftd-cart-line__media">' +
          (image
            ? '<a href="' + productUrl + '"><img src="' + imageUrl(image.url, 240) +
              '" alt="' + (image.altText || product.title) + '" width="120" height="120" loading="lazy"></a>'
            : '') +
          '</div>' +
          '<div>' +
          '<p class="liftd-subhead" style="font-size: 1.05rem;">' +
          '<a href="' + productUrl + '" style="text-decoration: none;">' + product.title + '</a></p>' +
          '<p style="margin: 0.4rem 0 0;">' + money(line.cost.totalAmount) + '</p>' +
          '</div>' +
          '<div style="display: grid; gap: 0.6rem; justify-items: end;">' +
          '<div class="liftd-qty">' +
          '<button type="button" data-qty-step="down" aria-label="' + t.decrease + '">&minus;</button>' +
          '<label class="visually-hidden" for="SharedCartQty-' + index + '">' + product.title + '</label>' +
          '<input id="SharedCartQty-' + index + '" type="number" value="' + line.quantity +
          '" min="0" inputmode="numeric" data-shared-line-qty="' + line.id + '">' +
          '<button type="button" data-qty-step="up" aria-label="' + t.increase + '">+</button>' +
          '</div>' +
          '<button type="button" data-shared-line-remove="' + line.id + '" class="liftd-chip">' +
          t.remove + '</button>' +
          '</div></div>';
      });
      html += '</div>';
      html +=
        '<div class="liftd-board liftd-cart-summary">' +
        '<div class="liftd-cart-summary__row"><span>' + t.subtotal + '</span><span>' +
        money(cart.cost.subtotalAmount) + '</span></div>' +
        (t.note ? '<p class="liftd-body" style="margin: 0;">' + t.note + '</p>' : '') +
        '<div style="display: flex; flex-wrap: wrap; gap: 1rem;">' +
        '<a href="' + cart.checkoutUrl + '" class="liftd-btn liftd-btn--pink">' + t.checkout + '</a>' +
        '</div></div>';
    }

    root.innerHTML = html;
  }

  function applyShared(payload) {
    if (payload.userErrors.length) announce(payload.userErrors[0].message);
    updateCartCount(payload.cart ? payload.cart.totalQuantity : 0);
    renderSharedCart(payload.cart);
  }

  /* Visible, polite status line for errors (sold out, inventory caps) —
     a silent failed add is a contract violation. */
  var announceTimer;
  function announce(message) {
    var el = document.getElementById('liftd-cart-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'liftd-cart-status';
      el.setAttribute('role', 'alert');
      el.style.cssText =
        'position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);z-index:99;' +
        'background:#0d0d10;color:#fbf7ef;padding:0.75rem 1.5rem;border-radius:999px;' +
        'font-weight:700;max-width:92vw;';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.removeAttribute('hidden');
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () {
      el.setAttribute('hidden', '');
    }, 4000);
  }

  if (SHARED) {
    /* Add to cart → shared cart (variant id converted to a GID). */
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form.matches('form[data-ajax-add]')) return;
      event.preventDefault();

      var variantId = (form.querySelector('[name="id"]') || {}).value;
      if (!variantId) return;
      var quantityField = form.querySelector('[name="quantity"]');
      var quantity = Math.max(1, parseInt(quantityField && quantityField.value, 10) || 1);

      var button = form.querySelector('[type="submit"]');
      var idle = button ? button.textContent : '';
      if (button) {
        button.setAttribute('aria-disabled', 'true');
        button.textContent = button.getAttribute('data-adding-text') || idle;
      }

      sharedLinesAdd([
        { merchandiseId: 'gid://shopify/ProductVariant/' + variantId, quantity: quantity }
      ])
        .then(function (payload) {
          if (payload.userErrors.length) {
            var status = form.querySelector('[data-add-status]');
            if (status) status.textContent = payload.userErrors[0].message;
            else announce(payload.userErrors[0].message);
            if (button) button.textContent = idle;
            return;
          }
          updateCartCount(payload.cart ? payload.cart.totalQuantity : 0);
          var okStatus = form.querySelector('[data-add-status]');
          if (okStatus) okStatus.textContent = okStatus.getAttribute('data-added-text') || '';
          if (button) {
            button.textContent = button.getAttribute('data-added-text') || idle;
            window.setTimeout(function () {
              button.textContent = idle;
            }, 2000);
          }
        })
        .catch(function () {
          var status = form.querySelector('[data-add-status]');
          if (status) status.textContent = 'Something went wrong. Please try again.';
          if (button) button.textContent = idle;
        })
        .finally(function () {
          if (button) button.removeAttribute('aria-disabled');
        });
    });

    /* Cart page line updates on the shared cart. */
    document.addEventListener('change', function (event) {
      var input = event.target.closest('[data-shared-line-qty]');
      if (!input) return;
      sharedLinesUpdate(
        input.getAttribute('data-shared-line-qty'),
        parseInt(input.value, 10) || 0
      ).then(applyShared);
    });
    document.addEventListener('click', function (event) {
      var remove = event.target.closest('[data-shared-line-remove]');
      if (!remove) return;
      event.preventDefault();
      sharedLinesRemove(remove.getAttribute('data-shared-line-remove')).then(applyShared);
    });

    /* Reconcile on load and on return-to-tab (~300ms debounce) so a line
       added on stayliftd.com appears here without a reload. */
    var refreshTimer;
    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        sharedFetchCart().then(applyShared).catch(function () {});
      }, 300);
    }
    window.addEventListener('focus', scheduleRefresh);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') scheduleRefresh();
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        sharedFetchCart().then(applyShared).catch(function () {});
      });
    } else {
      sharedFetchCart().then(applyShared).catch(function () {});
    }
  }

  /* ==================================================================
     NATIVE CART FALLBACK — only when no Storefront token is configured.
     Kept so the storefront still sells standalone before the shared cart
     is switched on.
     ================================================================== */

  if (!SHARED) {
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form.matches('form[data-ajax-add]')) return;
      event.preventDefault();

      var button = form.querySelector('[type="submit"]');
      var idle = button ? button.textContent : '';

      if (button) {
        button.setAttribute('aria-disabled', 'true');
        button.textContent = button.getAttribute('data-adding-text') || idle;
      }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (data) {
              throw new Error(data.description || data.message || 'error');
            });
          }
          return fetch('/cart.js').then(function (r) {
            return r.json();
          });
        })
        .then(function (cart) {
          updateCartCount(cart.item_count);
          var status = form.querySelector('[data-add-status]');
          if (status) {
            status.textContent = status.getAttribute('data-added-text') || '';
          }
          if (button) {
            button.textContent = button.getAttribute('data-added-text') || idle;
            window.setTimeout(function () {
              button.textContent = idle;
            }, 2000);
          }
        })
        .catch(function (error) {
          var status = form.querySelector('[data-add-status]');
          if (status) status.textContent = error.message;
          if (button) button.textContent = idle;
        })
        .finally(function () {
          if (button) button.removeAttribute('aria-disabled');
        });
    });

    function changeLine(line, quantity) {
      return fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ line: line, quantity: quantity })
      }).then(function (response) {
        if (!response.ok) throw new Error('cart');
        return response.json();
      });
    }

    function reloadCart() {
      // The cart page is Liquid-rendered; a reload is the honest refresh.
      window.location.reload();
    }

    document.addEventListener('change', function (event) {
      var input = event.target.closest('[data-cart-line-qty]');
      if (!input) return;
      changeLine(
        parseInt(input.getAttribute('data-cart-line-qty'), 10),
        parseInt(input.value, 10) || 0
      )
        .then(reloadCart)
        .catch(reloadCart);
    });

    document.addEventListener('click', function (event) {
      var remove = event.target.closest('[data-cart-line-remove]');
      if (!remove) return;
      event.preventDefault();
      changeLine(parseInt(remove.getAttribute('data-cart-line-remove'), 10), 0)
        .then(reloadCart)
        .catch(reloadCart);
    });
  }
})();
