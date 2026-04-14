(function () {
  const dataEl = document.getElementById("report-data");
  if (!dataEl) return;

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
          y: { beginAtZero: true, border: { display: false }, max: 9 },
          x: { grid: { display: false }, border: { display: false } }
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
          legend: { display: true, position: "top" },
          tooltip: {
            backgroundColor: "rgba(26, 27, 31, 0.9)",
            titleFont: { size: 13, family: '"Outfit"' },
            bodyFont: { size: 14, family: '"Cascadia Code", monospace' },
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, border: { display: false } },
          x: { grid: { display: false }, border: { display: false } },
        },
        interaction: { mode: "index", axis: "x", intersect: false },
      },
    });
  }
})();

(function () {
  const tip = document.getElementById("session-rack-tooltip");
  if (!tip) return;

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
      const btn = e.target.closest(".rack-ball");
      if (!btn || !row.contains(btn)) return;
      showFor(btn);
    });
    row.addEventListener("mouseleave", function () {
      scheduleHide();
    });
    row.addEventListener("mousemove", function (e) {
      const btn = e.target.closest(".rack-ball");
      if (!btn || !row.contains(btn) || tip.hidden) return;
      if (!isMissBall(btn)) return;
      positionTip(btn);
    });
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
