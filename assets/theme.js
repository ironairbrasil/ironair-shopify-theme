(function () {
  var checkoutEndpoint = 'https://ironair-payments.vercel.app/api/checkout/start';
  var customerPromise;

  function uniqueReference(prefix) {
    var randomPart = '';
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      randomPart = window.crypto.randomUUID();
    } else {
      randomPart = Date.now() + '-' + Math.random().toString(16).slice(2);
    }
    return prefix + '-' + randomPart;
  }

  function decimalFromCents(cents) {
    return Number((Number(cents || 0) / 100).toFixed(2));
  }

  function getProductFormPriceCents(form, variantId) {
    var select = form.querySelector('select[name="id"]');
    var selected = select && select.options[select.selectedIndex];
    var hidden = form.querySelector('input[name="id"]');
    var variantJson = form.closest('[data-product-root]') && form.closest('[data-product-root]').querySelector('[data-product-variants-json]');
    var variants = [];

    if (selected && selected.getAttribute('data-price-cents')) return Number(selected.getAttribute('data-price-cents'));
    if (hidden && hidden.getAttribute('data-price-cents')) return Number(hidden.getAttribute('data-price-cents'));

    if (variantJson) {
      try {
        variants = JSON.parse(variantJson.textContent || '[]');
      } catch (error) {
        variants = [];
      }
      var variant = variants.find(function (item) {
        return String(item.id) === String(variantId);
      });
      if (variant && variant.price) return Number(variant.price);
    }

    return 0;
  }

  function getQuantity(form) {
    var input = form.querySelector('[name="quantity"]');
    var quantity = input ? Number(input.value) : 1;
    return Math.max(1, Number.isFinite(quantity) ? quantity : 1);
  }

  function setCheckoutMessage(target, message, isError) {
    var form = target && target.closest ? target.closest('form') : null;
    var container = form || (target && target.parentNode);
    var node;

    if (!container) return;
    node = container.querySelector('[data-asaas-checkout-message]');
    if (!node) {
      node = document.createElement('div');
      node.setAttribute('data-asaas-checkout-message', '');
      node.style.marginTop = '10px';
      node.style.fontWeight = '800';
      container.appendChild(node);
    }
    node.textContent = message || '';
    node.style.color = isError ? 'var(--red)' : 'var(--dark-green)';
  }

  function ensureCustomerModal() {
    var existing = document.querySelector('[data-asaas-customer-modal]');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.className = 'asaas-customer-modal';
    modal.setAttribute('data-asaas-customer-modal', '');
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="asaas-customer-modal__backdrop" data-asaas-customer-cancel></div>',
      '<div class="asaas-customer-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="AsaasCustomerTitle">',
        '<form data-asaas-customer-form novalidate>',
          '<h2 id="AsaasCustomerTitle">Dados para pagamento</h2>',
          '<label>Nome<input type="text" name="name" autocomplete="name" required></label>',
          '<label>Email<input type="email" name="email" autocomplete="email" required></label>',
          '<label>CPF/CNPJ<input type="text" name="cpfCnpj" inputmode="numeric" autocomplete="off" required></label>',
          '<p data-asaas-customer-error></p>',
          '<div>',
            '<button type="button" class="btn-hero-ghost" data-asaas-customer-cancel>Cancelar</button>',
            '<button type="submit" class="btn-hero">Continuar</button>',
          '</div>',
        '</form>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    return modal;
  }

  function collectCustomer() {
    if (customerPromise) return customerPromise;

    customerPromise = new Promise(function (resolve, reject) {
      var modal = ensureCustomerModal();
      var form = modal.querySelector('[data-asaas-customer-form]');
      var error = modal.querySelector('[data-asaas-customer-error]');
      var firstInput = form.querySelector('input');

      function close() {
        modal.hidden = true;
        document.body.classList.remove('asaas-customer-modal-open');
        form.removeEventListener('submit', submit);
        modal.querySelectorAll('[data-asaas-customer-cancel]').forEach(function (button) {
          button.removeEventListener('click', cancel);
        });
        customerPromise = null;
      }

      function cancel() {
        close();
        reject(new Error('checkout_cancelado'));
      }

      function submit(event) {
        event.preventDefault();
        var formData = new FormData(form);
        var customer = {
          name: String(formData.get('name') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          cpfCnpj: String(formData.get('cpfCnpj') || '').replace(/\D/g, '')
        };

        if (!customer.name || !customer.email || !customer.cpfCnpj) {
          error.textContent = 'Preencha nome, email e CPF/CNPJ para continuar.';
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
          error.textContent = 'Informe um email valido.';
          return;
        }

        close();
        resolve(customer);
      }

      error.textContent = '';
      form.addEventListener('submit', submit);
      modal.querySelectorAll('[data-asaas-customer-cancel]').forEach(function (button) {
        button.addEventListener('click', cancel);
      });
      modal.hidden = false;
      document.body.classList.add('asaas-customer-modal-open');
      window.setTimeout(function () {
        if (firstInput) firstInput.focus();
      }, 0);
    });

    return customerPromise;
  }

  function buildProductCheckoutPayload(form, customer) {
    var formData = new FormData(form);
    var variantId = String(formData.get('id') || '').trim();
    var quantity = getQuantity(form);
    var priceCents = getProductFormPriceCents(form, variantId);
    var productRoot = form.closest('[data-product-root]');
    var productHandle = form.getAttribute('data-product-handle') || (productRoot && productRoot.getAttribute('data-product-handle')) || '';
    var unitValue = decimalFromCents(priceCents);
    var value = Number((unitValue * quantity).toFixed(2));

    if (!variantId) throw new Error('Selecione uma variante para continuar.');
    if (!priceCents) throw new Error('Nao foi possivel identificar o preco do produto.');
    if (!productHandle) throw new Error('Nao foi possivel identificar o produto.');

    return {
      name: customer.name,
      email: customer.email,
      cpfCnpj: customer.cpfCnpj,
      value: value,
      externalReference: uniqueReference('theme'),
      items: [
        {
          variantId: variantId,
          variantGid: 'gid://shopify/ProductVariant/' + variantId,
          quantity: quantity,
          productHandle: productHandle
        }
      ],
      source: 'shopify-theme'
    };
  }

  function postCheckout(payload) {
    return fetch(checkoutEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!response.ok) throw new Error(data.error || data.message || 'Nao foi possivel gerar o pagamento agora.');
        return data;
      });
    });
  }

  function startProductCheckout(form) {
    var button = form.querySelector('[data-asaas-checkout]') || form.querySelector('[type="submit"]');
    var originalText = button ? button.textContent : '';

    if (form.getAttribute('data-asaas-checkout-loading') === 'true') return;
    form.setAttribute('data-asaas-checkout-loading', 'true');
    if (button) {
      button.disabled = true;
      button.textContent = 'Gerando pagamento...';
    }
    setCheckoutMessage(form, '');

    return collectCustomer()
      .then(function (customer) {
        return postCheckout(buildProductCheckoutPayload(form, customer));
      })
      .then(function (data) {
        var checkoutUrl = data.checkoutUrl || data.url || data.redirectUrl || data.invoiceUrl;
        if (!checkoutUrl) throw new Error('Pagamento gerado sem URL de checkout.');
        window.location.href = checkoutUrl;
      })
      .catch(function (error) {
        if (error && error.message === 'checkout_cancelado') return;
        setCheckoutMessage(form, (error && error.message) || 'Nao foi possivel gerar o pagamento. Confira seus dados e tente novamente.', true);
      })
      .finally(function () {
        form.removeAttribute('data-asaas-checkout-loading');
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
  }

  window.IronAirCheckout = {
    collectCustomer: collectCustomer,
    postCheckout: postCheckout,
    uniqueReference: uniqueReference,
    decimalFromCents: decimalFromCents
  };

  function initAsaasProductCheckout() {
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !form.matches || !form.matches('form[data-asaas-checkout]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      startProductCheckout(form);
    }, true);
  }

  function initHeader() {
    var toggle = document.querySelector('[data-mobile-menu-toggle]');
    var sidebar = document.querySelector('[data-mobile-sidebar]');
    var overlay = document.querySelector('.mobile-nav-overlay');
    var closers = document.querySelectorAll('[data-mobile-menu-close]');
    if (!toggle || !sidebar || !overlay) return;

    function setOpen(open) {
      sidebar.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(!sidebar.classList.contains('open'));
    });
    closers.forEach(function (button) {
      button.addEventListener('click', function () { setOpen(false); });
    });
    sidebar.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
  }

  function initGallery() {
    document.querySelectorAll('[data-product-root]').forEach(function (root) {
      var main = root.querySelector('[data-main-product-image]');
      if (!main) return;
      root.querySelectorAll('[data-gallery-image]').forEach(function (button) {
        button.addEventListener('click', function () {
          main.src = button.getAttribute('data-gallery-image');
          root.querySelectorAll('[data-gallery-image]').forEach(function (item) {
            item.classList.toggle('is-active', item === button);
          });
        });
      });
    });
  }

  function initVariantPricing() {
    document.querySelectorAll('[data-product-root]').forEach(function (root) {
      var select = root.querySelector('[data-product-variant-select]');
      if (!select) return;

      var discount = root.querySelector('[data-product-discount]');
      var comparePrice = root.querySelector('[data-product-compare-price]');
      var price = root.querySelector('[data-product-price]');
      var cardPrice = root.querySelector('[data-product-card-price]');
      var pixPrice = root.querySelector('[data-product-pix-price]');
      var installments = root.querySelector('[data-product-installments]');
      var stockMessage = root.querySelector('[data-product-stock-message]');
      var submit = root.querySelector('[data-product-submit]');
      var variantJson = root.querySelector('[data-product-variants-json]');
      var optionGroups = root.querySelectorAll('[data-option-position]');
      var optionButtons = root.querySelectorAll('[data-variant-option-button]');
      var variants = [];

      if (variantJson) {
        try {
          variants = JSON.parse(variantJson.textContent || '[]');
        } catch (error) {
          variants = [];
        }
      }

      function getSelectedOptions() {
        var selected = [];
        optionGroups.forEach(function (group) {
          var position = Number(group.getAttribute('data-option-position'));
          var active = group.querySelector('[data-variant-option-button].is-active');
          if (position && active) selected[position - 1] = active.getAttribute('data-option-value');
        });
        return selected;
      }

      function findVariantByOptions(selectedOptions) {
        return variants.find(function (variant) {
          if (!variant.options) return false;
          return variant.options.every(function (value, index) {
            return value === selectedOptions[index];
          });
        });
      }

      function syncOptionButtons(selectedVariantId) {
        var selectedVariant = variants.find(function (variant) {
          return String(variant.id) === String(selectedVariantId);
        });
        if (!selectedVariant || !selectedVariant.options) return;

        optionButtons.forEach(function (button) {
          var position = Number(button.getAttribute('data-option-position'));
          var isActive = selectedVariant.options[position - 1] === button.getAttribute('data-option-value');
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }

      function syncOptionAvailability() {
        if (!variants.length) return;
        var selectedOptions = getSelectedOptions();
        optionButtons.forEach(function (button) {
          var position = Number(button.getAttribute('data-option-position'));
          var candidateOptions = selectedOptions.slice();
          candidateOptions[position - 1] = button.getAttribute('data-option-value');
          var matchingVariant = findVariantByOptions(candidateOptions);
          button.classList.toggle('is-unavailable', Boolean(matchingVariant && !matchingVariant.available));
        });
      }

      function update() {
        var option = select.options[select.selectedIndex];
        if (!option) return;
        var hasComparePrice = option.getAttribute('data-has-compare-price') === 'true';
        var isAvailable = option.getAttribute('data-available') === 'true';
        var selectedVariantId = option.value;

        if (discount) {
          discount.textContent = option.getAttribute('data-discount') || '';
          discount.hidden = !hasComparePrice;
        }
        if (comparePrice) {
          comparePrice.textContent = option.getAttribute('data-compare-price') || '';
          comparePrice.hidden = !hasComparePrice;
        }
        if (price) price.textContent = option.getAttribute('data-price') || '';
        if (cardPrice) cardPrice.textContent = option.getAttribute('data-price') || '';
        if (pixPrice) pixPrice.textContent = option.getAttribute('data-pix-price') || '';
        if (installments) installments.textContent = option.getAttribute('data-installments') || '';
        if (stockMessage) {
          var stockPrefix = stockMessage.getAttribute('data-stock-prefix') || '';
          stockMessage.textContent = (isAvailable && stockPrefix ? stockPrefix + ' ' : '') + (option.getAttribute('data-stock-message') || '');
          stockMessage.classList.toggle('is-out', !isAvailable);
        }
        if (submit) submit.disabled = !isAvailable;
        syncOptionButtons(selectedVariantId);
        syncOptionAvailability();
      }

      optionButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          if (button.disabled) return;
          var group = button.closest('[data-option-position]');
          if (!group) return;
          group.querySelectorAll('[data-variant-option-button]').forEach(function (item) {
            item.classList.toggle('is-active', item === button);
            item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
          });

          var directVariantId = button.getAttribute('data-variant-id');
          var matchingVariant = directVariantId
            ? variants.find(function (variant) { return String(variant.id) === String(directVariantId); })
            : findVariantByOptions(getSelectedOptions());
          var nextVariantId = directVariantId || (matchingVariant && matchingVariant.id);
          if (!nextVariantId) return;
          select.value = nextVariantId;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      select.addEventListener('change', update);
      update();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAsaasProductCheckout();
    initHeader();
    initGallery();
    initVariantPricing();
  });
})();
