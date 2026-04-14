(function () {
  document.querySelectorAll(".dashboard-tier-meta__bar-fill[data-progress]").forEach(function (el) {
    const pct = parseFloat(el.dataset.progress || "0");
    const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
    el.style.width = clamped + "%";
  });

  function openModalById(id) {
    const modal = document.getElementById(id);
    if (modal && typeof modal.showModal === "function") {
      modal.showModal();
    }
  }

  document.querySelectorAll("[data-open-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const modalId = btn.getAttribute("data-open-modal");
      if (!modalId) return;
      openModalById(modalId);

      const programId = btn.getAttribute("data-program-id");
      if (modalId === "plan-modal" && programId) {
        const select = document.querySelector('#plan-modal select[name="program_id"]');
        if (select) select.value = programId;
      }
    });
  });

  document.querySelectorAll("[data-close-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const dialog = btn.closest("dialog");
      if (dialog && typeof dialog.close === "function") {
        dialog.close();
      }
    });
  });
})();
