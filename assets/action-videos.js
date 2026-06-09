(function () {
  function pauseCard(card) {
    var video = card.querySelector('video');
    if (!video) return;
    if (!video.paused) video.pause();
    card.classList.remove('is-playing');
  }

  function playCard(card) {
    var video = card.querySelector('video');
    if (!video) return;
    video.playsInline = true;
    if (!video.paused) {
      card.classList.add('is-playing');
      return;
    }
    var promise = video.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {});
    }
    card.classList.add('is-playing');
  }

  function syncSoundButton(card) {
    var video = card.querySelector('video');
    var button = card.querySelector('[data-action-video-sound]');
    if (!video || !button) return;
    var isMuted = video.muted;
    card.classList.toggle('is-muted', isMuted);
    button.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
    button.setAttribute('aria-label', isMuted ? 'Ativar som' : 'Desativar som');
  }

  function cleanCloneAttributes(card) {
    Array.prototype.slice.call(card.attributes).forEach(function (attribute) {
      if (attribute.name.indexOf('data-shopify') === 0) {
        card.removeAttribute(attribute.name);
      }
    });
    card.querySelectorAll('[data-shopify-editor-block]').forEach(function (element) {
      element.removeAttribute('data-shopify-editor-block');
    });
  }

  function initActionVideos(root) {
    var track = root.querySelector('[data-action-videos-track]');
    if (!track || track.dataset.actionVideosReady === 'true') return;
    track.dataset.actionVideosReady = 'true';

    var originalCards = Array.prototype.slice.call(track.querySelectorAll('[data-action-video-card]'));
    var prev = root.querySelector('[data-action-videos-prev]');
    var next = root.querySelector('[data-action-videos-next]');
    var originalCount = originalCards.length;
    var cloneSetsEachSide = Math.max(2, Math.ceil(window.innerWidth / Math.max(originalCount * 240, 1)));
    var loopOffset = originalCount * cloneSetsEachSide;
    var cards = originalCards;
    var activeIndex = loopOffset;
    var activeRealIndex = 0;
    var previousActiveIndex = -1;
    var scrollTimer = null;
    var normalizing = false;

    if (originalCount > 1) {
      var before = document.createDocumentFragment();
      var after = document.createDocumentFragment();

      originalCards.forEach(function (card, index) {
        card.dataset.actionVideoRealIndex = index;
      });

      for (var setIndex = 0; setIndex < cloneSetsEachSide; setIndex += 1) {
        originalCards.forEach(function (card, index) {
          var beforeClone = card.cloneNode(true);
          beforeClone.removeAttribute('id');
          cleanCloneAttributes(beforeClone);
          beforeClone.dataset.actionVideoRealIndex = index;
          before.appendChild(beforeClone);
        });
      }

      for (var afterSetIndex = 0; afterSetIndex < cloneSetsEachSide; afterSetIndex += 1) {
        originalCards.forEach(function (card, index) {
          var afterClone = card.cloneNode(true);
          afterClone.removeAttribute('id');
          cleanCloneAttributes(afterClone);
          afterClone.dataset.actionVideoRealIndex = index;
          after.appendChild(afterClone);
        });
      }

      track.insertBefore(before, track.firstChild);
      track.appendChild(after);
      cards = Array.prototype.slice.call(track.querySelectorAll('[data-action-video-card]'));
    } else {
      originalCards.forEach(function (card, index) {
        card.dataset.actionVideoRealIndex = index;
      });
      activeIndex = 0;
    }

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
      activeRealIndex = Number(cards[activeIndex].dataset.actionVideoRealIndex || 0);
      cards.forEach(function (card, cardIndex) {
        var isActive = cardIndex === activeIndex;
        card.classList.toggle('is-active', isActive);
        if (isActive) {
          if (cardIndex !== previousActiveIndex) playCard(card);
          syncSoundButton(card);
        } else if (cardIndex === previousActiveIndex) {
          pauseCard(card);
        }
      });
      previousActiveIndex = activeIndex;
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
      if (originalCount > 1) {
        normalizeLoopPosition();
      }

      centerCard(activeIndex + direction, 'smooth');
    }

    function getMiddleIndex(realIndex) {
      return loopOffset + Number(realIndex || 0);
    }

    function normalizeLoopPosition() {
      if (normalizing || originalCount < 2) return;
      var safeStart = originalCount * 2;
      var safeEnd = cards.length - (originalCount * 2);
      if (activeIndex >= safeStart && activeIndex < safeEnd) return;

      normalizing = true;
      centerCard(getMiddleIndex(activeRealIndex), 'auto');
      window.setTimeout(function () {
        normalizing = false;
      }, 60);
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
      var soundButton = card.querySelector('[data-action-video-sound]');
      var video = card.querySelector('video');
      var cardIndex = cards.indexOf(card);

      card.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        if (cardIndex !== activeIndex) {
          centerCard(cardIndex, 'smooth');
        }
      });

      if (!soundButton || !video) return;

      video.muted = true;
      video.preload = cardIndex === activeIndex ? 'auto' : 'metadata';
      syncSoundButton(card);

      soundButton.addEventListener('click', function (event) {
        event.stopPropagation();
        if (cardIndex !== activeIndex) {
          centerCard(cardIndex, 'smooth');
        }

        cards.forEach(function (otherCard) {
          var otherVideo = otherCard.querySelector('video');
          if (otherCard !== card && otherVideo) {
            otherVideo.muted = true;
            syncSoundButton(otherCard);
          }
        });

        video.muted = !video.muted;
        playCard(card);
        syncSoundButton(card);
      });

      video.addEventListener('pause', function () {
        card.classList.remove('is-playing');
      });
    });

    track.addEventListener('scroll', function () {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () {
        setActive(getClosestIndex());
        normalizeLoopPosition();
      }, 80);
    }, { passive: true });

    window.addEventListener('resize', function () {
      centerCard(activeIndex, 'auto');
    });

    setActive(originalCount > 1 ? loopOffset : getClosestIndex());
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
