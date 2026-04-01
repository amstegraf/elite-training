(function () {
  const modal = document.getElementById("delete-session-modal");
  const summaryEl = document.getElementById("delete-session-summary");
  const confirmBtn = document.getElementById("delete-session-confirm");
  if (!modal || !confirmBtn) return;

  let pendingId = null;

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Delete";
  }

  function closeModal() {
    modal.hidden = true;
    pendingId = null;
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".js-open-delete-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-session-id");
      if (!id) return;
      pendingId = id;
      const started = btn.getAttribute("data-session-started") || "";
      const focus = btn.getAttribute("data-session-focus") || "";
      if (summaryEl) {
        const parts = [`Started: ${started}`];
        if (focus) parts.push(`Focus: ${focus}`);
        summaryEl.textContent = parts.join(" · ");
      }
      openModal();
    });
  });

  modal.querySelectorAll(".js-close-delete-modal").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  confirmBtn.addEventListener("click", async () => {
    if (!pendingId) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";
    const showErr = (msg) => {
      if (typeof window.showAppToast === "function") {
        window.showAppToast(msg, { error: true });
      }
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Delete";
    };
    try {
      const url = `/api/session/${encodeURIComponent(pendingId)}/delete`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      let data = {};
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      } else {
        await res.text().catch(() => "");
      }
      if (res.ok && data.ok) {
        window.location.reload();
        return;
      }
      const fallback =
        res.status === 404
          ? "Delete failed: server returned not found. Restart the app if you just updated the code."
          : res.status >= 400
            ? `Delete failed (HTTP ${res.status}).`
            : "Could not delete session.";
      showErr(data.error || fallback);
    } catch {
      showErr("Network error — could not reach the server.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();
