(function () {
  function pauseCard(card) {
    var video = card.querySelector('video');
    if (!video) return;
    video.pause();
    card.classList.remove('is-playing');
  }

  function initActionVideos(root) {
    var track = root.querySelector('[data-action-videos-track]');
    if (!track || track.dataset.actionVideosReady === 'true') return;
    track.dataset.actionVideosReady = 'true';

    var cards = Array.prototype.slice.call(track.querySelectorAll('[data-action-video-card]'));
    var prev = root.querySelector('[data-action-videos-prev]');
    var next = root.querySelector('[data-action-videos-next]');

    function scroll(direction) {
      var firstCard = cards[0];
      if (!firstCard) return;
      var amount = firstCard.getBoundingClientRect().width + 16;
      track.scrollBy({ left: amount * direction, behavior: 'smooth' });
    }

    if (prev) {
      prev.addEventListener('click', function () {
        scroll(-1);
      });
    }

    if (next) {
      next.addEventListener('click', function () {
        scroll(1);
      });
    }

    cards.forEach(function (card) {
      var button = card.querySelector('[data-action-video-toggle]');
      var video = card.querySelector('video');
      if (!button || !video) return;

      button.addEventListener('click', function () {
        cards.forEach(function (otherCard) {
          if (otherCard !== card) pauseCard(otherCard);
        });

        if (video.paused) {
          video.play();
          card.classList.add('is-playing');
        } else {
          pauseCard(card);
        }
      });

      video.addEventListener('pause', function () {
        card.classList.remove('is-playing');
      });
    });
  }

  function boot() {
    document.querySelectorAll('[data-action-videos]').forEach(initActionVideos);
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('shopify:section:load', function (event) {
    if (event && event.target) {
      event.target.querySelectorAll('[data-action-videos]').forEach(initActionVideos);
    }
  });
})();
