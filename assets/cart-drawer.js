(function () {
  var root;
  var drawer;
  var lastFocused;

  function money(cents) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents);
    }
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function itemImage(item) {
    if (!item.image) return '';
    return '<img src="' + item.image + '&width=180" alt="' + escapeHtml(item.product_title) + '" loading="lazy">';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
    });
  }

  function itemMarkup(item) {
    var variant = item.variant_title && item.variant_title !== 'Default Title'
      ? '<span>' + escapeHtml(item.variant_title) + '</span>'
      : '';

    return [
      '<article class="cart-drawer-item">',
        '<a href="' + item.url + '" class="cart-drawer-media" tabindex="-1">' + itemImage(item) + '</a>',
        '<div class="cart-drawer-item-copy">',
          '<a href="' + item.url + '" class="cart-drawer-item-title">' + escapeHtml(item.product_title) + '</a>',
          variant,
          '<div class="cart-drawer-item-meta">',
            '<span>Qtd. ' + item.quantity + '</span>',
            '<strong>' + money(item.final_line_price) + '</strong>',
          '</div>',
        '</div>',
      '</article>'
    ].join('');
  }

  function updateCartCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (node) {
      node.textContent = count;
    });
    document.querySelectorAll('[data-cart-drawer-count]').forEach(function (node) {
      node.textContent = count + ' item' + (count === 1 ? '' : 's');
    });
  }

  function renderCart(cart) {
    var body = root.querySelector('[data-cart-drawer-body]');
    var footer = root.querySelector('[data-cart-drawer-footer]');
    var subtotal = root.querySelector('[data-cart-drawer-subtotal]');

    updateCartCount(cart.item_count);

    if (cart.item_count > 0) {
      body.innerHTML = '<div class="cart-drawer-items">' + cart.items.map(itemMarkup).join('') + '</div>';
      footer.hidden = false;
      subtotal.textContent = money(cart.total_price);
    } else {
      body.innerHTML = '<div class="cart-drawer-empty"><strong>Seu carrinho está vazio.</strong><a class="btn-hero" href="/collections/all">Ver produtos</a></div>';
      footer.hidden = true;
      subtotal.textContent = money(0);
    }
  }

  function fetchCart() {
    return fetch('/cart.js', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    }).then(function (response) {
      if (!response.ok) throw new Error('Cart request failed');
      return response.json();
    });
  }

  function openDrawer(trigger) {
    if (!root || !drawer) return;
    lastFocused = trigger || document.activeElement;
    root.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    document.querySelectorAll('.js-cart-drawer-open').forEach(function (button) {
      button.setAttribute('aria-expanded', 'true');
    });
    window.setTimeout(function () {
      var closeButton = drawer.querySelector('[data-cart-drawer-close]');
      if (closeButton) closeButton.focus();
    }, 0);
  }

  function closeDrawer() {
    if (!root || !drawer) return;
    root.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    document.querySelectorAll('.js-cart-drawer-open').forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
    });
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function addToCart(form) {
    var submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;

    return fetch('/cart/add.js', {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Add to cart failed');
        return fetchCart();
      })
      .then(function (cart) {
        renderCart(cart);
        openDrawer(submit || form);
      })
      .finally(function () {
        if (submit) submit.disabled = false;
      });
  }

  function shouldHandleCartAdd(form) {
    var action = form.getAttribute('action') || '';
    return action.indexOf('/cart/add') !== -1;
  }

  function init() {
    root = document.querySelector('[data-cart-drawer-root]');
    if (!root) return;
    drawer = document.getElementById('CartDrawer');

    document.querySelectorAll('.js-cart-drawer-open').forEach(function (button) {
      button.addEventListener('click', function () {
        fetchCart().then(renderCart).finally(function () { openDrawer(button); });
      });
    });

    root.querySelectorAll('[data-cart-drawer-close]').forEach(function (button) {
      button.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && root.classList.contains('is-open')) closeDrawer();
    });

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !shouldHandleCartAdd(form)) return;
      event.preventDefault();
      addToCart(form).catch(function () {
        form.submit();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
