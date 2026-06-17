(function () {
  var root;
  var drawer;
  var lastFocused;
  var discountCode = window.sessionStorage ? window.sessionStorage.getItem('ironair_discount_code') || '' : '';

  function money(cents) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents);
    }
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
    });
  }

  function itemImage(item) {
    if (!item.image) return '';
    return '<img src="' + item.image + '&width=180" alt="' + escapeHtml(item.product_title) + '" loading="lazy">';
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
            '<div class="cart-drawer-qty" data-cart-item-key="' + item.key + '">',
              '<button type="button" data-cart-quantity-minus aria-label="Diminuir quantidade">−</button>',
              '<input type="number" min="0" value="' + item.quantity + '" data-cart-quantity-input aria-label="Quantidade de ' + escapeHtml(item.product_title) + '">',
              '<button type="button" data-cart-quantity-plus aria-label="Aumentar quantidade">+</button>',
            '</div>',
            '<strong>' + money(item.final_line_price) + '</strong>',
          '</div>',
          '<button type="button" class="cart-drawer-remove" data-cart-remove data-cart-item-key="' + item.key + '">Excluir</button>',
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

  function updateDiscountUi(cart) {
    var input = root.querySelector('[data-cart-discount-input]');
    var message = root.querySelector('[data-cart-discount-message]');
    var checkout = root.querySelector('[data-cart-checkout]');
    var row = root.querySelector('[data-cart-discount-row]');
    var amount = root.querySelector('[data-cart-drawer-discount]');
    var totalDiscount = cart.total_discount || 0;

    if (input && discountCode) input.value = discountCode;
    if (message) message.textContent = discountCode ? 'Cupom aplicado no checkout: ' + discountCode : '';
    if (checkout) checkout.disabled = cart.item_count <= 0;
    if (row && amount) {
      row.hidden = totalDiscount <= 0;
      amount.textContent = '-' + money(totalDiscount);
    }
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

    updateDiscountUi(cart);
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

  function changeLine(key, quantity) {
    root.classList.add('is-loading');
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ id: key, quantity: Math.max(0, quantity) })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Cart change failed');
        return response.json();
      })
      .then(renderCart)
      .finally(function () {
        root.classList.remove('is-loading');
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

  function buildAsaasCheckoutPayload(cart, customer) {
    return {
      name: customer.name,
      email: customer.email,
      cpfCnpj: customer.cpfCnpj,
      value: Number(((cart.total_price || 0) / 100).toFixed(2)),
      externalReference: window.IronAirCheckout ? window.IronAirCheckout.uniqueReference('theme') : 'theme-' + Date.now() + '-' + Math.random().toString(16).slice(2),
      discountCode: discountCode,
      currency: cart.currency || 'BRL',
      source: 'shopify-theme',
      items: (cart.items || []).map(function (item) {
        var quantity = Number(item.quantity || 1);
        var unitPrice = quantity > 0 ? (item.final_line_price || item.final_price || item.price || 0) / quantity : 0;
        return {
          variantId: String(item.variant_id),
          variantGid: 'gid://shopify/ProductVariant/' + String(item.variant_id),
          quantity: quantity,
          productHandle: item.handle || '',
          productId: String(item.product_id),
          title: item.product_title,
          variantTitle: item.variant_title,
          sku: item.sku,
          price: Number((unitPrice / 100).toFixed(2)),
          linePrice: Number(((item.final_line_price || 0) / 100).toFixed(2))
        };
      })
    };
  }

  function startAsaasCheckout(button) {
    var originalText = button ? button.textContent : '';

    if (button && button.getAttribute('data-asaas-checkout-loading') === 'true') return;
    if (button) {
      button.disabled = true;
      button.setAttribute('data-asaas-checkout-loading', 'true');
      button.textContent = 'Gerando pagamento...';
    }

    if (!window.IronAirCheckout) {
      if (button) {
        button.disabled = false;
        button.removeAttribute('data-asaas-checkout-loading');
        button.textContent = originalText;
      }
      window.alert('Nao foi possivel abrir o checkout agora. Recarregue a pagina e tente novamente.');
      return;
    }

    return window.IronAirCheckout.collectCustomer()
      .then(function (customer) {
        return fetchCart().then(function (cart) {
          return { cart: cart, customer: customer };
        });
      })
      .then(function (checkoutContext) {
        var cart = checkoutContext.cart;
        if (!cart.item_count) {
          if (root) renderCart(cart);
          throw new Error('Carrinho vazio');
        }

        return window.IronAirCheckout.postCheckout(buildAsaasCheckoutPayload(cart, checkoutContext.customer));
      })
      .then(function (data) {
        var checkoutUrl = data.checkoutUrl || data.url || data.redirectUrl || data.invoiceUrl;
        if (!checkoutUrl) throw new Error('Checkout sem URL');
        window.location.href = checkoutUrl;
      })
      .catch(function (error) {
        if (button) {
          button.disabled = false;
          button.removeAttribute('data-asaas-checkout-loading');
          button.textContent = 'Tentar novamente';
          window.setTimeout(function () {
            button.textContent = originalText;
          }, 2500);
        }
        if (!error || error.message !== 'checkout_cancelado') {
          window.alert((error && error.message) || 'Nao foi possivel gerar o pagamento. Confira seus dados e tente novamente.');
        }
      });
  }

  function handleDrawerClick(event) {
    var remove = event.target.closest('[data-cart-remove]');
    var minus = event.target.closest('[data-cart-quantity-minus]');
    var plus = event.target.closest('[data-cart-quantity-plus]');
    var control = event.target.closest('[data-cart-item-key]');
    var input;
    var quantity;

    if (remove) {
      changeLine(remove.getAttribute('data-cart-item-key'), 0);
      return;
    }

    if (!control || (!minus && !plus)) return;
    input = control.querySelector('[data-cart-quantity-input]');
    quantity = parseInt(input.value, 10) || 0;
    changeLine(control.getAttribute('data-cart-item-key'), quantity + (plus ? 1 : -1));
  }

  function handleQuantityChange(event) {
    var input = event.target.closest('[data-cart-quantity-input]');
    var control;
    if (!input) return;
    control = input.closest('[data-cart-item-key]');
    if (!control) return;
    changeLine(control.getAttribute('data-cart-item-key'), parseInt(input.value, 10) || 0);
  }

  function initDiscount() {
    var form = root.querySelector('[data-cart-discount-form]');
    var input = root.querySelector('[data-cart-discount-input]');
    if (!form || !input) return;

    if (discountCode) input.value = discountCode;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      discountCode = input.value.trim();
      if (window.sessionStorage) {
        if (discountCode) window.sessionStorage.setItem('ironair_discount_code', discountCode);
        else window.sessionStorage.removeItem('ironair_discount_code');
      }
      fetchCart().then(renderCart);
    });
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

    root.addEventListener('click', handleDrawerClick);
    root.addEventListener('change', handleQuantityChange);
    initDiscount();
    fetchCart().then(renderCart);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && root.classList.contains('is-open')) closeDrawer();
    });

    document.addEventListener('click', function (event) {
      var checkout = event.target.closest('[data-cart-checkout]');
      if (!checkout) return;
      event.preventDefault();
      startAsaasCheckout(checkout);
    });

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (event.defaultPrevented) return;
      if (!form || !shouldHandleCartAdd(form)) return;
      event.preventDefault();
      addToCart(form).catch(function () {
        form.submit();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
