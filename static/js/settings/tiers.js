(function () {
  const cfg = document.getElementById("tiers-config");
  if (!cfg) return;

  const MAX_TIER_POINTS = 10000;

  let tierNames = [];
  try {
    tierNames = JSON.parse(cfg.dataset.tierNames || "[]");
  } catch (e) {
    tierNames = [];
  }

  function getContinuousScore(val, bounds) {
    const [b0, b1, b2, b3] = bounds;
    if (val < b0) {
      if (b0 <= 0) return 0;
      return Math.max(0, Math.min(1, val / b0));
    }
    if (val < b1) return b1 > b0 ? (1 + ((val - b0) / (b1 - b0))) : 1;
    if (val < b2) return b2 > b1 ? (2 + ((val - b1) / (b2 - b1))) : 2;
    if (val < b3) {
      const span = b3 - b2;
      if (span <= 1e-9) return 3.5;
      return 3 + (0.5 * ((val - b2) / span));
    }
    const topAnchor = Math.max(100, b3);
    if (val < topAnchor) {
      const span = topAnchor - b3;
      if (span <= 1e-9) return 4;
      return 3.5 + (0.5 * ((val - b3) / span));
    }
    return 4;
  }

  function tierCutsFromBaselines(potBounds, posBounds, convBounds, wPos, wConv, wPot, penaltyFactor) {
    const cuts = [];
    let prev = 0;
    for (let idx = 0; idx < 4; idx++) {
      const sPos = getContinuousScore(posBounds[idx], posBounds);
      const sConv = getContinuousScore(convBounds[idx], convBounds);
      const sPot = getContinuousScore(potBounds[idx], potBounds);
      const compBase = (sPos * wPos) + (sConv * wConv) + (sPot * wPot);
      const imbalance = Math.max(sPos, sConv, sPot) - Math.min(sPos, sConv, sPot);
      const compAdjusted = Math.max(0, Math.min(4, compBase - (imbalance * penaltyFactor)));
      let pts = Math.round((compAdjusted / 4) * MAX_TIER_POINTS);
      pts = Math.max(pts, prev + 1);
      pts = Math.min(pts, MAX_TIER_POINTS - (4 - idx));
      cuts.push(pts);
      prev = pts;
    }
    const semiCut = cuts[3];
    const eliteCut = Math.max(semiCut + 1, Math.min(Math.round(semiCut + ((MAX_TIER_POINTS - semiCut) * 0.6)), MAX_TIER_POINTS - 1));
    cuts.push(eliteCut);
    return cuts;
  }

  function updateSandbox() {
    const pot = parseFloat(document.getElementById("mock_pot").value);
    const pos = parseFloat(document.getElementById("mock_pos").value);
    const conv = parseFloat(document.getElementById("mock_conv").value);
    document.getElementById("mock_pot_val").innerText = pot + "%";
    document.getElementById("mock_pos_val").innerText = pos + "%";
    document.getElementById("mock_conv_val").innerText = conv + "%";
    try {
      const potBounds = [
        parseFloat(document.querySelector("[name=pot_b0]").value) || 0,
        parseFloat(document.querySelector("[name=pot_b1]").value) || 0,
        parseFloat(document.querySelector("[name=pot_b2]").value) || 0,
        parseFloat(document.querySelector("[name=pot_b3]").value) || 0
      ];
      const posBounds = [
        parseFloat(document.querySelector("[name=pos_b0]").value) || 0,
        parseFloat(document.querySelector("[name=pos_b1]").value) || 0,
        parseFloat(document.querySelector("[name=pos_b2]").value) || 0,
        parseFloat(document.querySelector("[name=pos_b3]").value) || 0
      ];
      const convBounds = [
        parseFloat(document.querySelector("[name=conv_b0]").value) || 0,
        parseFloat(document.querySelector("[name=conv_b1]").value) || 0,
        parseFloat(document.querySelector("[name=conv_b2]").value) || 0,
        parseFloat(document.querySelector("[name=conv_b3]").value) || 0
      ];
      const wPos = parseFloat(document.querySelector("[name=w_pos]").value) || 0;
      const wConv = parseFloat(document.querySelector("[name=w_conv]").value) || 0;
      const wPot = parseFloat(document.querySelector("[name=w_pot]").value) || 0;
      const penaltyFactor = parseFloat(document.querySelector("[name=penalty_factor]").value) || 0;

      const sPos = getContinuousScore(pos, posBounds);
      const sConv = getContinuousScore(conv, convBounds);
      const sPot = getContinuousScore(pot, potBounds);
      const comp = (sPos * wPos) + (sConv * wConv) + (sPot * wPot);
      const imbalance = Math.max(sPos, sConv, sPot) - Math.min(sPos, sConv, sPot);
      const compAdjusted = Math.max(0, Math.min(4, comp - (imbalance * penaltyFactor)));
      const rawPoints = Math.round((compAdjusted / 4) * MAX_TIER_POINTS);
      const cuts = tierCutsFromBaselines(potBounds, posBounds, convBounds, wPos, wConv, wPot, penaltyFactor);

      let pointsTierIdx = cuts.length;
      for (let i = 0; i < cuts.length; i++) {
        if (rawPoints < cuts[i]) {
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

      const shownPoints = effectiveTierIdx < tierNames.length - 1
        ? Math.min(rawPoints, cuts[effectiveTierIdx] - 1)
        : rawPoints;

      const tier = tierNames[effectiveTierIdx];
      document.getElementById("sandbox_tier").innerText = tier;
      document.getElementById("sandbox_tp").innerText = shownPoints + " / " + MAX_TIER_POINTS + " pts";

      const note = document.getElementById("sandbox_note");
      if (note) {
        note.innerText = "Points and tier use the same baseline thresholds.";
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
      updateSandbox();
    });
  });

  updateSandbox();
})();
