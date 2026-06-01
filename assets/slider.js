(function () {
  function initSliders() {
    document.querySelectorAll('[data-home-slider]').forEach(function (slider) {
      var slides = Array.from(slider.querySelectorAll('.home-slide'));
      var dots = Array.from(slider.querySelectorAll('[data-slider-dot]'));
      var prev = slider.querySelector('[data-slider-prev]');
      var next = slider.querySelector('[data-slider-next]');
      var active = 0;
      if (slides.length < 2) return;

      function go(index) {
        active = (index + slides.length) % slides.length;
        slides.forEach(function (slide, idx) {
          slide.classList.toggle('is-active', idx === active);
          slide.setAttribute('aria-hidden', idx === active ? 'false' : 'true');
        });
        dots.forEach(function (dot, idx) {
          dot.classList.toggle('is-active', idx === active);
        });
      }

      if (prev) prev.addEventListener('click', function () { go(active - 1); });
      if (next) next.addEventListener('click', function () { go(active + 1); });
      dots.forEach(function (dot, idx) {
        dot.addEventListener('click', function () { go(idx); });
      });
      window.setInterval(function () { go(active + 1); }, 5500);
    });
  }

  document.addEventListener('DOMContentLoaded', initSliders);
})();
