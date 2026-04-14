(function () {
  const root = document.querySelector(".session-live");
  if (!root) return;

  const sessionId = root.dataset.sessionId;
  const dialog = document.getElementById("miss-dialog");
  const rackDialog = document.getElementById("rack-end-dialog");
  const btnMiss = document.getElementById("btn-log-miss");
  const btnEndRack = document.getElementById("btn-end-rack");
  const btnNewRack = document.getElementById("btn-new-rack");
  const btnEndSession = document.getElementById("btn-end-session");
  const missForm = document.getElementById("miss-form");
  const rackForm = document.getElementById("rack-end-form");
  const missCancel = document.getElementById("miss-cancel");
  const rackCancel = document.getElementById("rack-cancel");
  const endRackCheckboxes = document.querySelectorAll('.end-ball-checkbox');
  const endRackCount = document.getElementById("end-rack-count");
  const rackLabel = document.getElementById("rack-label");
  const missTotal = document.getElementById("miss-total");
  const rulesBanner = document.getElementById("rules-banner");
  const rackHint = document.getElementById("rack-state-hint");
  const missFeed = document.getElementById("miss-feed");
  const btnConnectPhone = document.getElementById("btn-connect-phone");
  const btnRefreshConnect = document.getElementById("btn-refresh-connect");
  const btnCopyConnectUrl = document.getElementById("btn-copy-connect-url");
  const connectPanel = document.getElementById("mobile-connect-panel");
  const connectQr = document.getElementById("mobile-connect-qr");
  const connectUrl = document.getElementById("mobile-connect-url");
  const connectExpiry = document.getElementById("mobile-connect-expiry");
  const connectManual = document.getElementById("mobile-connect-manual");

  const btnPause = document.getElementById("btn-pause");
  const iconPause = document.getElementById("icon-pause");
  const iconPlay = document.getElementById("icon-play");
  const btnPauseText = document.getElementById("btn-pause-text");
  const durationLabel = document.getElementById("session-duration");

  function updateEndRackCount() {
    let count = 0;
    endRackCheckboxes.forEach(cb => { if (cb.checked) count++; });
    if (endRackCount) endRackCount.textContent = count;
  }

  endRackCheckboxes.forEach(cb => {
    cb.addEventListener("change", updateEndRackCount);
  });

  let live = null;
  let connectInfo = null;
  let currentDurationSeconds = 0;
  let timerInterval = null;
  let syncInterval = null;

  function setConnectStatus(text, isError) {
    if (!connectExpiry) return;
    connectExpiry.textContent = text;
    connectExpiry.style.color = isError ? "var(--danger)" : "";
  }

  function renderQrValue(value) {
    if (!connectQr) return;
    if (!value) {
      connectQr.removeAttribute("src");
      if (connectManual) connectManual.open = true;
      setConnectStatus("QR image unavailable. Use manual URL.", true);
      return;
    }
    connectQr.src = value;
    if (connectManual) connectManual.open = false;
  }

  function renderConnectInfo() {
    if (!connectInfo) return;
    if (connectUrl) {
      connectUrl.textContent = connectInfo.connectUrl || "Not available";
    }
    const expires = new Date(connectInfo.expiresAt);
    const stamp = Number.isNaN(expires.getTime()) ? "soon" : expires.toLocaleTimeString();
    setConnectStatus(`Token expires at ${stamp}.`, false);
    renderQrValue(connectInfo.qrDataUrl);
  }

  async function refreshConnectInfo() {
    const res = await fetch(`/api/sessions/${sessionId}/mobile/connect`, { method: "POST" });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).detail || "Could not generate connect QR";
      setConnectStatus(msg, true);
      return;
    }
    connectInfo = await res.json();
    renderConnectInfo();
  }

  function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
  }

  function updateTimerUI() {
    if (durationLabel) {
      durationLabel.textContent = formatTime(currentDurationSeconds);
    }
  }

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!live || live.session.isPaused) return;
    currentDurationSeconds++;
    updateTimerUI();
  }, 1000);

  function currentRack() {
    if (!live || !live.session) return null;
    const id = live.session.currentRackId;
    if (!id) return null;
    return live.session.racks.find((r) => r.id === id) || null;
  }

  function renderMissFeed(session) {
    missFeed.innerHTML = "";
    const items = [];
    for (const rack of session.racks) {
      for (const m of rack.misses) {
        items.push({ rack: rack.rackNumber, m });
      }
    }
    items.sort((a, b) => (a.m.createdAt < b.m.createdAt ? 1 : -1));
    
    let lastRack = null;

    items.slice(0, 12).forEach(({ rack, m }) => {
      if (lastRack !== null && lastRack !== rack) {
        const sep = document.createElement("li");
        sep.innerHTML = `<hr style="border: 0; border-top: 1px dashed var(--border); margin: 0.25rem 0;" />`;
        missFeed.appendChild(sep);
      }
      lastRack = rack;

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "1rem";
      li.style.padding = "0.85rem 0";
      
      const typesHtml = m.types.map(t => `<span class="pill pill--active" style="margin-left:0; margin-right:0.35rem; font-size: 0.7rem; background: var(--surface2); color: var(--text); border: 1px solid var(--border);">${t}</span>`).join('');
      const outcomeText = m.outcome.replace('_', ' ');

      li.innerHTML = `
        <div class="ball-chip ball-${m.ballNumber}" style="pointer-events: none; width: 36px; height: 36px; flex-shrink: 0; box-shadow: none;">
          <span style="width: 36px; height: 36px; font-size: 0.95rem; box-shadow: none;">${m.ballNumber}</span>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.25rem;">
          <div class="row-actions" style="margin: 0; gap: 0;">${typesHtml}</div>
          <div class="muted small" style="text-transform: capitalize;">Rack ${rack} &middot; ${outcomeText}</div>
        </div>
      `;
      missFeed.appendChild(li);
    });
  }

  function render() {
    if (!live) return;
    const session = live.session;
    const rack = currentRack();
    missTotal.textContent = String(session.totalMisses ?? 0);
    if (rack) {
      rackLabel.textContent = `Rack ${rack.rackNumber}`;
      btnMiss.disabled = false;
      btnEndRack.disabled = false;
      btnNewRack.disabled = true;
      rackHint.textContent = "Log misses on this rack, then end the rack when finished.";
    } else {
      rackLabel.textContent = "No open rack";
      btnMiss.disabled = true;
      btnEndRack.disabled = true;
      btnNewRack.disabled = false;
      rackHint.textContent = "Start the next rack to keep training.";
    }

    const rules = live.rules || {};
    if (rules.warn || rules.resetSuggested) {
      rulesBanner.hidden = false;
      rulesBanner.className = "rules-banner" + (rules.resetSuggested ? " rules-banner--strong" : "");
      rulesBanner.textContent = rules.resetSuggested
        ? "Rule: consider resetting the rack after consecutive misses."
        : "Heads up: approaching your miss threshold for this rack.";
    } else {
      rulesBanner.hidden = true;
      rulesBanner.textContent = "";
    }
    renderMissFeed(session);

    if (btnPause && iconPause && iconPlay) {
      if (session.isPaused) {
        iconPause.style.display = "none";
        iconPlay.style.display = "inline-block";
        if (btnPauseText) btnPauseText.textContent = "Resume timing";
      } else {
        iconPause.style.display = "inline-block";
        iconPlay.style.display = "none";
        if (btnPauseText) btnPauseText.textContent = "Pause timing";
      }
    }
    updateTimerUI();
  }

  async function refresh() {
    const res = await fetch(`/api/sessions/${sessionId}/live`);
    if (!res.ok) {
      if (window.showToast) window.showToast("Could not load session", true);
      return;
    }
    live = await res.json();
    currentDurationSeconds = live.effectiveDuration || 0;
    
    const rack = currentRack();
    if (missForm && live.suggestedNextBall != null) {
      if (missForm.elements['ball_number']) {
        missForm.elements['ball_number'].value = String(live.suggestedNextBall);
      }
    }
    render();
  }

  async function refreshSilent() {
    if (document.hidden) return;
    const res = await fetch(`/api/sessions/${sessionId}/live`);
    if (!res.ok) return;
    const next = await res.json();
    const prevMisses = live?.session?.totalMisses ?? 0;
    live = next;
    currentDurationSeconds = live.effectiveDuration || 0;
    render();
    if (window.showToast && (live.session.totalMisses ?? 0) > prevMisses) {
      window.showToast("Session updated");
    }
  }

  if (btnPause) {
    btnPause.addEventListener("click", async () => {
      if (!live) return;
      const willPause = !live.session.isPaused;
      // Optimistic update
      live.session.isPaused = willPause;
      render();
      
      const res = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pause: willPause })
      });
      if (!res.ok) {
        // Revert on err
        live.session.isPaused = !willPause;
        render();
        if (window.showToast) window.showToast("Could not toggle pause", true);
      }
    });
  }

  btnMiss.addEventListener("click", () => {
    if (dialog) dialog.showModal();
  });

  if (btnConnectPhone && connectPanel) {
    btnConnectPhone.addEventListener("click", async () => {
      const willShow = connectPanel.hidden;
      connectPanel.hidden = !willShow;
      if (willShow && !connectInfo) {
        await refreshConnectInfo();
      }
    });
  }
  if (btnRefreshConnect) {
    btnRefreshConnect.addEventListener("click", async () => {
      await refreshConnectInfo();
    });
  }
  if (btnCopyConnectUrl) {
    btnCopyConnectUrl.addEventListener("click", async () => {
      if (!connectInfo || !connectInfo.connectUrl) return;
      try {
        await navigator.clipboard.writeText(connectInfo.connectUrl);
        if (window.showToast) window.showToast("Connect URL copied");
      } catch (_) {
        if (window.showToast) window.showToast("Could not copy connect URL", true);
      }
    });
  }
  missCancel.addEventListener("click", () => dialog.close());
  rackCancel.addEventListener("click", () => rackDialog.close());

  function missBreaksRunClient(m) {
    return m.outcome === "pot_miss" || m.outcome === "both";
  }

  missForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rack = currentRack();
    if (!rack) return;
    const types = Array.from(missForm.querySelectorAll('input[name="types"]:checked')).map(
      (i) => i.value
    );
    const outcome = missForm.outcome.value;
    const payload = {
      ballNumber: parseInt(missForm.elements['ball_number'].value, 10),
      types,
      outcome,
    };
    const res = await fetch(`/api/sessions/${sessionId}/racks/${rack.id}/misses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).detail || "Could not save miss";
      if (window.showToast) window.showToast(msg, true);
      else alert(msg);
      return;
    }
    await refresh();
    dialog.close();
  });

  btnEndRack.addEventListener("click", () => {
    const rack = currentRack();
    if (rack) {
      let maxBall = live.suggestedNextBall ? live.suggestedNextBall - 1 : 0;
      const missedBalls = new Set();
      if (rack.misses && rack.misses.length > 0) {
        rack.misses.forEach(m => {
          if (missBreaksRunClient(m)) {
            missedBalls.add(m.ballNumber);
          }
          maxBall = Math.max(maxBall, m.ballNumber);
        });
      }
      
      endRackCheckboxes.forEach(cb => {
        const num = parseInt(cb.value, 10);
        if (num <= maxBall && !missedBalls.has(num)) {
          cb.checked = true;
        } else {
          cb.checked = false;
        }
      });
      updateEndRackCount();
    }
    rackDialog.showModal();
  });

  rackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rack = currentRack();
    if (!rack) return;
    
    let count = 0;
    endRackCheckboxes.forEach(cb => { if (cb.checked) count++; });

    const res = await fetch(`/api/sessions/${sessionId}/racks/${rack.id}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ballsCleared: count }),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).detail || "Could not end rack";
      if (window.showToast) window.showToast(msg, true);
      else alert(msg);
      return;
    }
    rackDialog.close();
    await refresh();
  });

  btnNewRack.addEventListener("click", async () => {
    const res = await fetch(`/api/sessions/${sessionId}/racks`, { method: "POST" });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).detail || "Could not start rack";
      if (window.showToast) window.showToast(msg, true);
      else alert(msg);
      return;
    }
    await refresh();
  });

  btnEndSession.addEventListener("click", async () => {
    if (!confirm("End this session? The current rack must be closed first.")) return;
    const res = await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).detail || "Could not end session";
      if (window.showToast) window.showToast(msg, true);
      else alert(msg);
      return;
    }
    window.location.href = `/session/${sessionId}/report`;
  });

  refresh();
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    refreshSilent().catch(() => {});
  }, 2500);
})();
