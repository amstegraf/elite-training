(function () {
  const cfg = document.getElementById("tiers-config");
  if (!cfg) return;

  let tierNames = [];
  try {
    tierNames = JSON.parse(cfg.dataset.tierNames || "[]");
  } catch (e) {
    tierNames = [];
  }

  function tierPointsCeilingFromScale(scale) {
    return Math.max(200, scale * 4);
  }

  function syncCompPtSliderMaxes() {
    const scaleEl = document.querySelector('[name=points_scale]');
    if (!scaleEl) return;
    const scale = parseInt(scaleEl.value, 10) || 1000;
    const cap = tierPointsCeilingFromScale(scale);
    for (let i = 0; i < 5; i++) {
      const r = document.querySelector('[data-comp-pt-range="' + i + '"]');
      if (r) {
        r.max = String(Math.max(cap - 1, 10));
      }
    }
  }

  function updateSandbox() {
    const pot = parseFloat(document.getElementById('mock_pot').value);
    const pos = parseFloat(document.getElementById('mock_pos').value);
    const conv = parseFloat(document.getElementById('mock_conv').value);
    document.getElementById('mock_pot_val').innerText = pot + '%';
    document.getElementById('mock_pos_val').innerText = pos + '%';
    document.getElementById('mock_conv_val').innerText = conv + '%';
    try {
      const potBounds = [
        parseFloat(document.querySelector('[name=pot_b0]').value) || 0,
        parseFloat(document.querySelector('[name=pot_b1]').value) || 0,
        parseFloat(document.querySelector('[name=pot_b2]').value) || 0,
        parseFloat(document.querySelector('[name=pot_b3]').value) || 0
      ];
      const posBounds = [
        parseFloat(document.querySelector('[name=pos_b0]').value) || 0,
        parseFloat(document.querySelector('[name=pos_b1]').value) || 0,
        parseFloat(document.querySelector('[name=pos_b2]').value) || 0,
        parseFloat(document.querySelector('[name=pos_b3]').value) || 0
      ];
      const convBounds = [
        parseFloat(document.querySelector('[name=conv_b0]').value) || 0,
        parseFloat(document.querySelector('[name=conv_b1]').value) || 0,
        parseFloat(document.querySelector('[name=conv_b2]').value) || 0,
        parseFloat(document.querySelector('[name=conv_b3]').value) || 0
      ];
      const getContinuousScore = (val, bounds) => {
        const [b0, b1, b2, b3] = bounds;
        if (val < b0) {
          if (b0 <= 0) return 0;
          return Math.max(0, Math.min(1, val / b0));
        }
        if (val < b1) return b1 > b0 ? (1 + ((val - b0) / (b1 - b0))) : 1;
        if (val < b2) return b2 > b1 ? (2 + ((val - b1) / (b2 - b1))) : 2;
        if (val < b3) return 3;
        const topAnchor = Math.max(100, b3);
        if (val < topAnchor) {
          const span = topAnchor - b3;
          if (span <= 1e-9) return 4;
          return 3 + ((val - b3) / span);
        }
        return 4;
      };
      const wPos = parseFloat(document.querySelector('[name=w_pos]').value) || 0;
      const wConv = parseFloat(document.querySelector('[name=w_conv]').value) || 0;
      const wPot = parseFloat(document.querySelector('[name=w_pot]').value) || 0;
      const penaltyFactor = parseFloat(document.querySelector('[name=penalty_factor]').value) || 0;
      const sPos = getContinuousScore(pos, posBounds);
      const sConv = getContinuousScore(conv, convBounds);
      const sPot = getContinuousScore(pot, potBounds);
      const comp = (sPos * wPos) + (sConv * wConv) + (sPot * wPot);
      const imbalance = Math.max(sPos, sConv, sPot) - Math.min(sPos, sConv, sPot);
      const compAdjusted = Math.max(0, Math.min(4, comp - (imbalance * penaltyFactor)));
      const scale = parseInt(document.querySelector('[name=points_scale]').value, 10) || 1000;
      const tp = Math.round(compAdjusted * scale);
      const cuts = [];
      for (let i = 0; i < 5; i++) {
        const el = document.querySelector('[name=comp_pt_' + i + ']');
        cuts.push(el ? (parseInt(el.value, 10) || 0) : 0);
      }
      let pointsTierIdx = cuts.length;
      for (let i = 0; i < cuts.length; i++) {
        if (tp < cuts[i]) {
          pointsTierIdx = i;
          break;
        }
      }
      const gateTierIdx = (() => {
        if (pot >= potBounds[3] && pos >= posBounds[3] && conv >= convBounds[3]) return 4;
        if (pot >= potBounds[2] && pos >= posBounds[2] && conv >= convBounds[2]) return 3;
        if (pot >= potBounds[1] && pos >= posBounds[1] && conv >= convBounds[1]) return 2;
        if (pot >= potBounds[0] && pos >= posBounds[0] && conv >= convBounds[0]) return 1;
        return 0;
      })();
      const effectiveTierIdx = (pointsTierIdx >= tierNames.length - 1 && gateTierIdx >= tierNames.length - 2)
        ? tierNames.length - 1
        : Math.min(pointsTierIdx, gateTierIdx);
      const tier = tierNames[effectiveTierIdx];
      document.getElementById('sandbox_tier').innerText = tier;
      document.getElementById('sandbox_tp').innerText = tp + " tier pts";
      const note = document.getElementById('sandbox_note');
      if (note) {
        note.innerText = (effectiveTierIdx < pointsTierIdx)
          ? ("Points band suggests " + tierNames[pointsTierIdx] + ", but KPI minima \n gate label to " + tier + ".")
          : "Label and points band are aligned.";
      }
    } catch (e) {
      console.warn("Sandbox data parsing error", e);
    }
  }

  function syncAdjacentPair(input) {
    if (!input) return;
    if (input.type === "range") {
      const next = input.nextElementSibling;
      if (next && next.tagName === "INPUT" && next.type === "number") {
        next.value = input.value;
      }
    } else if (input.type === "number") {
      const prev = input.previousElementSibling;
      if (prev && prev.tagName === "INPUT" && prev.type === "range") {
        prev.value = input.value;
      }
    }
  }

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      syncAdjacentPair(event.target);
      syncCompPtSliderMaxes();
      updateSandbox();
    });
  });

  syncCompPtSliderMaxes();
  updateSandbox();
})();
