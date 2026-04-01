(function () {
  const root = document.getElementById("session-live");
  if (!root) return;

  const sessionId = root.dataset.sessionId;
  const jsonEl = document.getElementById("timer-state-json");
  let state = JSON.parse(jsonEl.textContent);

  const elSessionTimer = document.getElementById("session-timer");
  const elBlockTimer = document.getElementById("block-timer");
  const elStatus = document.getElementById("status-label");
  const toast = document.getElementById("session-toast");

  const metricPr = document.getElementById("metric-pr");
  const metricFr = document.getElementById("metric-fr");
  const metricCprCur = document.getElementById("metric-cpr-cur");
  const metricCprBest = document.getElementById("metric-cpr-best");
  const metricCprSess = document.getElementById("metric-cpr-sess");

  let tickBase = performance.now();
  let sessionMsAtTick = state.session_active_ms;
  let blockMsAtTick = state.block_active_ms;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  function syncTickBaseline() {
    tickBase = performance.now();
    sessionMsAtTick = state.session_active_ms;
    blockMsAtTick = state.block_active_ms;
  }

  function applyState(s) {
    state = s;
    syncTickBaseline();
    if (elSessionTimer) {
      elSessionTimer.textContent = window.formatDurationMs(s.session_active_ms);
      elSessionTimer.dataset.ms = String(s.session_active_ms);
    }
    if (elBlockTimer) {
      elBlockTimer.textContent = window.formatDurationMs(s.block_active_ms);
      elBlockTimer.dataset.ms = String(s.block_active_ms);
    }
    if (elStatus) {
      elStatus.textContent = s.status;
      elStatus.className = `badge badge--${s.status}`;
    }
    if (metricPr) metricPr.textContent = String(s.pr_total ?? 0);
    if (metricFr) metricFr.textContent = String(s.fr_total ?? 0);
    if (metricCprCur) metricCprCur.textContent = String(s.cpr_block_current ?? 0);
    if (metricCprBest) metricCprBest.textContent = String(s.cpr_block_best ?? 0);
    if (metricCprSess) metricCprSess.textContent = String(s.cpr_session_best ?? 0);
  }

  function liveSessionMs() {
    if (state.status !== "active") return sessionMsAtTick;
    return sessionMsAtTick + (performance.now() - tickBase);
  }

  function liveBlockMs() {
    if (state.status !== "active") return blockMsAtTick;
    return blockMsAtTick + (performance.now() - tickBase);
  }

  function tick() {
    if (elSessionTimer && state.status === "active") {
      elSessionTimer.textContent = window.formatDurationMs(liveSessionMs());
    }
    if (elBlockTimer && state.status === "active") {
      elBlockTimer.textContent = window.formatDurationMs(liveBlockMs());
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  async function post(action, formData = null) {
    const url = `/api/session/${sessionId}/${action}`;
    const init = { method: "POST" };
    if (formData) {
      init.body = formData;
    }
    const res = await fetch(url, init);
    return res.json();
  }

  root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      if (!action) return;

      if (action === "pr" || action === "fr") {
        const data = await post(action);
        if (data.ok) {
          applyState(data.state);
        } else {
          showToast(data.error || "Action failed");
          if (data.state) applyState(data.state);
        }
        return;
      }

      if (action === "set-block") {
        const blockId = btn.getAttribute("data-block-id");
        const fd = new FormData();
        fd.set("block_id", blockId);
        const data = await post("block/current", fd);
        if (data.ok) {
          window.location.reload();
        } else {
          showToast(data.error || "Failed");
        }
        return;
      }

      const data = await post(action);
      if (data.ok) {
        window.location.reload();
      } else {
        showToast(data.error || "Failed");
      }
    });
  });

  const presetsEl = document.getElementById("block-presets-data");
  let blockPresets = [];
  if (presetsEl) {
    try {
      blockPresets = JSON.parse(presetsEl.textContent);
    } catch {
      blockPresets = [];
    }
  }

  document.querySelectorAll(".js-add-preset").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.getAttribute("data-preset-index"), 10);
      const preset = blockPresets[idx];
      if (!preset) return;
      const fd = new FormData();
      fd.set("name", preset.name || "Block");
      fd.set("purpose", preset.purpose != null ? String(preset.purpose) : "");
      fd.set("target", preset.target != null ? String(preset.target) : "");
      const data = await post("block", fd);
      if (data.ok) {
        window.location.reload();
      } else {
        showToast(data.error || "Failed to add block");
      }
    });
  });

  const addBlockForm = document.getElementById("add-block-form");
  if (addBlockForm) {
    addBlockForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(addBlockForm);
      const data = await post("block", fd);
      if (data.ok) {
        window.location.reload();
      } else {
        showToast(data.error || "Failed to add block");
      }
    });
  }

  const notesForm = document.getElementById("notes-form");
  if (notesForm) {
    notesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(notesForm);
      const data = await post("notes", fd);
      if (data.ok) {
        showToast("Notes saved");
      } else {
        showToast(data.error || "Failed");
      }
    });
  }
})();
