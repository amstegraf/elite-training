/**
 * Mesh health + cached analysis hint; pool coach modal with cache / regenerate.
 * Buttons: .btn--ai[data-pool-coach-scope][data-session-id for session].
 */
(function () {
  var HEALTH = "/api/ai/mesh-health";
  var CACHED = "/api/ai/pool-coach/cached";
  var COACH = "/api/ai/pool-coach";

  var coachState = { scope: null, sessionId: "" };

  function grayAiButtons(buttons) {
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      btn.title =
        "AI coach unavailable (mesh not reachable). Check Settings → AI coach / mesh.";
      btn.style.background = "var(--surface2, #e8e9ed)";
      btn.style.color = "var(--muted, #6b7280)";
      btn.style.border = "1px solid var(--border, #e5e7eb)";
      btn.style.boxShadow = "none";
      btn.style.cursor = "not-allowed";
      btn.onmouseover = null;
      btn.onmouseout = null;
    }
  }

  function pingMesh() {
    return fetch(HEALTH, { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        return data.reachable === true;
      })
      .catch(function () {
        return false;
      });
  }

  function checkCached(scope, sessionId) {
    var q = "scope=" + encodeURIComponent(scope);
    if (scope === "session") {
      if (!sessionId) return Promise.resolve(false);
      q += "&sessionId=" + encodeURIComponent(sessionId);
    }
    return fetch(CACHED + "?" + q, { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        return d.hasCached === true;
      })
      .catch(function () {
        return false;
      });
  }

  function wireCopyButton(bodyEl) {
    var copyBtn = document.getElementById("pool-coach-copy");
    if (!copyBtn) return null;
    copyBtn.style.display = "none";
    var newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    newCopyBtn.addEventListener("click", function () {
      if (!bodyEl.textContent) return;
      navigator.clipboard.writeText(bodyEl.textContent).then(function () {
        var originalContent = newCopyBtn.innerHTML;
        newCopyBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copied!';
        setTimeout(function () {
          newCopyBtn.innerHTML = originalContent;
        }, 2000);
      });
    });
    return newCopyBtn;
  }

  function setLoading(statusEl, loading) {
    if (!statusEl) return;
    if (loading) {
      statusEl.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Contacting coach…';
    }
  }

  function runCoach(scope, sessionId, regenerate) {
    var dlg = document.getElementById("pool-coach-dialog");
    var statusEl = document.getElementById("pool-coach-status");
    var bodyEl = document.getElementById("pool-coach-body");
    var regenBtn = document.getElementById("pool-coach-regenerate");
    if (!dlg || !statusEl || !bodyEl) return;

    var copyBtn = wireCopyButton(bodyEl);
    setLoading(statusEl, true);
    bodyEl.textContent = "";
    if (regenBtn) {
      regenBtn.style.display = "none";
      regenBtn.disabled = true;
    }
    if (copyBtn) copyBtn.style.display = "none";

    var payload = { scope: scope, regenerate: !!regenerate };
    if (scope === "session" && sessionId) payload.sessionId = sessionId;

    return fetch(COACH, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          var d = res.data && (res.data.detail || res.data.message);
          statusEl.textContent =
            "Request failed" + (res.status ? " (" + res.status + ")" : "") + ".";
          bodyEl.textContent =
            typeof d === "string" ? d : JSON.stringify(res.data || {}, null, 2);
          return;
        }
        var data = res.data;
        if (data.blocked) {
          statusEl.textContent = "Blocked by mesh policy.";
          bodyEl.textContent = (data.reason || "") + "\n\n" + (data.outputText || "");
          return;
        }
        if (data.ok === false) {
          statusEl.textContent = "Coach run did not complete successfully.";
          bodyEl.textContent = (data.reason || "") + "\n\n" + (data.outputText || "");
          return;
        }
        if (data.fromCache) {
          statusEl.textContent = "Saved analysis (no new request).";
        } else {
          statusEl.textContent = "";
        }
        bodyEl.textContent = data.outputText || "(No text in response.)";
        if (regenBtn) {
          regenBtn.style.display = "flex";
          regenBtn.disabled = false;
        }
        if (copyBtn && bodyEl.textContent && bodyEl.textContent !== "(No text in response.)") {
          copyBtn.style.display = "flex";
        }
      })
      .catch(function () {
        statusEl.textContent = "Network error.";
        bodyEl.textContent = "";
      });
  }

  function wireDialog() {
    var dlg = document.getElementById("pool-coach-dialog");
    if (!dlg) return;
    function close() {
      try {
        dlg.close();
      } catch (e) {}
    }
    var c1 = document.getElementById("pool-coach-close");
    var c2 = document.getElementById("pool-coach-dismiss");
    if (c1) c1.addEventListener("click", close);
    if (c2) c2.addEventListener("click", close);
    dlg.addEventListener("click", function (ev) {
      if (ev.target === dlg) close();
    });

    var regenBtn = document.getElementById("pool-coach-regenerate");
    if (regenBtn) {
      regenBtn.addEventListener("click", function () {
        if (!coachState.scope || regenBtn.disabled) return;
        runCoach(coachState.scope, coachState.sessionId, true);
      });
    }
  }

  function openCoach(scope, sessionId) {
    var dlg = document.getElementById("pool-coach-dialog");
    if (!dlg) return;
    coachState.scope = scope;
    coachState.sessionId = sessionId || "";
    try {
      dlg.showModal();
    } catch (e) {}
    runCoach(scope, coachState.sessionId, false);
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireDialog();
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".btn--ai"));
    if (!buttons.length) return;

    var probe = buttons[0];
    var scope = probe.getAttribute("data-pool-coach-scope");
    var sessionId = probe.getAttribute("data-session-id") || "";

    Promise.all([
      pingMesh(),
      scope ? checkCached(scope, sessionId) : Promise.resolve(false),
    ]).then(function (pair) {
      var meshOk = pair[0];
      var hasCached = pair[1];
      if (!meshOk && !hasCached) {
        grayAiButtons(buttons);
        return;
      }
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (btn.disabled) return;
          var sc = btn.getAttribute("data-pool-coach-scope");
          if (!sc) return;
          var sid = btn.getAttribute("data-session-id") || "";
          openCoach(sc, sid);
        });
      });
    });
  });
})();
