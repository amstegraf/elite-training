/**
 * Format server ISO timestamps in the viewer's local timezone.
 * Elements: .local-session-range (data-start, optional data-end), .local-session-range--friendly,
 * .local-rack-ended (data-session-start, data-rack-started, data-rack-ended), time.local-datetime[datetime].
 */
(function () {
  function parseInstant(s) {
    if (s == null || s === "") return NaN;
    var str = String(s).trim();
    if (!str) return NaN;
    var t = Date.parse(str);
    if (!Number.isNaN(t)) return t;
    // Progress chart labels: "YYYY-MM-DD HH:mm" from UTC wall clock (no offset in string)
    var m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (m) {
      return Date.UTC(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5])
      );
    }
    return NaN;
  }

  var MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** e.g. 11 Apr 2026,  19:40 */
  function formatFriendlyDateTime(ts) {
    if (Number.isNaN(ts)) return "";
    var d = new Date(ts);
    return (
      d.getDate() +
      " " +
      MONTHS[d.getMonth()] +
      " " +
      d.getFullYear() +
      ",  " +
      pad2(d.getHours()) +
      ":" +
      pad2(d.getMinutes())
    );
  }

  function formatFriendlyTimeOnly(ts) {
    if (Number.isNaN(ts)) return "";
    var d = new Date(ts);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function sameLocalCalendarDay(tsA, tsB) {
    var da = new Date(tsA);
    var db = new Date(tsB);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  }

  /** e.g. (35min) or (1h 5min) */
  function formatDuration(startTs, endTs) {
    var ms = endTs - startTs;
    if (ms <= 0) return "(0min)";
    var totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return "(" + totalMin + "min)";
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    if (m === 0) return "(" + h + "h)";
    return "(" + h + "h " + m + "min)";
  }

  function wireFriendlySessionRange(el) {
    var start = el.getAttribute("data-start");
    var end = el.getAttribute("data-end");
    if (!start) return;
    var a = parseInstant(start);
    if (Number.isNaN(a)) {
      el.textContent = start;
      return;
    }
    if (!end || !String(end).trim()) {
      el.textContent = formatFriendlyDateTime(a);
      return;
    }
    var b = parseInstant(end);
    if (Number.isNaN(b)) {
      el.textContent = formatFriendlyDateTime(a);
      return;
    }
    var dur = " " + formatDuration(a, b);
    var ARROW = " \u2192 ";
    if (sameLocalCalendarDay(a, b)) {
      el.textContent =
        formatFriendlyDateTime(a) + ARROW + formatFriendlyTimeOnly(b) + dur;
    } else {
      el.textContent =
        formatFriendlyDateTime(a) + ARROW + formatFriendlyDateTime(b) + dur;
    }
  }

  /**
   * Rack end: local time only + rack duration when same local day as session start;
   * otherwise full friendly end time + duration.
   */
  function wireRackEndedCells() {
    document.querySelectorAll(".local-rack-ended").forEach(function (el) {
      var sessionStart = el.getAttribute("data-session-start");
      var rackStarted = el.getAttribute("data-rack-started");
      var rackEnded = el.getAttribute("data-rack-ended");
      if (!rackEnded) return;
      var endTs = parseInstant(rackEnded);
      if (Number.isNaN(endTs)) {
        el.textContent = rackEnded;
        return;
      }
      var sessionTs = parseInstant(sessionStart || "");
      var rackStartTs = parseInstant(rackStarted || "");
      var durText = "";
      if (!Number.isNaN(rackStartTs)) {
        durText = " " + formatDuration(rackStartTs, endTs);
      }
      var sameDayAsSession =
        !Number.isNaN(sessionTs) && sameLocalCalendarDay(sessionTs, endTs);
      var timePart = sameDayAsSession
        ? formatFriendlyTimeOnly(endTs)
        : formatFriendlyDateTime(endTs);
      el.textContent = timePart + durText;
    });
  }

  function formatLocal(ts) {
    if (Number.isNaN(ts)) return "";
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function wireSessionRanges() {
    document.querySelectorAll(".local-session-range").forEach(function (el) {
      if (el.classList.contains("local-session-range--friendly")) {
        wireFriendlySessionRange(el);
        return;
      }
      var start = el.getAttribute("data-start");
      var end = el.getAttribute("data-end");
      if (!start) return;
      var a = parseInstant(start);
      var left = formatLocal(a);
      if (!left) {
        el.textContent = start;
        return;
      }
      if (end) {
        var b = parseInstant(end);
        var right = formatLocal(b);
        el.textContent = right ? left + " → " + right : left;
      } else {
        el.textContent = left;
      }
    });
  }

  function wireTimeElements() {
    document.querySelectorAll("time.local-datetime").forEach(function (el) {
      var iso = el.getAttribute("datetime");
      if (!iso) return;
      var ts = parseInstant(iso);
      var out = formatLocal(ts);
      el.textContent = out || iso;
    });
  }

  function run() {
    wireSessionRanges();
    wireRackEndedCells();
    wireTimeElements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
