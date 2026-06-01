(function () {
  function initFaq() {
    document.querySelectorAll('[data-faq-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var answer = button.parentElement.querySelector('.faq-a');
        var open = !button.classList.contains('open');
        button.classList.toggle('open', open);
        if (answer) answer.classList.toggle('open', open);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initFaq);
})();
