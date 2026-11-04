(() => {
  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  const qs = new URLSearchParams(location.search), qd = qs.get("d"), qk = qs.get("k");
  const past = document.getElementById("cal-past");
  const st = { f: qd ? "d:" + qd : qk ? "k:" + qk : "", past: past ? past.checked : false };
  function apply() {
    document.querySelectorAll("#cal-f .chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === st.f)));
    document.querySelectorAll("#cal .cal-m").forEach(m => {
      let n = 0;
      m.querySelectorAll(".ev").forEach(e => {
        const isPast = e.dataset.end < today;
        e.classList.toggle("past", isPast);
        const ok = (!st.f || (st.f.startsWith("k:") ? e.dataset.k === st.f.slice(2) : e.dataset.d === st.f.slice(2))) && (st.past || !isPast);
        e.hidden = !ok;
        if (ok) n++;
      });
      m.hidden = n === 0;
    });
  }
  document.querySelectorAll("#cal-f .chip").forEach(b => b.addEventListener("click", () => { st.f = st.f === b.dataset.f ? "" : b.dataset.f; apply(); }));
  if (past) past.addEventListener("change", () => { st.past = past.checked; apply(); });
  apply();

  /* subscribe to a calendar file */
  const sel = document.getElementById("sub-cal");
  if (sel) {
    const ios = document.getElementById("sub-ios"), g = document.getElementById("sub-g"), msg = document.getElementById("sub-msg");
    if (qd) { const o = [...sel.options].find(o => o.value.endsWith("/" + qd.toLowerCase() + ".ics")); if (o) sel.value = o.value; }
    const set = () => { const w = sel.value.replace(/^https?:/, "webcal:"); ios.href = w; g.href = "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(w); };
    sel.addEventListener("change", set);
    set();
    document.getElementById("sub-copy").addEventListener("click", () => {
      const done = () => { msg.textContent = "已复制"; setTimeout(() => { msg.textContent = ""; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(sel.value).then(done).catch(() => { msg.textContent = sel.value; });
      else msg.textContent = sel.value;
    });
  }
})();
