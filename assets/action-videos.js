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
    var activeIndex = 0;
    var scrollTimer = null;

    function getClosestIndex() {
      var trackRect = track.getBoundingClientRect();
      var trackCenter = trackRect.left + trackRect.width / 2;
      var closestIndex = 0;
      var closestDistance = Infinity;

      cards.forEach(function (card, index) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.left + rect.width / 2;
        var distance = Math.abs(trackCenter - cardCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    function setActive(index) {
      activeIndex = Math.max(0, Math.min(index, cards.length - 1));
      cards.forEach(function (card, cardIndex) {
        card.classList.toggle('is-active', cardIndex === activeIndex);
        if (cardIndex !== activeIndex) pauseCard(card);
      });
    }

    function centerCard(index, behavior) {
      var card = cards[index];
      if (!card) return;
      setActive(index);
      card.scrollIntoView({
        behavior: behavior || 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }

    function scroll(direction) {
      centerCard(activeIndex + direction, 'smooth');
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
      var cardIndex = cards.indexOf(card);

      card.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        if (cardIndex !== activeIndex) {
          centerCard(cardIndex, 'smooth');
        }
      });

      if (!button || !video) return;

      button.addEventListener('click', function () {
        if (cardIndex !== activeIndex) {
          centerCard(cardIndex, 'smooth');
          return;
        }

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

    track.addEventListener('scroll', function () {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () {
        setActive(getClosestIndex());
      }, 80);
    }, { passive: true });

    window.addEventListener('resize', function () {
      centerCard(activeIndex, 'auto');
    });

    setActive(getClosestIndex());
    window.setTimeout(function () {
      centerCard(activeIndex, 'auto');
    }, 80);
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
