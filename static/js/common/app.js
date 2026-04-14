/**
 * Format milliseconds as H:MM:SS or M:SS for display.
 * @param {number} ms
 */
function formatDurationMs(ms) {
  ms = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

window.formatDurationMs = formatDurationMs;
if (!window.showToast && window.showAppToast) {
  window.showToast = function (message, asError) {
    window.showAppToast(message, { error: !!asError });
  };
}

(function () {
  const firstForm = document.getElementById("first-profile-form");
  if (firstForm) {
    firstForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = (firstForm.querySelector('input[name="name"]') || {}).value.trim();
      if (!name) return;
      const r = await fetch("/profiles/first", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
        credentials: "same-origin",
      });
      if (r.ok) window.location.reload();
    });
  }

  const addOpen = document.getElementById("profile-add-open");
  const addModal = document.getElementById("add-profile-modal");
  const addForm = document.getElementById("add-profile-form");
  const addCancel = document.getElementById("add-profile-cancel");

  function openAdd() {
    if (!addModal) return;
    addModal.hidden = false;
    const inp = document.getElementById("add-profile-name");
    if (inp) inp.focus();
  }

  function closeAdd() {
    if (addModal) addModal.hidden = true;
  }

  function wireModalRootClose(modal, onClose) {
    if (!modal) return;
    modal.addEventListener("click", function (e) {
      if (e.target === modal && onClose) onClose();
    });
  }

  if (addOpen) {
    addOpen.addEventListener("click", function (e) {
      e.preventDefault();
      openAdd();
    });
  }
  if (addCancel) addCancel.addEventListener("click", closeAdd);
  wireModalRootClose(addModal, closeAdd);

  if (addForm) {
    addForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = (addForm.querySelector('input[name="name"]') || {}).value.trim();
      if (!name) return;
      const r = await fetch("/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
        credentials: "same-origin",
      });
      if (r.ok) window.location.reload();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (addModal && !addModal.hidden) closeAdd();
  });
})();
