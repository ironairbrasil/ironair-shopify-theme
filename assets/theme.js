(function () {
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
      var variantButtons = root.querySelectorAll('[data-variant-button]');

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
        variantButtons.forEach(function (button) {
          var isActive = button.getAttribute('data-variant-id') === selectedVariantId;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }

      variantButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          if (button.disabled) return;
          select.value = button.getAttribute('data-variant-id');
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      select.addEventListener('change', update);
      update();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initGallery();
    initVariantPricing();
  });
})();
