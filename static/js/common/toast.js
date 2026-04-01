(function (w) {
  /**
   * @param {string} message
   * @param {{ error?: boolean, duration?: number }} [options]
   */
  function showAppToast(message, options) {
    const opts = options || {};
    const asError = opts.error === true;
    const duration = opts.duration != null ? opts.duration : asError ? 6000 : 4000;
    const el = document.getElementById("app-toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.setAttribute("role", asError ? "alert" : "status");
    el.setAttribute("aria-live", asError ? "assertive" : "polite");
    el.classList.toggle("toast--error", asError);
    clearTimeout(showAppToast._t);
    showAppToast._t = setTimeout(() => {
      el.hidden = true;
      el.classList.remove("toast--error");
    }, duration);
  }

  w.showAppToast = showAppToast;
})(window);
