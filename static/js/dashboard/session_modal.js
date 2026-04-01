(function () {
  const modal = document.getElementById("session-modal");
  const body = document.getElementById("session-modal-body");
  if (!modal || !body) return;

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    body.innerHTML = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".js-open-session").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-session-id");
      if (!id) return;
      openModal();
      body.innerHTML = "<p class=\"muted\">Loading…</p>";
      try {
        const res = await fetch(`/partials/session/${encodeURIComponent(id)}`);
        if (!res.ok) {
          body.innerHTML = "<p>Could not load session.</p>";
          if (typeof window.showAppToast === "function") {
            window.showAppToast(`Could not load session (${res.status}).`, { error: true });
          }
          return;
        }
        body.innerHTML = await res.text();
      } catch {
        body.innerHTML = "<p>Could not load session.</p>";
        if (typeof window.showAppToast === "function") {
          window.showAppToast("Network error while loading session.", { error: true });
        }
      }
    });
  });

  modal.querySelectorAll(".js-close-modal").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();
