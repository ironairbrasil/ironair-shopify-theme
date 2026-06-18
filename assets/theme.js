(function () {
  var directCheckoutUrl = 'https://ironair-payments.vercel.app/checkout-ironair';

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

  function getProductFormVariantData(form, variantId) {
    var select = form.querySelector('select[name="id"]');
    var selected = select && select.options[select.selectedIndex];
    var hidden = form.querySelector('input[name="id"]');
    var productRoot = form.closest('[data-product-root]');
    var variantJson = productRoot && productRoot.querySelector('[data-product-variants-json]');
    var variants = [];
    var variant = null;

    if (variantJson) {
      try {
        variants = JSON.parse(variantJson.textContent || '[]');
      } catch (error) {
        variants = [];
      }
      variant = variants.find(function (item) {
        return String(item.id) === String(variantId);
      });
    }

    return {
      id: variantId,
      gid: (selected && selected.getAttribute('data-variant-gid')) ||
        (hidden && hidden.getAttribute('data-variant-gid')) ||
        (variant && variant.admin_graphql_api_id) ||
        ('gid://shopify/ProductVariant/' + variantId),
      title: (selected && selected.getAttribute('data-product-title')) ||
        (hidden && hidden.getAttribute('data-product-title')) ||
        form.getAttribute('data-product-title') ||
        (productRoot && productRoot.getAttribute('data-product-title')) ||
        '',
      image: (selected && selected.getAttribute('data-product-image')) ||
        (hidden && hidden.getAttribute('data-product-image')) ||
        form.getAttribute('data-product-image') ||
        (productRoot && productRoot.getAttribute('data-product-image')) ||
        '',
      priceCents: getProductFormPriceCents(form, variantId)
    };
  }

  function getQuantity(form) {
    var input = form.querySelector('[name="quantity"]');
    var quantity = input ? Number(input.value) : 1;
    return Math.max(1, Number.isFinite(quantity) ? quantity : 1);
  }

  function appendCustomerPrefill(params) {
    var prefill = window.IronAirCheckoutPrefill || {};
    Object.keys(prefill).forEach(function (key) {
      if (prefill[key]) params.set(key, prefill[key]);
    });
  }

  function setCheckoutMessage(target, message, isError) {
    var form = target && target.closest ? target.closest('form') : null;
    var container = form || (target && target.parentNode);
    var node;

    if (!container) return;
    node = container.querySelector('[data-ironair-checkout-message]');
    if (!node) {
      node = document.createElement('div');
      node.setAttribute('data-ironair-checkout-message', '');
      node.style.marginTop = '10px';
      node.style.fontWeight = '800';
      container.appendChild(node);
    }
    node.textContent = message || '';
    node.style.color = isError ? 'var(--red)' : 'var(--dark-green)';
  }

  function buildDirectProductCheckoutUrl(form) {
    var formData = new FormData(form);
    var variantId = String(formData.get('id') || '').trim();
    var quantity = getQuantity(form);
    var variantData;
    var params;

    if (!variantId) throw new Error('Selecione uma variante para continuar.');

    variantData = getProductFormVariantData(form, variantId);
    if (!variantData.priceCents) throw new Error('Nao foi possivel identificar o preco do produto.');
    if (!variantData.title) throw new Error('Nao foi possivel identificar o produto.');

    params = new URLSearchParams();
    params.set('variantId', variantData.gid);
    params.set('quantity', String(quantity));
    params.set('title', variantData.title);
    params.set('price', decimalFromCents(variantData.priceCents).toFixed(2));
    params.set('image', variantData.image || '');
    params.set('productHandle', form.getAttribute('data-product-handle') || '');
    appendCustomerPrefill(params);

    return directCheckoutUrl + '?' + params.toString();
  }

  function startProductCheckout(form) {
    var button = form.querySelector('[data-ironair-checkout]') || form.querySelector('[type="submit"]');
    var originalText = button ? button.textContent : '';

    if (form.getAttribute('data-ironair-checkout-loading') === 'true') return;
    form.setAttribute('data-ironair-checkout-loading', 'true');
    if (button) {
      button.disabled = true;
      button.textContent = 'Abrindo checkout...';
    }
    setCheckoutMessage(form, '');

    try {
      window.location.href = buildDirectProductCheckoutUrl(form);
    } catch (error) {
      setCheckoutMessage(form, (error && error.message) || 'Nao foi possivel abrir o checkout. Confira seus dados e tente novamente.', true);
      form.removeAttribute('data-ironair-checkout-loading');
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
      return;
    }

    window.setTimeout(function () {
      if (document.visibilityState === 'hidden') return;
      if (form.getAttribute('data-ironair-checkout-loading') === 'true') {
        form.removeAttribute('data-ironair-checkout-loading');
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    }, 3000);
  }

  window.IronAirCheckout = {
    directCheckoutUrl: directCheckoutUrl,
    uniqueReference: uniqueReference,
    decimalFromCents: decimalFromCents
  };

  function initIronAirProductCheckout() {
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !form.matches || !form.matches('form[data-ironair-checkout]')) return;
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

    function setOpen(open) {
      if (!sidebar || !overlay || !toggle) return;
      sidebar.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    if (toggle && sidebar && overlay) {
      toggle.addEventListener('click', function () {
        setOpen(!sidebar.classList.contains('open'));
      });
    }
    closers.forEach(function (button) {
      button.addEventListener('click', function () { setOpen(false); });
    });
    if (sidebar) {
      sidebar.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () { setOpen(false); });
      });
    }
  }

  function closeAccountMenus(exceptMenu) {
    document.querySelectorAll('[data-account-menu]').forEach(function (menu) {
      if (exceptMenu && menu === exceptMenu) return;
      var button = menu.querySelector('[data-account-menu-toggle]');
      var panel = menu.querySelector('[data-account-menu-panel]');
      if (button) button.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });
  }

  function initAccountMenus() {
    document.querySelectorAll('[data-account-menu]').forEach(function (menu) {
      var button = menu.querySelector('[data-account-menu-toggle]');
      var panel = menu.querySelector('[data-account-menu-panel]');
      if (!button || !panel) return;

      button.addEventListener('click', function (event) {
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        event.stopPropagation();
        closeAccountMenus(menu);
        button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        panel.hidden = isOpen;
      });
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-account-menu]')) return;
      closeAccountMenus();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAccountMenus();
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
    initIronAirProductCheckout();
    initHeader();
    initAccountMenus();
    initGallery();
    initVariantPricing();
  });
})();
