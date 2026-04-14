(function () {
  const btn = document.getElementById("btn-mesh-test");
  const out = document.getElementById("mesh-test-result");
  if (btn && out) {
    btn.addEventListener("click", async function () {
      out.textContent = "Checking…";
      out.classList.remove("settings-status--ok", "settings-status--warn");
      try {
        const r = await fetch("/api/ai/mesh-health", { credentials: "same-origin" });
        const data = await r.json().catch(function () { return {}; });
        if (data.reachable) {
          out.textContent = "Reachable.";
          out.classList.add("settings-status--ok");
        } else {
          out.textContent = data.detail || "Not reachable.";
          out.classList.add("settings-status--warn");
        }
      } catch (e) {
        out.textContent = "Request failed.";
        out.classList.add("settings-status--warn");
      }
    });
  }

  const pre = document.getElementById("mesh-baseline-instructions");
  const errEl = document.getElementById("mesh-baseline-instructions-err");
  if (pre) {
    fetch("/api/ai/mesh-instructions", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          pre.textContent = data.content !== undefined && data.content !== null && data.content !== ""
            ? data.content
            : "(Empty response from mesh.)";
        } else {
          pre.textContent = "(Could not load baseline from mesh.)";
          if (errEl) {
            errEl.classList.remove("is-hidden");
            errEl.textContent = data.detail || "Unknown error.";
          }
        }
      })
      .catch(function () {
        pre.textContent = "(Request failed.)";
        if (errEl) {
          errEl.classList.remove("is-hidden");
          errEl.textContent = "Network error while calling /api/ai/mesh-instructions.";
        }
      });
  }

  document.querySelectorAll("form[data-confirm-message]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      const msg = form.getAttribute("data-confirm-message");
      if (msg && !confirm(msg)) {
        e.preventDefault();
      }
    });
  });
})();
