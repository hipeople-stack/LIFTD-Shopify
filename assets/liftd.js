/* LIFTD theme JS.
   Native Liquid/Ajax cart only — no Storefront API (deliberate, see
   integration plan). Everything degrades to plain form posts without JS. */
(function () {
  'use strict';

  var CART_COUNT_SELECTOR = '[data-cart-count]';

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
     Ajax add to cart — progressive enhancement over {% form 'product' %}
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     Cart page line updates via /cart/change.js
     ------------------------------------------------------------------ */
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
})();
