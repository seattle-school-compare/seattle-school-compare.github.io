(() => {
  const D = window.DATA, LV = { E: "小学", M: "初中", H: "高中" };
  const DM = Object.fromEntries(D.D.map(d => [d.c, d]));
  const BY = Object.fromEntries(D.S.map(s => [s.id, s]));
  const url = window.siteURL, store = window.store;
  const dLabel = c => DM[c] ? DM[c].zh : c;
  const fmtM = v => "$" + (v / 1e6).toFixed(2) + "M";
  const fmtShort = v => v >= 1e6 ? "$" + (v / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M" : "$" + Math.round(v / 1e3) + "K";
  const fmtPrice = r => r.p == null ? "—" : (r.pa ? "≈" : "") + (r.p >= 1e6 ? fmtM(r.p) : fmtShort(r.p));
  const rnd = v => v == null ? null : Math.round(v);
  const href = s => url(s.path) + (s.anchor ? "#" + s.anchor : "");
  const cell = (tag, text, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };
  const linkTo = (s, text, cls) => { const a = cell("a", text || s.n, cls); a.href = href(s); return a; };
  const KEYS = ["a", "b", "c", "d"], LET = ["A", "B", "C", "D"], MAX = 4, SAVE = "gssc-cmp";

  // the list comes from the link; without one, from what this browser compared last time
  const qs = new URLSearchParams(location.search);
  const st = { mode: "line", level: "E", ids: KEYS.map(k => qs.get(k) || "") };
  if (!st.ids.some(Boolean)) {
    let saved = null;
    try { saved = JSON.parse(store.get(SAVE) || "null"); } catch (e) {}
    if (saved && Array.isArray(saved.ids)) { st.ids = saved.ids.slice(0, MAX); if (saved.m === "school") st.mode = "school"; }
  }
  st.ids = st.ids.map(id => id && BY[id] ? id : "");
  while (st.ids.length < 2) st.ids.push("");
  while (st.ids.length > 2 && !st.ids[st.ids.length - 1]) st.ids.pop();
  const first = st.ids.find(Boolean);
  if (first && (BY[first].lv !== "E" || qs.get("m") === "school")) { st.mode = "school"; st.level = BY[first].lv; }
  else if (qs.get("m") === "school") st.mode = "school";
  if (st.mode === "school" && first) st.level = BY[first].lv;

  const att = lv => D.S.filter(s => s.lv === lv && !s.choice);
  const pool = lv => D.S.filter(s => s.lv === lv && !s.prog && (s.r != null || s.e != null || s.m != null));
  function optGroups(sel, rows, label) {
    sel.textContent = "";
    sel.append(new Option(label, ""));
    D.D.forEach(d => {
      const items = rows.filter(r => r.d === d.c);
      if (!items.length) return;
      const g = document.createElement("optgroup");
      g.label = d.zh + "（" + d.c + "）";
      items.slice().sort((x, y) => ((x.r ?? 99999) - (y.r ?? 99999)) || x.n.localeCompare(y.n))
        .forEach(r => g.append(new Option(r.n + (r.anchor ? " 初中部" : "") + (r.r != null ? "（#" + r.r + "）" : "") + (r.choice ? "（选择校）" : ""), r.id)));
      sel.append(g);
    });
  }
  function slots() {
    const box = document.getElementById("c-slots");
    box.textContent = "";
    const rows = st.mode === "line" ? att("E") : pool(st.level);
    st.ids.forEach((id, i) => {
      const w = cell("div", null, "slot sl" + i);
      w.append(cell("span", LET[i], "sk"));
      const sel = cell("select");
      sel.setAttribute("aria-label", LET[i]);
      optGroups(sel, rows, st.mode === "line" ? "选小学…" : "选" + LV[st.level] + "…");
      sel.value = id || "";
      if (sel.value !== id) st.ids[i] = "";
      sel.addEventListener("change", () => { st.ids[i] = sel.value; render(); });
      w.append(sel);
      if (st.ids.length > 2) {
        const x = cell("button", "×", "x");
        x.type = "button";
        x.setAttribute("aria-label", "去掉 " + LET[i]);
        x.addEventListener("click", () => { st.ids.splice(i, 1); slots(); render(); });
        w.append(x);
      }
      box.append(w);
    });
    const add = document.getElementById("c-add");
    add.hidden = st.ids.length >= MAX;
    add.textContent = st.mode === "line" ? "＋ 再加一条" : "＋ 再加一所";
    document.getElementById("c-swap").hidden = st.ids.length !== 2;
  }
  function fill() {
    document.querySelectorAll("#c-mode button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === st.mode)));
    document.getElementById("c-lvl").hidden = st.mode !== "school";
    document.getElementById("c-level").value = st.level;
    slots();
    document.getElementById("c-hint").textContent = st.mode === "line"
      ? "选一所小学，自动带出它片区对应的初中和高中，最多 4 条。房价用小学所在 zip 的 4 房中位数。"
      : "选同一学段的学校，最多 4 所，并排看排名、成绩和所在 zip 的房价。";
  }
  function syncURL() {
    const p = new URLSearchParams();
    st.ids.forEach((id, i) => { if (id) p.set(KEYS[i], id); });
    const any = st.ids.find(Boolean);
    if (st.mode === "school" && (!any || BY[any].lv === "E")) p.set("m", "school");
    const q = p.toString().replace(/%2F/g, "/").replace(/%3A/g, ":");
    history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
    store.set(SAVE, JSON.stringify({ m: st.mode, lv: st.mode === "school" ? st.level : "E", ids: st.ids }));
  }
  const picked = () => st.ids.map((id, i) => id ? { r: BY[id], i, k: LET[i] } : null).filter(Boolean);
  const badge = (x, cls) => cell("span", x.k, "sk" + (cls ? " " + cls : ""));

  /* feeder lines */
  function miles(a, b) {
    if (a.lat == null || b.lat == null) return null;
    const R = 3958.8, t = Math.PI / 180;
    const h = Math.sin((b.lat - a.lat) * t / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin((b.lon - a.lon) * t / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function lineOf(e) {
    const f = e.feed;
    if (!f) return null;
    const mids = (f.m || []).map(i => BY[i]).filter(Boolean), highs = (f.h || []).map(i => BY[i]).filter(Boolean);
    return { e, m: mids[0] || null, h: highs[0] || null, mAlt: mids.slice(1), hAlt: highs.slice(1), note: f.note || "", hnote: f.hnote || "" };
  }
  const nearbyPrivate = (e, r) => D.P.map(p => ({ p, mi: miles(e, p) })).filter(x => x.mi != null && x.mi <= r).sort((a, b) => a.mi - b.mi);
  const distTag = c => { const s = cell("span", c, "dtag " + c); s.title = DM[c] ? DM[c].en : c; return s; };
  const avgPct = L => { const v = ["e", "m", "h"].map(k => L[k]).filter(r => r && r.pct != null).map(r => r.pct); return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : null; };
  function lineCard(L, x) {
    const box = cell("div", null, "line sl" + x.i);
    const h = cell("h3");
    h.append(badge(x), linkTo(L.e, L.e.n + " 这条线"), distTag(L.e.d), cell("span", dLabel(L.e.d) + " · zip " + L.e.z, "zp"));
    box.append(h);
    [["小学", L.e, "E"], ["初中", L.m, "M"], ["高中", L.h, "H"]].forEach(([lab, r, lv], i) => {
      const s = cell("div", null, "stage");
      s.append(cell("span", lab, "lv"));
      if (!r) { s.append(cell("span", lv === "H" && L.hnote ? L.hnote : "未确认", "mut")); box.append(s); return; }
      const nm = cell("div"); nm.append(linkTo(r, r.n + (r.anchor ? " 初中部" : ""), "nm")); s.append(nm);
      const t = cell("div", null, "st"); t.style.gridColumn = "2";
      const add = (k, v) => { const sp = cell("span"); sp.append(k + " "); sp.append(cell("b", v)); t.append(sp); };
      add("全州", r.r == null ? "—" : "#" + r.r + "（前 " + r.pct + "%）" + (r.ry !== D.LATEST ? " " + r.ry : ""));
      add("阅读", r.e == null ? "—" : rnd(r.e) + "%");
      add("数学", r.m == null ? "—" : rnd(r.m) + "%");
      add("GS", r.g == null ? "—" : String(r.g));
      s.append(t);
      if (r.note) s.append(cell("div", r.note, "split"));
      const alts = i === 1 ? L.mAlt : i === 2 ? L.hAlt : [];
      if (alts.length) s.append(cell("div", "部分片区去 " + alts.map(a => a.n).join(" / "), "split"));
      box.append(s);
    });
    const sb = cell("div", null, "sum");
    const av = avgPct(L);
    const s1 = cell("span"); s1.append((av && av.n === 3 ? "三" : av && av.n === 2 ? "两" : "") + "段平均 "); s1.append(cell("b", av ? "前 " + av.avg.toFixed(1) + "%" : "—")); sb.append(s1);
    const s2 = cell("span"); s2.append("小学 zip 4 房 "); s2.append(cell("b", fmtPrice(L.e)));
    if (L.e.p != null) s2.append(cell("span", " 中间一半 " + fmtShort(L.e.pq1) + "–" + fmtShort(L.e.pq3) + " · n=" + L.e.pn, "sm"));
    sb.append(s2); box.append(sb);
    if (L.note) box.append(cell("div", "划片说明：" + L.note, "nearp"));
    const np = nearbyPrivate(L.e, 3), near = cell("div", null, "nearp");
    if (np.length) {
      near.append("3 英里内的私校：");
      np.forEach((p, i) => { near.append(i ? " · " : ""); const a = cell("a"); a.href = url("private/" + p.p.slug); a.append(cell("b", p.p.alias || p.p.name)); near.append(a); near.append(" " + p.mi.toFixed(1) + " 英里"); });
    } else near.append("3 英里内没有网站收录的私校。");
    box.append(near);
    return box;
  }

  const SVGNS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, text) { const el = document.createElementNS(SVGNS, tag); for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]); if (text !== undefined) el.textContent = text; return el; }
  const niceStep = mx => mx <= 20 ? 5 : mx <= 50 ? 10 : 20;
  function measureLabs(items) {
    const wrap = document.createElement("div");
    wrap.className = "lfig";
    wrap.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;width:900px;padding:0;border:0";
    const svg = sv("svg", { width: 900, height: 300 });
    wrap.append(svg); document.body.append(wrap);
    const res = items.map(it => {
      const t = sv("text", { x: 0, y: 100, class: it.cls || "lab" });
      t.append(sv("tspan", { x: 0 }, it.a));
      if (it.b) t.append(sv("tspan", { x: 0, dy: "1.2em", class: "lab2" }, it.b));
      svg.append(t);
      let bb = null;
      try { bb = t.getBBox(); } catch (e) {}
      if (bb && bb.width > 0) return { x: bb.x, y: bb.y - 100, w: bb.width, h: bb.height };
      const fs = it.cls === "sm" ? 10.5 : 12;
      const est = s => [...s].reduce((w, ch) => w + fs * (ch.charCodeAt(0) > 0x2e80 ? 1 : /[ ·]/.test(ch) ? 0.3 : /[A-Z#%0-9]/.test(ch) ? 0.64 : 0.54), 0);
      return { x: 0, y: -fs * 0.95, w: Math.max(est(it.a), it.b ? est(it.b) : 0), h: fs * (it.b ? 2.5 : 1.3) };
    });
    wrap.remove();
    return res;
  }
  function legend(lines) {
    const lg = cell("div", null, "lleg");
    lines.forEach(x => { const it = cell("span", null, "li sl" + x.i); it.append(badge(x), linkTo(x.L.e, x.L.e.n), document.createTextNode(" 这条线")); lg.append(it); });
    return lg;
  }
  // one line per choice; with three or four lines the dots carry letters and the names move to the table below
  function lineFigure(lines, compact) {
    const N = lines.length, many = N >= 3;
    const W = compact ? 380 : 860, H = compact ? 330 : 320, top = 44, bottom = 44, left = compact ? 50 : 58;
    const cw = compact ? W - left - 8 : 500, gap = compact ? 0 : 60, bw = W - left - cw - gap - 20, ph = H - top - bottom;
    const stages = [["小学", "E", "e"], ["初中", "M", "m"], ["高中", "H", "h"]];
    const xs = compact ? [left + 30, left + cw / 2, left + cw - 30] : [left + 60, left + cw / 2, left + cw - 60];
    let pmax = 0;
    lines.forEach(({ L }) => stages.forEach(([, , k]) => { const r = L[k]; if (r && r.pct != null) pmax = Math.max(pmax, r.pct); }));
    const step = niceStep(Math.max(pmax, 1));
    const ymax = Math.max(step * 2, Math.ceil((pmax * 1.15) / step) * step);
    const y = p => top + (p / ymax) * ph;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": N + " 条升学线在全州的排名百分位" });
    for (let p = 0; p <= ymax; p += step) {
      svg.append(sv("line", { x1: left, x2: left + cw, y1: y(p), y2: y(p), class: "grid" }));
      svg.append(sv("text", { x: left - 8, y: y(p) + 4, "text-anchor": "end", class: "mut" }, p === 0 ? "#1" : "前 " + p + "%"));
    }
    stages.forEach(([lab], i) => svg.append(sv("text", { x: xs[i], y: H - bottom + 20, "text-anchor": "middle", class: "lab" }, lab)));
    svg.append(sv("text", { x: left, y: 16, class: "ttl" }, "全州百分位（越靠上越好）"));
    const allPts = lines.map(({ L }) => stages.map(([, lv, k], i) => { const r = L[k]; return r && r.pct != null ? { x: xs[i], cx: xs[i], y: y(r.pct), r, p: r.pct, lv } : null; }));
    // dots that would overlap sit side by side
    const R = 8, DX = 2 * R + 2;
    for (let i = 0; i < 3; i++) {
      const here = allPts.map(pts => pts[i]).filter(Boolean).sort((a, b) => a.y - b.y);
      let grp = [];
      const flush = () => { grp.forEach((pt, j) => { pt.x = pt.cx + (j - (grp.length - 1) / 2) * DX; }); grp = []; };
      here.forEach(pt => { if (grp.length && pt.y - grp[grp.length - 1].y >= 2 * R) flush(); grp.push(pt); });
      flush();
    }
    const labs = [];
    if (!many) for (let i = 0; i < 3; i++) {
      const here = allPts.map((pts, li) => pts[i] ? { li, pt: pts[i] } : null).filter(Boolean);
      if (here.length === 2 && here[0].pt.r === here[1].pt.r) labs.push({ i, pt: Object.assign({}, here[0].pt, { x: here[0].pt.cx }), own: [0, 1] });
      else here.forEach(h => labs.push({ i, pt: h.pt, own: [h.li] }));
    }
    const missing = [];
    lines.forEach(({ L, k }, li) => allPts[li].forEach((pt, i) => {
      if (!pt) missing.push({ li, i, txt: k + " " + (L[stages[i][2]] ? L[stages[i][2]].n + " 无排名" : (i === 2 && L.hnote ? "高中按住址另划" : "未确认")) });
    }));
    const sub = pt => "#" + pt.r.r + " · 前 " + pt.p + "%";
    const meas = measureLabs([{ a: "小学" }, ...missing.map(m => ({ a: m.txt, cls: "sm" })), ...labs.map(l => ({ a: l.pt.r.n, b: sub(l.pt) }))]);
    missing.forEach((m, j) => { m.m = meas[1 + j]; });
    labs.forEach((l, j) => { l.m = meas[1 + missing.length + j]; });
    // pick label spots that stay off the dots, lines and other labels
    const XMIN = compact ? 4 : left + 2, XMAX = compact ? W - 2 : left + cw + gap - 18, YMIN = 24, YMAX = H - 2;
    const anchorOf = i => i === 0 ? ["start", -6] : i === 2 ? ["end", 6] : ["middle", 0];
    const boxAt = (m, ax, tx, y0) => { const x0 = tx + m.x - (ax === "middle" ? m.w / 2 : ax === "end" ? m.w : 0); return { x0, x1: x0 + m.w, y0: y0 + m.y, y1: y0 + m.y + m.h }; };
    const hit = (a, b, p) => a.x0 < b.x1 + p && b.x0 < a.x1 + p && a.y0 < b.y1 + p && b.y0 < a.y1 + p;
    const rd = (b, x, yy) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - yy, 0, yy - b.y1));
    const clip = ([x1, y1, x2, y2], b) => {
      const dx = x2 - x1, dy = y2 - y1, P = [-dx, dx, -dy, dy], Q = [x1 - b.x0, b.x1 - x1, y1 - b.y0, b.y1 - y1];
      let t0 = 0, t1 = 1;
      for (let q = 0; q < 4; q++) {
        if (P[q] === 0) { if (Q[q] < 0) return 0; continue; }
        const t = Q[q] / P[q];
        if (P[q] < 0) { if (t > t1) return 0; t0 = Math.max(t0, t); } else { if (t < t0) return 0; t1 = Math.min(t1, t); }
      }
      return Math.max(0, t1 - t0) * Math.hypot(dx, dy);
    };
    const segs = [], marks = [];
    allPts.forEach((pts, li) => pts.forEach((pt, i) => { if (!pt) return; marks.push({ x: pt.x, y: pt.y, li, i }); if (pts[i + 1]) segs.push([pt.x, pt.y, pts[i + 1].x, pts[i + 1].y]); }));
    const obst = stages.map((_, i) => boxAt(meas[0], "middle", xs[i], H - bottom + 20));
    missing.forEach(m => { const [ax, off] = anchorOf(m.i); obst.push(boxAt(m.m, ax, xs[m.i] + off, top + ph - 8 - m.li * 14)); });
    const cands = l => {
      const { pt, i, m } = l, [ax, off] = anchorOf(i), out = [];
      [2, 5, 9, 14, 20, 27, 35, 44, 54].forEach(g => {
        out.push({ ax, tx: pt.x + off, y: pt.y - R - g - (m.y + m.h), c: g * 0.35 });
        out.push({ ax, tx: pt.x + off, y: pt.y + R + g - m.y, c: g * 0.35 + 0.3 });
      });
      [["start", pt.x + R + 5], ["end", pt.x - R - 5]].forEach(([sa, sx]) => [0, -7, 7, -14, 14].forEach(s => out.push({ ax: sa, tx: sx, y: pt.y - m.y - m.h / 2 + s, c: 5 + Math.abs(s) * 0.35 })));
      out.forEach(o => { o.b = boxAt(m, o.ax, o.tx, o.y); });
      return out;
    };
    const solo = (l, o, placed) => {
      const b = o.b, pb = { x0: b.x0 - 2, x1: b.x1 + 2, y0: b.y0 - 2, y1: b.y1 + 2 };
      let c = o.c;
      if (b.x0 < XMIN || b.x1 > XMAX || b.y0 < YMIN || b.y1 > YMAX) c += 100;
      obst.concat(placed).forEach(q => { if (hit(b, q, 2)) c += 100; });
      segs.forEach(s => { c += 0.7 * clip(s, pb); });
      const own = rd(b, l.pt.x, l.pt.y);
      marks.forEach(mk => {
        const d = rd(b, mk.x, mk.y);
        if (d < R + 2) c += 100;
        if (mk.i === l.i && !l.own.includes(mk.li) && Math.abs(mk.y - l.pt.y) > 2 && d < own + 3) c += 25;
      });
      return c;
    };
    const placed = [];
    for (let i = 0; i < 3; i++) {
      const here = labs.filter(l => l.i === i);
      if (!here.length) continue;
      const CC = here.map(l => cands(l).map(o => ({ o, c: solo(l, o, placed) })));
      let best = null;
      if (here.length === 1) CC[0].forEach(x => { if (!best || x.c < best.c) best = { c: x.c, picks: [x.o] }; });
      else {
        const dyp = here[0].pt.y - here[1].pt.y;
        CC[0].forEach(xa => CC[1].forEach(xb => {
          let c = xa.c + xb.c;
          if (hit(xa.o.b, xb.o.b, 3)) c += 200;
          const dcy = (xa.o.b.y0 + xa.o.b.y1) - (xb.o.b.y0 + xb.o.b.y1);
          if (Math.abs(dyp) > 4) { if (dcy * dyp < 0) c += 20; }
          else if (dcy * (here[0].pt.r.r - here[1].pt.r.r) < 0) c += 2;
          if (!best || c < best.c) best = { c, picks: [xa.o, xb.o] };
        }));
      }
      here.forEach((l, j) => { l.pick = best.picks[j]; placed.push(l.pick.b); });
    }
    lines.forEach(({ L, k, i: si }, li) => {
      const g = sv("g", { class: "sl" + si });
      const pts = allPts[li];
      let d = "", pen = false;
      pts.forEach(pt => { if (!pt) { pen = false; return; } d += (pen ? " L " : " M ") + pt.x + " " + pt.y; pen = true; });
      if (d) g.append(sv("path", { d: d.trim(), class: "ln" }));
      svg.append(g);
    });
    lines.forEach(({ k, i: si }, li) => {
      const g = sv("g", { class: "sl" + si });
      allPts[li].forEach((pt, i) => {
        if (pt) {
          g.append(sv("circle", { cx: pt.x, cy: pt.y, r: R, class: "mk" }));
          g.append(sv("text", { x: pt.x, y: pt.y + 3.6, class: "mkt" }, k));
          return;
        }
        const m = missing.find(x => x.li === li && x.i === i), [ax, off] = anchorOf(i);
        g.append(sv("text", { x: xs[i] + off, y: top + ph - 8 - li * 14, "text-anchor": ax, class: "sm" }, m.txt));
      });
      svg.append(g);
    });
    const lg = sv("g", { class: "labs" });
    labs.forEach(l => {
      const o = l.pick, t = sv("text", { x: o.tx, y: o.y, "text-anchor": o.ax, class: "lab" });
      t.append(sv("tspan", { x: o.tx }, l.pt.r.n));
      t.append(sv("tspan", { x: o.tx, dy: "1.2em", class: "lab2" }, sub(l.pt)));
      lg.append(t);
    });
    svg.append(lg);
    if (compact) { const box = cell("div", null, "lfig compact"); box.append(svg); return box; }
    const bx = left + cw + gap, priced = lines.filter(({ L }) => L.e.p != null);
    svg.append(sv("text", { x: bx, y: 16, class: "ttl" }, "小学 zip 4 房房价中位数"));
    svg.append(sv("line", { x1: bx - 6, x2: bx + bw, y1: top + ph, y2: top + ph, class: "axis" }));
    if (priced.length) {
      const vmax = Math.max(...priced.map(({ L }) => Math.max(L.e.pq3 || 0, L.e.p))) * 1.18;
      const by = v => top + ph - (v / vmax) * ph;
      const slot = bw / Math.max(N, 1), barw = Math.min(48, slot * 0.56);
      lines.forEach(({ L, k, i: si }, i) => {
        const e = L.e, cx = bx + slot * (i + 0.5), g = sv("g", { class: "sl" + si });
        if (e.p != null) {
          g.append(sv("rect", { x: cx - barw / 2, y: by(e.p), width: barw, height: top + ph - by(e.p), rx: 3, class: "pbar" }));
          if (e.pq1 && e.pq3) {
            g.append(sv("line", { x1: cx, x2: cx, y1: by(e.pq3), y2: by(e.pq1), class: "whisk" }));
            g.append(sv("line", { x1: cx - 6, x2: cx + 6, y1: by(e.pq3), y2: by(e.pq3), class: "whisk" }));
            g.append(sv("line", { x1: cx - 6, x2: cx + 6, y1: by(e.pq1), y2: by(e.pq1), class: "whisk" }));
          }
          g.append(sv("text", { x: cx, y: by(Math.max(e.pq3 || 0, e.p)) - 8, "text-anchor": "middle", class: many ? "lab sm2" : "lab" }, fmtPrice(e)));
        } else g.append(sv("text", { x: cx, y: top + ph - 10, "text-anchor": "middle", class: "sm" }, "样本太少"));
        g.append(sv("text", { x: cx, y: top + ph + 16, "text-anchor": "middle", class: "mut" }, many ? k : k + " · " + e.z));
        if (e.pn && !many) g.append(sv("text", { x: cx, y: top + ph + 30, "text-anchor": "middle", class: "sm" }, "n=" + e.pn));
        svg.append(g);
      });
    }
    if (N === 2 && lines[0].L.e.p != null && lines[1].L.e.p != null) {
      const a = lines[0].L.e, b = lines[1].L.e, dpp = Math.round(100 * (b.p - a.p) / a.p);
      const dtxt = lines[1].k + " 比 " + lines[0].k + " " + (dpp >= 0 ? "+" : "") + dpp + "%", dm = measureLabs([{ a: "小学 zip 4 房房价中位数", cls: "ttl" }, { a: dtxt }]);
      svg.append(sv("text", { x: bx + bw / 2, y: Math.max(32, 16 + dm[0].y + dm[0].h + 3 - dm[1].y), "text-anchor": "middle", class: "lab" }, dtxt));
    }
    const box = cell("div", null, "lfig");
    box.append(svg);
    return box;
  }
  function priceChip(chip, a, b, ka, kb) {
    if (a.p == null || b.p == null) { chip("房价：有一边样本太少，不比较"); return; }
    const dp = b.p - a.p, dpp = Math.round(100 * dp / a.p);
    chip(kb + " 比 " + ka + " 房价 " + (dpp >= 0 ? "+" : "") + dpp + "%（" + (dp >= 0 ? "+" : "−") + fmtShort(Math.abs(dp)) + "）");
  }
  // three or four choices: the same facts side by side, no differences
  function table(items, rows) {
    const t = cell("div", null, "mt card");
    t.style.setProperty("--n", items.length);
    rows.forEach(([label, fn, cls]) => {
      const r = cell("div", null, "mrow" + (cls ? " " + cls : ""));
      r.append(cell("div", label, "mlab"));
      items.forEach(x => { const c = cell("div", null, "mc sl" + x.i); c.append(badge(x)); const v = cell("div", null, "mv"); fn(x, v); c.append(v); r.append(c); });
      t.append(r);
    });
    return t;
  }
  function lineTable(lines) {
    const stage = k => (x, v) => {
      const r = x.L[k];
      if (!r) { v.append(cell("span", k === "h" && x.L.hnote ? x.L.hnote : "未确认", "mut")); return; }
      v.append(linkTo(r, r.n + (r.anchor ? " 初中部" : ""), "nm"));
      v.append(cell("div", r.r == null ? "无排名" : "#" + r.r + " · 前 " + r.pct + "%", "rk"));
    };
    return table(lines, [
      ["", (x, v) => { v.append(distTag(x.L.e.d)); v.append(cell("span", " zip " + x.L.e.z, "sm")); }, "head"],
      ["小学", stage("e")], ["初中", stage("m")], ["高中", stage("h")],
      ["三段平均", (x, v) => { const a = avgPct(x.L); v.append(cell("b", a ? "前 " + a.avg.toFixed(1) + "%" : "—")); }],
      ["4 房房价", (x, v) => { v.append(cell("b", fmtPrice(x.L.e))); if (x.L.e.p != null) v.append(cell("div", fmtShort(x.L.e.pq1) + "–" + fmtShort(x.L.e.pq3) + " · n=" + x.L.e.pn, "sm")); }],
      ["3 英里内私校", (x, v) => { const n = nearbyPrivate(x.L.e, 3).length; v.append(cell("b", n ? n + " 所" : "没有")); }],
    ]);
  }
  function renderLines(out) {
    const P = picked();
    if (!P.length) { out.append(cell("p", "选一所小学开始。也可以在学校页上点“加到比一比”。", "note")); return; }
    const lines = P.map(p => ({ L: lineOf(p.r), k: p.k, i: p.i, r: p.r }));
    const ok = lines.filter(x => x.L);
    if (ok.length) {
      const compact = out.clientWidth < 620;
      out.append(legend(ok));
      out.append(lineFigure(ok, compact));
      out.append(cell("p", "纵轴是该学段在全州的排名百分位，越靠上越好。" + (compact ? "" : "右边柱子是小学所在 zip 近期成交的 4 房房价中位数，竖线是中间一半成交价的范围。"), "note"));
    }
    if (ok.length === 2) {
      const [X, Y] = ok, LA = X.L, LB = Y.L, chips = cell("div", null, "diff"), chip = t => chips.append(cell("span", t));
      const common = ["e", "m", "h"].filter(k => LA[k] && LB[k] && LA[k].pct != null && LB[k].pct != null);
      if (common.length) {
        const av = L => common.reduce((s, k) => s + L[k].pct, 0) / common.length, a = av(LA), b = av(LB);
        chip((common.length === 3 ? "三段" : "共同的 " + common.map(k => ({ e: "小学", m: "初中", h: "高中" })[k]).join("、") + " ") + "平均：" + (Math.abs(b - a) < 0.05 ? "两条线一样" : Y.k + " 比 " + X.k + (b < a ? " 靠前 " : " 靠后 ") + Math.abs(b - a).toFixed(1) + " 个百分点"));
      }
      [["小学", "e"], ["初中", "m"], ["高中", "h"]].forEach(([lab, k]) => {
        const a = LA[k], b = LB[k];
        if (a && b && a.r != null && b.r != null) chip(lab + (b.r < a.r ? " " + Y.k + " 靠前 " : b.r > a.r ? " " + Y.k + " 靠后 " : " 相同 ") + (b.r === a.r ? "" : Math.abs(a.r - b.r) + " 名"));
      });
      priceChip(chip, LA.e, LB.e, X.k, Y.k);
      out.append(chips);
    }
    if (ok.length >= 3) out.append(lineTable(ok));
    const grid = cell("div", null, "line-grid" + (P.length > 1 ? "" : " single"));
    lines.forEach(x => grid.append(x.L ? lineCard(x.L, x) : cell("p", x.r.n + " 的升学线还没有录入。", "note")));
    out.append(grid);
    out.append(cell("p", "升学线按学区公布的对应关系。片区边缘有拆分，具体地址以学区的查询工具为准。" + (ok.length === 2 ? "差值都是 " + ok[1].k + " 减 " + ok[0].k + "。" : ""), "note"));
  }

  /* schools */
  function trend(r) { return r.r == null || r.rprev == null ? null : r.rprev - r.r; }
  function facts(r, o) {
    const out = [];
    if (r.r != null) out.push("全州第 " + r.r + "，前 " + r.pct + "%" + (r.ry !== D.LATEST ? "（" + r.ry + " 年）" : ""));
    const t = trend(r);
    if (t != null) out.push(t > 0 ? "比上一年上升 " + t + " 名" : t < 0 ? "比上一年下降 " + (-t) + " 名" : "排名和上一年持平");
    [["e", "阅读"], ["m", "数学"], ["sci", "科学"]].forEach(([k, lab]) => { if (r[k] != null && o[k] != null) { const d = Math.round(r[k] - o[k]); if (d >= 3) out.push(lab + "达标率高 " + d + " 个百分点"); } });
    if (r.g != null && o.g != null && r.g > o.g) out.push("GreatSchools 高 " + (r.g - o.g) + " 分");
    if (r.enr && o.enr) { const q = r.enr / o.enr; if (q >= 1.3) out.push("学校更大（" + r.enr + " 人）"); if (q <= 1 / 1.3) out.push("学校更小（" + r.enr + " 人）"); }
    if (r.note) out.push(r.note);
    if (r.p != null && o.p != null && r.p < o.p) out.push("所在 zip 的 4 房房价低 " + Math.round(100 * (o.p - r.p) / o.p) + "%");
    return out;
  }
  function renderTwo(out, X, Y) {
    const A = X.r, B = Y.r;
    const grid = cell("div", null, "card cmp-grid");
    grid.style.display = "grid";
    const head = (x, side) => {
      const r = x.r, h = cell("div", null, "h " + r.d);
      if (side === "l") h.style.textAlign = "right";
      h.append(badge(x), document.createTextNode(" "), linkTo(r, r.n + (r.anchor ? " 初中部" : ""), "nm"), document.createTextNode(" "), distTag(r.d));
      h.append(cell("div", LV[r.lv] + " · " + dLabel(r.d) + " · zip " + r.z + (r.choice ? " · 选择校" : ""), "zp"));
      return h;
    };
    grid.append(head(X, "l"), cell("div", "", "lbl"), head(Y, "r"));
    const row = (label, va, vb, better) => {
      const l = cell("div", null, "v l"), r = cell("div", null, "v r");
      const put = (box, v, lead) => {
        if (!v) { box.append(cell("span", "—", "mut")); return; }
        box.append(cell("span", v.big, (v.plain ? "plain" : "big") + (lead ? " lead" : "")));
        if (v.sm) box.append(cell("span", v.sm, "sm"));
      };
      const lead = better && va && vb && va.raw != null && vb.raw != null && va.raw !== vb.raw ? better(va.raw, vb.raw) : null;
      put(l, va, lead === true); put(r, vb, lead === false);
      grid.append(l, cell("div", label, "lbl"), r);
    };
    row("全州排名", rankV(A), rankV(B), (a, b) => a < b);
    row("比上一年", trendV(A), trendV(B), (a, b) => a > b);
    row("阅读达标", numV(A.e, "%"), numV(B.e, "%"), (a, b) => a > b);
    row("数学达标", numV(A.m, "%"), numV(B.m, "%"), (a, b) => a > b);
    row("科学达标", numV(A.sci, "%"), numV(B.sci, "%"), (a, b) => a > b);
    row("GreatSchools", numV(A.g), numV(B.g), (a, b) => a > b);
    row("学生人数", A.enr ? { raw: A.enr, big: String(A.enr) } : null, B.enr ? { raw: B.enr, big: String(B.enr) } : null);
    row("备注", { raw: 0, big: A.note || "—", plain: true }, { raw: 0, big: B.note || "—", plain: true });
    row("4 房房价", priceV(A), priceV(B), (a, b) => a < b);
    out.append(grid);
    const chips = cell("div", null, "diff"), chip = t => chips.append(cell("span", t));
    if (A.r != null && B.r != null) chip(Y.k + " 比 " + X.k + " 全州排名" + (B.r < A.r ? "靠前 " : B.r > A.r ? "靠后 " : "相同 ") + (B.r === A.r ? "" : Math.abs(A.r - B.r) + " 名"));
    [["e", "阅读"], ["m", "数学"], ["sci", "科学"]].forEach(([k, lab]) => { if (A[k] != null && B[k] != null) chip(lab + " " + (B[k] - A[k] >= 0 ? "+" : "") + Math.round(B[k] - A[k]) + " 个百分点"); });
    priceChip(chip, A, B, X.k, Y.k);
    if (A.z === B.z) chip("两校在同一个 zip，房价相同");
    out.append(chips);
    const f = cell("div", null, "facts card");
    f.style.display = "grid";
    [[A, B], [B, A]].forEach(([r, o]) => {
      const box = cell("div");
      box.append(cell("h3", r.n + " 的特点"));
      const ul = cell("ul");
      const fs = facts(r, o);
      (fs.length ? fs : ["两校各项数据接近"]).forEach(t => ul.append(cell("li", t)));
      box.append(ul); f.append(box);
    });
    out.append(f);
    out.append(cell("p", "差值都是 " + Y.k + " 减 " + X.k + "。房价是两校所在 zip 的近期成交，不是学区内的房价；同一个 zip 里不同片区差别很大。", "note"));
  }
  const rankV = r => r.r == null ? null : { raw: r.r, big: "#" + r.r, sm: "前 " + r.pct + "%" + (r.ry !== D.LATEST ? " · " + r.ry : "") };
  const trendV = r => { const t = trend(r); return t == null ? null : { raw: t, big: (t > 0 ? "▲ " : t < 0 ? "▼ " : "") + Math.abs(t), sm: "上一年 #" + r.rprev }; };
  const numV = (v, u) => v == null ? null : { raw: v, big: Math.round(v) + (u || "") };
  const priceV = r => r.p == null ? null : { raw: r.p, big: fmtPrice(r), sm: "中间一半 " + fmtShort(r.pq1) + "–" + fmtShort(r.pq3) + " · n=" + r.pn };
  function renderSchools(out) {
    const P = picked();
    if (P.length < 2) { out.append(cell("p", P.length ? "再选一所同学段的学校。" : "选两所同学段的学校，这里会并排显示排名、成绩和所在 zip 的房价。", "note")); return; }
    if (P.length === 2) { renderTwo(out, P[0], P[1]); return; }
    const val = fn => (x, v) => { const o = fn(x.r); if (!o) { v.append(cell("span", "—", "mut")); return; } v.append(cell(o.plain ? "span" : "b", o.big, o.plain ? "plain" : "")); if (o.sm) v.append(cell("div", o.sm, "sm")); };
    out.append(table(P, [
      ["", (x, v) => { v.append(linkTo(x.r, x.r.n + (x.r.anchor ? " 初中部" : ""), "nm")); v.append(document.createTextNode(" ")); v.append(distTag(x.r.d)); v.append(cell("div", "zip " + x.r.z + (x.r.choice ? " · 选择校" : ""), "sm")); }, "head"],
      ["全州排名", val(rankV)], ["比上一年", val(trendV)],
      ["阅读达标", val(r => numV(r.e, "%"))], ["数学达标", val(r => numV(r.m, "%"))], ["科学达标", val(r => numV(r.sci, "%"))],
      ["GreatSchools", val(r => numV(r.g))], ["学生人数", val(r => r.enr ? { big: String(r.enr) } : null)],
      ["4 房房价", val(priceV)], ["备注", val(r => r.note ? { big: r.note, plain: true } : null)],
    ]));
    out.append(cell("p", "房价是各校所在 zip 的近期成交，不是学区内的房价；同一个 zip 里不同片区差别很大。", "note"));
  }
  function render() {
    const out = document.getElementById("c-out");
    out.textContent = "";
    if (st.mode === "line") renderLines(out); else renderSchools(out);
    syncURL();
  }
  document.querySelectorAll("#c-mode button").forEach(b => b.addEventListener("click", () => {
    if (st.mode === b.dataset.mode) return;
    st.mode = b.dataset.mode;
    if (st.mode === "line") { st.level = "E"; st.ids = st.ids.map(id => id && BY[id].lv === "E" ? id : ""); }
    if (!st.ids.some(Boolean)) st.ids = ["", ""];
    fill(); render();
  }));
  document.getElementById("c-level").addEventListener("change", e => { st.level = e.target.value; st.ids = ["", ""]; fill(); render(); });
  document.getElementById("c-add").addEventListener("click", () => { if (st.ids.length < MAX) { st.ids.push(""); slots(); render(); const s = document.querySelectorAll("#c-slots select"); if (s.length) s[s.length - 1].focus(); } });
  document.getElementById("c-swap").addEventListener("click", () => { st.ids.reverse(); fill(); render(); });
  document.getElementById("c-copy").addEventListener("click", () => {
    const u = location.href, msg = document.getElementById("c-copied");
    const done = () => { msg.textContent = "已复制"; setTimeout(() => { msg.textContent = ""; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done).catch(() => { msg.textContent = u; });
    else msg.textContent = u;
  });
  fill(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (st.mode === "line" && st.ids.some(Boolean)) render(); });
})();
