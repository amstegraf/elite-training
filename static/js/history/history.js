(function () {
  document.querySelectorAll(".js-delete-session").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const id = row && row.dataset.sessionId;
      if (!id) return;
      if (!confirm("Delete this session permanently?")) return;
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        row.remove();
      } else if (window.showToast) {
        window.showToast("Could not delete session", true);
      } else {
        alert("Could not delete session");
      }
    });
  });
})();
