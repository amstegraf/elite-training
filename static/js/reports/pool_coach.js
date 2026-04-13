/**
 * Mesh health on load (gray .btn--ai when unreachable) and pool coach modal.
 * Buttons: .btn--ai[data-pool-coach-scope="session|progress"][data-session-id] (session id when scope=session).
 */
(function () {
  var HEALTH = "/api/ai/mesh-health";
  var COACH = "/api/ai/pool-coach";

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
  }

  function openCoach(scope, sessionId) {
    var dlg = document.getElementById("pool-coach-dialog");
    var statusEl = document.getElementById("pool-coach-status");
    var bodyEl = document.getElementById("pool-coach-body");
    if (!dlg || !statusEl || !bodyEl) return;

    statusEl.textContent = "Contacting coach…";
    bodyEl.textContent = "";
    try {
      dlg.showModal();
    } catch (e) {}

    var payload = { scope: scope };
    if (scope === "session" && sessionId) payload.sessionId = sessionId;

    fetch(COACH, {
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
          statusEl.textContent = "Request failed" + (res.status ? " (" + res.status + ")" : "") + ".";
          bodyEl.textContent =
            typeof d === "string"
              ? d
              : JSON.stringify(res.data || {}, null, 2);
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
        statusEl.textContent = "";
        bodyEl.textContent = data.outputText || "(No text in response.)";
      })
      .catch(function () {
        statusEl.textContent = "Network error.";
        bodyEl.textContent = "";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireDialog();
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".btn--ai"));
    if (!buttons.length) return;

    pingMesh().then(function (reachable) {
      if (!reachable) {
        grayAiButtons(buttons);
        return;
      }
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (btn.disabled) return;
          var scope = btn.getAttribute("data-pool-coach-scope");
          if (!scope) return;
          var sessionId = btn.getAttribute("data-session-id") || "";
          openCoach(scope, sessionId);
        });
      });
    });
  });
})();
