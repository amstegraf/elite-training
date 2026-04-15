(function () {
  const dataEl = document.getElementById("report-data");
  if (!dataEl) return;
  const isCompact = window.matchMedia("(max-width: 768px)").matches;

  document.querySelectorAll(".bar-fill[data-width]").forEach((el) => {
    const width = parseFloat(el.dataset.width || "0");
    const clamped = Math.max(0, Math.min(100, Number.isFinite(width) ? width : 0));
    el.style.width = clamped + "%";
    if (el.dataset.color) {
      el.style.backgroundColor = el.dataset.color;
    }
  });

  const sessionId = dataEl.dataset.sessionId;
  let rawData = {};
  try {
    rawData = JSON.parse(JSON.parse(dataEl.dataset.chart || "{}"));
  } catch (err) {
    rawData = {};
  }

  const btn = document.getElementById("btn-delete-session");
  if (btn && sessionId) {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this session permanently?")) return;
      const res = await fetch("/api/sessions/" + sessionId, { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/history";
      } else if (window.showToast) {
        window.showToast("Could not delete session", true);
      } else {
        alert("Could not delete session");
      }
    });
  }

  const rackEditDialog = document.getElementById("rack-edit-dialog");
  const rackEditForm = document.getElementById("rack-edit-form");
  const rackEditBalls = document.getElementById("rack-edit-balls");
  const rackEditCount = document.getElementById("rack-edit-count");
  const rackEditCancel = document.getElementById("rack-edit-cancel");
  const rackEditOpenBtns = Array.from(document.querySelectorAll(".rack-edit__open"));
  let rackEditState = { rackId: "", rackNumber: "", selected: new Set() };

  function buildRackEditBall(n, selectedSet) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `rack-edit-ball rack-ball rack-ball--n${n}`;
    btn.setAttribute("data-ball", String(n));
    btn.setAttribute("aria-label", `Ball ${n}`);
    btn.innerHTML =
      `<span class="rack-ball__face"><span class="rack-ball__n">${n}</span></span>` +
      `<span class="rack-edit-ball__check" aria-hidden="true">` +
      `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="6" cy="6" r="5.5" fill="#dcfce7" stroke="#16a34a" stroke-width="0.75"/>` +
      `<path d="M3.2 6.1l2.1 2.1L8.9 3.6" stroke="#15803d" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>` +
      `</span>`;
    if (selectedSet.has(n)) btn.classList.add("is-selected");
    btn.addEventListener("click", () => {
      if (selectedSet.has(n)) selectedSet.delete(n);
      else selectedSet.add(n);
      btn.classList.toggle("is-selected", selectedSet.has(n));
      if (rackEditCount) rackEditCount.textContent = String(selectedSet.size);
    });
    return btn;
  }

  function openRackEditDialog(btn) {
    if (!rackEditDialog || !rackEditForm || !rackEditBalls || !rackEditCount) return;
    const rackId = btn.getAttribute("data-rack-id") || "";
    const rackNumber = btn.getAttribute("data-rack-number") || "";
    const cleared = Math.max(
      0,
      Math.min(9, parseInt(btn.getAttribute("data-balls-cleared") || "0", 10) || 0)
    );
    const selected = new Set();
    for (let i = 1; i <= cleared; i++) selected.add(i);
    rackEditState = { rackId, rackNumber, selected };

    rackEditBalls.innerHTML = "";
    for (let i = 1; i <= 9; i++) rackEditBalls.appendChild(buildRackEditBall(i, selected));
    rackEditCount.textContent = String(selected.size);
    rackEditDialog.showModal();
  }

  if (rackEditCancel && rackEditDialog) {
    rackEditCancel.addEventListener("click", () => rackEditDialog.close());
  }
  rackEditOpenBtns.forEach((btn) => {
    btn.addEventListener("click", () => openRackEditDialog(btn));
  });

  if (rackEditForm && rackEditDialog) {
    rackEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ballsCleared = rackEditState.selected.size;
      const rackId = rackEditState.rackId;
      if (!sessionId || !rackId) return;
      const submitBtn = rackEditForm.querySelector(".btn-save-action");
      const cancelBtn = rackEditForm.querySelector("#rack-edit-cancel");
      if (submitBtn) submitBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/racks/${encodeURIComponent(
            rackId
          )}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ballsCleared }),
          }
        );
        if (!res.ok) {
          let detail = `Could not update rack${rackEditState.rackNumber ? " " + rackEditState.rackNumber : ""}.`;
          try {
            const body = await res.json();
            if (body && typeof body.detail === "string") detail = body.detail;
          } catch (err) {}
          if (window.showToast) window.showToast(detail, true);
          else alert(detail);
          if (submitBtn) submitBtn.disabled = false;
          if (cancelBtn) cancelBtn.disabled = false;
          return;
        }
        rackEditDialog.close();
        window.location.reload();
      } catch (err) {
        if (window.showToast) window.showToast("Network error while updating rack.", true);
        else alert("Network error while updating rack.");
        if (submitBtn) submitBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
      }
    });
  }

  const canvas = document.getElementById("chart-rack-runs");
  if (canvas && rawData.labels && rawData.labels.length > 0) {
    Chart.defaults.font.family = '"Outfit", "Inter", system-ui, sans-serif';
    Chart.defaults.color = "#8e9199";
    Chart.defaults.scale.grid.color = "rgba(0, 0, 0, 0.04)";

    new Chart(canvas, {
      type: "line",
      data: {
        labels: rawData.labels,
        datasets: [{
          label: "Best Run",
          data: rawData.runs,
          borderColor: "#ff694b",
          backgroundColor: "rgba(255, 105, 75, 0.2)",
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBorderColor: "#ff694b",
          pointBackgroundColor: "#fff",
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(26, 27, 31, 0.9)",
            titleFont: { size: 13, family: '"Outfit"' },
            bodyFont: { size: 14, family: '"Cascadia Code", monospace' },
            padding: 12,
            cornerRadius: 8,
          }
        },
        scales: {
          y: { beginAtZero: true, border: { display: false }, max: 9, ticks: { maxTicksLimit: isCompact ? 5 : 10 } },
          x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: isCompact ? 6 : 12 } }
        },
        interaction: { mode: "nearest", axis: "x", intersect: false }
      }
    });
  }

  const posSpdCanvas = document.getElementById("chart-pos-speed-rack");
  if (
    posSpdCanvas &&
    rawData.labels &&
    rawData.labels.length > 0 &&
    rawData.position_misses_per_rack &&
    rawData.speed_misses_per_rack
  ) {
    new Chart(posSpdCanvas, {
      type: "line",
      data: {
        labels: rawData.labels,
        datasets: [
          {
            label: "Position tags",
            data: rawData.position_misses_per_rack,
            borderColor: "#7c3aed",
            backgroundColor: "rgba(124, 58, 237, 0.08)",
            fill: false,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderColor: "#7c3aed",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 2,
          },
          {
            label: "Speed tags",
            data: rawData.speed_misses_per_rack,
            borderColor: "#0284c7",
            backgroundColor: "rgba(2, 132, 199, 0.08)",
            fill: false,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderColor: "#0284c7",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: isCompact ? "bottom" : "top" },
          tooltip: {
            backgroundColor: "rgba(26, 27, 31, 0.9)",
            titleFont: { size: 13, family: '"Outfit"' },
            bodyFont: { size: 14, family: '"Cascadia Code", monospace' },
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, maxTicksLimit: isCompact ? 5 : 10 }, border: { display: false } },
          x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: isCompact ? 6 : 12 } },
        },
        interaction: { mode: "index", axis: "x", intersect: false },
      },
    });
  }
})();

(function () {
  const tip = document.getElementById("session-rack-tooltip");
  if (!tip) return;
  const isTouchDevice =
    window.matchMedia("(hover: none), (pointer: coarse)").matches ||
    "ontouchstart" in window;

  if (tip.parentElement !== document.body) {
    document.body.appendChild(tip);
  }

  let hideTimer = null;
  let lastAnchor = null;
  const HIDE_DELAY_MS = 280;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function parseEvents(btn) {
    const raw = btn.getAttribute("data-tip-events");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function isMissBall(btn) {
    const s = btn.getAttribute("data-state") || "";
    return s === "miss_hard" || s === "miss_soft";
  }

  function hideTipNow() {
    clearHideTimer();
    tip.hidden = true;
    tip.classList.remove("rack-tooltip--visible");
    tip.replaceChildren();
    lastAnchor = null;
  }

  function fillTip(btn) {
    tip.replaceChildren();
    const surface = document.createElement("div");
    surface.className = "rack-tooltip__surface";

    const ball = btn.getAttribute("data-ball") || "";
    const events = parseEvents(btn) || [];

    const title = document.createElement("div");
    title.className = "rack-tooltip__title";
    title.textContent = "Ball " + ball + " - Miss";
    surface.appendChild(title);

    if (events.length) {
      function addLabeledField(container, labelText, valueText) {
        const wrap = document.createElement("div");
        wrap.className = "rack-tooltip__field";
        const lab = document.createElement("div");
        lab.className = "rack-tooltip__label";
        lab.textContent = labelText;
        const val = document.createElement("div");
        val.className = "rack-tooltip__value";
        val.textContent = valueText;
        wrap.appendChild(lab);
        wrap.appendChild(val);
        container.appendChild(wrap);
      }
      events.forEach(function (ev, idx) {
        const block = document.createElement("div");
        block.className = "rack-tooltip__section";
        if (events.length > 1) {
          const k = document.createElement("div");
          k.className = "rack-tooltip__kicker";
          k.textContent = "Miss " + (idx + 1);
          block.appendChild(k);
        }
        addLabeledField(block, "Types", ev.types || "—");
        addLabeledField(block, "Outcome", ev.outcome_label || "—");
        surface.appendChild(block);
      });
    } else {
      const p = document.createElement("p");
      p.className = "rack-tooltip__body";
      p.textContent = "Miss logged (no type details).";
      surface.appendChild(p);
    }

    tip.appendChild(surface);
  }

  function positionTip(anchor) {
    const rect = anchor.getBoundingClientRect();
    const margin = 6;
    tip.style.position = "fixed";
    tip.style.left = "0px";
    tip.style.top = "0px";
    tip.style.zIndex = "2000";
    tip.hidden = false;
    tip.style.visibility = "hidden";
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.bottom + margin;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
    if (left < 8) left = 8;
    if (top + th > window.innerHeight - 8) top = rect.top - th - margin;
    if (top < 8) top = 8;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
    tip.style.visibility = "visible";
  }

  function showFor(btn) {
    if (!isMissBall(btn)) {
      hideTipNow();
      return;
    }
    clearHideTimer();
    lastAnchor = btn;
    fillTip(btn);
    tip.classList.add("rack-tooltip--visible");
    if (isTouchDevice) {
      tip.style.pointerEvents = "auto";
    }
    positionTip(btn);
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimer = setTimeout(function () {
      hideTipNow();
    }, HIDE_DELAY_MS);
  }

  tip.addEventListener("mouseenter", function () {
    clearHideTimer();
  });
  tip.addEventListener("mouseleave", function () {
    scheduleHide();
  });

  document.querySelectorAll(".rack-timeline").forEach(function (row) {
    row.addEventListener("focusin", function (e) {
      const btn = e.target.closest(".rack-ball");
      if (!btn || !row.contains(btn)) return;
      showFor(btn);
    }, true);
    row.addEventListener("focusout", function () {
      scheduleHide();
    }, true);
    row.addEventListener("mouseover", function (e) {
      if (isTouchDevice) return;
      const btn = e.target.closest(".rack-ball");
      if (!btn || !row.contains(btn)) return;
      showFor(btn);
    });
    row.addEventListener("mouseleave", function () {
      if (isTouchDevice) return;
      scheduleHide();
    });
    row.addEventListener("mousemove", function (e) {
      if (isTouchDevice) return;
      const btn = e.target.closest(".rack-ball");
      if (!btn || !row.contains(btn) || tip.hidden) return;
      if (!isMissBall(btn)) return;
      positionTip(btn);
    });
    row.addEventListener("click", function (e) {
      const btn = e.target.closest(".rack-ball");
      if (!btn || !row.contains(btn) || !isMissBall(btn)) {
        if (isTouchDevice) hideTipNow();
        return;
      }
      if (isTouchDevice && lastAnchor === btn && !tip.hidden) {
        hideTipNow();
        return;
      }
      showFor(btn);
    });
  });

  document.addEventListener("click", function (e) {
    if (tip.hidden) return;
    const onMissBall = e.target.closest(".rack-ball--miss_hard, .rack-ball--miss_soft");
    if (onMissBall || tip.contains(e.target)) return;
    hideTipNow();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !tip.hidden) {
      hideTipNow();
    }
  });

  window.addEventListener("scroll", function () {
    if (tip.hidden || !lastAnchor || !isMissBall(lastAnchor)) return;
    positionTip(lastAnchor);
  }, true);
})();
