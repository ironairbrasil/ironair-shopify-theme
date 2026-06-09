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

  function initBkReviewPlacement() {
    function placeStars() {
      document.querySelectorAll('.product-card').forEach(function (card) {
        var title = card.querySelector('.pc-name');
        var body = card.querySelector('.pc-body');
        var bkStars = card.querySelector('.collection-star-section');
        if (!title || !body || !bkStars) return;

        if (bkStars.parentElement !== body || bkStars.previousElementSibling !== title) {
          body.insertBefore(bkStars, title.nextSibling);
        }
      });
    }

    placeStars();

    var observer = new MutationObserver(placeStars);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initGallery();
    initVariantPricing();
    initBkReviewPlacement();
  });
})();
