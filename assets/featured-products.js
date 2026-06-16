(function () {
  function updateButtons(carousel) {
    var track = carousel.querySelector('[data-products-track]');
    var prev = carousel.querySelector('[data-products-prev]');
    var next = carousel.querySelector('[data-products-next]');
    if (!track || !prev || !next) return;

    var maxScroll = track.scrollWidth - track.clientWidth - 1;
    prev.disabled = track.scrollLeft <= 0;
    next.disabled = track.scrollLeft >= maxScroll;
  }

  function initCarousel(carousel) {
    var track = carousel.querySelector('[data-products-track]');
    var prev = carousel.querySelector('[data-products-prev]');
    var next = carousel.querySelector('[data-products-next]');
    if (!track || !prev || !next) return;

    function scroll(direction) {
      var firstCard = track.querySelector('.product-card');
      var amount = firstCard ? firstCard.getBoundingClientRect().width + 12 : track.clientWidth;
      track.scrollBy({ left: amount * direction, behavior: 'auto' });
    }

    prev.addEventListener('click', function () { scroll(-1); });
    next.addEventListener('click', function () { scroll(1); });
    track.addEventListener('scroll', function () { updateButtons(carousel); }, { passive: true });
    window.addEventListener('resize', function () { updateButtons(carousel); });
    updateButtons(carousel);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-products-carousel]').forEach(initCarousel);
  });
})();
