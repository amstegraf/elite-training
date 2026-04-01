(function () {
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: "#8b9cb3", maxRotation: 45 },
        grid: { color: "rgba(139,156,179,0.12)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#8b9cb3" },
        grid: { color: "rgba(139,156,179,0.12)" },
      },
    },
  };

  async function load() {
    if (typeof Chart === "undefined") return;
    let res;
    try {
      res = await fetch("/api/reports/weekly?include_abandoned=false");
    } catch {
      if (typeof window.showAppToast === "function") {
        window.showAppToast("Could not load report data (network error).", { error: true });
      }
      return;
    }
    if (!res.ok) {
      if (typeof window.showAppToast === "function") {
        window.showAppToast(`Could not load report data (${res.status}).`, { error: true });
      }
      return;
    }
    let data;
    try {
      data = await res.json();
    } catch {
      if (typeof window.showAppToast === "function") {
        window.showAppToast("Report data was not valid JSON.", { error: true });
      }
      return;
    }
    const labels = data.labels || [];

    if (labels.length === 0) {
      document.querySelectorAll(".reports__charts canvas").forEach((c) => {
        const p = c.closest(".chart-card");
        if (p) p.querySelector("h2").textContent += " (no data yet)";
      });
      return;
    }

    const text = "#e7ecf3";
    chartOpts.plugins.legend = { labels: { color: text } };

    new Chart(document.getElementById("chart-pr"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "PR",
            data: data.pr,
            backgroundColor: "rgba(52, 199, 89, 0.55)",
            borderColor: "rgba(52, 199, 89, 0.9)",
            borderWidth: 1,
          },
        ],
      },
      options: chartOpts,
    });

    new Chart(document.getElementById("chart-fr"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "FR",
            data: data.fr,
            backgroundColor: "rgba(255, 69, 58, 0.45)",
            borderColor: "rgba(255, 69, 58, 0.85)",
            borderWidth: 1,
          },
        ],
      },
      options: chartOpts,
    });

    new Chart(document.getElementById("chart-hours"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Hours",
            data: data.hours,
            fill: true,
            backgroundColor: "rgba(61, 156, 240, 0.15)",
            borderColor: "rgba(61, 156, 240, 0.9)",
            tension: 0.2,
          },
        ],
      },
      options: chartOpts,
    });

    new Chart(document.getElementById("chart-cpr"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Best CPR",
            data: data.best_cpr,
            borderColor: "rgba(255, 214, 10, 0.9)",
            backgroundColor: "rgba(255, 214, 10, 0.1)",
            tension: 0.2,
          },
        ],
      },
      options: chartOpts,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
