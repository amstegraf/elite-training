(function () {
  document.querySelectorAll("form[data-confirm-message]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      const msg = form.getAttribute("data-confirm-message");
      if (msg && !confirm(msg)) {
        e.preventDefault();
      }
    });
  });
})();
