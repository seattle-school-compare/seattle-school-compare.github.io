(() => {
  const SITE = window.SITE || { base: "", ext: "" };
  const url = (path, q) => { const [p, h] = String(path).split("#"); return SITE.base + "zh/" + p + "/" + SITE.ext + (q ? "?" + q : "") + (h ? "#" + h : ""); };
  window.siteURL = url;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  window.esc = esc;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  window.store = store;

  /* 加到比一比: the list is kept in this browser only */
  const readCmp = () => { try { return JSON.parse(store.get("gssc-cmp") || "null"); } catch (x) { return null; } };
  document.querySelectorAll("[data-cmp]").forEach(btn => {
    const id = btn.dataset.cmp, m = btn.dataset.cmpm, lv = m === "line" ? "E" : btn.dataset.lv;
    const list = () => { const s = readCmp(); return s && Array.isArray(s.ids) && s.m === m && s.lv === lv ? s.ids.filter(Boolean) : []; };
    const go = document.createElement("a");
    go.className = "cmp-go";
    btn.before(go);
    let timer = null;
    const show = () => {
      const ids = list(), on = ids.includes(id);
      btn.textContent = on ? "✓ 已加入" : "加到比一比";
      btn.classList.toggle("btn2", on);
      go.hidden = !ids.length;
      go.textContent = "去比一比（" + ids.length + "）";
      go.href = url("compare", ids.map((x, i) => "abcd"[i] + "=" + x).join("&") + (m === "school" ? "&m=school" : ""));
    };
    btn.addEventListener("click", e => {
      e.preventDefault();
      const ids = list();
      if (ids.includes(id)) ids.splice(ids.indexOf(id), 1);
      else if (ids.length >= 4) { btn.textContent = "已满 4 个"; clearTimeout(timer); timer = setTimeout(show, 1800); return; }
      else ids.push(id);
      store.set("gssc-cmp", JSON.stringify({ m, lv, ids }));
      show();
    });
    show();
  });

  /* tooltips */
  const TIP = document.getElementById("tipbox");
  const touch = window.matchMedia && matchMedia("(hover: none)").matches;
  function show(el) {
    if (!TIP) return;
    TIP.innerHTML = el.getAttribute("data-tip");
    TIP.style.display = "block";
    const r = el.getBoundingClientRect(), t = TIP.getBoundingClientRect();
    let x = r.left + r.width / 2 - t.width / 2, y = r.top - t.height - 8;
    if (y < 6) y = r.bottom + 8;
    x = Math.max(6, Math.min(window.innerWidth - t.width - 6, x));
    TIP.style.left = x + "px"; TIP.style.top = y + "px";
  }
  function hide() { if (TIP) TIP.style.display = "none"; }
  window.showTip = show; window.hideTip = hide;
  if (!touch) {
    document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) show(t); });
    document.addEventListener("mouseout", e => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) hide(); });
  }
  document.addEventListener("focusin", e => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) show(t); });
  document.addEventListener("focusout", hide);
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-tip]");
    if (touch && t && !t.closest("a")) { show(t); return; }
    if (!t) hide();
  });
  window.addEventListener("scroll", hide, { passive: true });

  /* search */
  const IDX = (window.SEARCH || []).map(x => ({ label: x[0], sub: x[1], path: x[2], kw: (x[0] + " " + x[3]).toLowerCase(), zip: x[4] }));
  function find(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    if (/^\d{5}$/.test(q)) return IDX.filter(x => x.zip === q).slice(0, 20);
    const words = q.split(/\s+/);
    const scored = [];
    IDX.forEach(x => {
      const l = x.label.toLowerCase();
      if (!words.every(w => x.kw.includes(w))) return;
      let s = 1;
      if (l.startsWith(q)) s = 4;
      else if (l.split(/[\s\-]+/).some(t => t.startsWith(words[0]))) s = 3;
      else if (x.kw.split(/[\s\-]+/).some(t => t.startsWith(words[0]))) s = 2;
      scored.push([s, x]);
    });
    scored.sort((a, b) => b[0] - a[0] || a[1].label.localeCompare(b[1].label));
    return scored.slice(0, 12).map(s => s[1]);
  }
  const looksLikeAddress = q => /\d/.test(q) && /[a-z]{2,}/i.test(q) && !/^\d{5}$/.test(q.trim());
  document.querySelectorAll(".search").forEach(box => {
    const inp = box.querySelector("input"), out = box.querySelector(".search-out");
    let items = [], on = -1;
    const render = () => {
      const q = inp.value;
      items = find(q);
      on = items.length ? 0 : -1;
      if (!q.trim()) { out.hidden = true; out.textContent = ""; return; }
      if (!items.length) {
        out.innerHTML = "<p>" + (looksLikeAddress(q) ? "地址查询还在做，先输入校名或 5 位 zip。" : "没有找到。可以输入校名（英文）或 5 位 zip。") + "</p>";
      } else {
        out.innerHTML = items.map((x, i) => '<a href="' + url(x.path) + '" class="' + (i === on ? "on" : "") + '">' + esc(x.label) + '<span class="s">' + esc(x.sub) + "</span></a>").join("");
      }
      out.hidden = false;
    };
    inp.addEventListener("input", render);
    inp.addEventListener("focus", () => { if (inp.value.trim()) render(); });
    inp.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        on = (on + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        out.querySelectorAll("a").forEach((a, i) => a.classList.toggle("on", i === on));
      } else if (e.key === "Enter") {
        if (items.length) { e.preventDefault(); location.href = url(items[Math.max(0, on)].path); }
      } else if (e.key === "Escape") { out.hidden = true; inp.blur(); }
    });
    document.addEventListener("click", e => { if (!box.contains(e.target)) out.hidden = true; });
  });

  /* upcoming dates on school and district pages: hide what is over, keep four */
  document.querySelectorAll(".dates.upcoming").forEach(box => {
    const now = new Date(), t = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    let shown = 0;
    const kids = Array.from(box.children);
    for (let i = 0; i < kids.length; i += 2) {
      const keep = kids[i].dataset.end >= t && shown < 4;
      kids[i].hidden = kids[i + 1].hidden = !keep;
      if (keep) shown++;
    }
    if (!shown) box.closest(".card").hidden = true;
  });

  /* home: level switch and this month's dates */
  const seg = document.getElementById("lv-seg");
  if (seg) {
    const mapBox = document.getElementById("home-map");
    const setLv = lv => {
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lv === lv)));
      document.querySelectorAll(".lvblock").forEach(b => { b.hidden = b.dataset.lv !== lv; });
      if (mapBox) mapBox.dataset.lv = lv;
      store.set("gssc-lv", lv);
      hide();
    };
    seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => setLv(b.dataset.lv)));
    const saved = store.get("gssc-lv");
    if (saved && saved !== "E" && /^[EMH]$/.test(saved)) setLv(saved);
  }
  const month = document.querySelector(".entry.month");
  if (month && window.PAGE && PAGE.events) {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
    const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const today = iso(now), mEnd = iso(new Date(y, m, 0)), mStart = iso(new Date(y, m - 1, 1));
    const live = PAGE.events.filter(e => (e.end || e.start) >= today);
    let list = live.filter(e => e.start <= mEnd && (e.end || e.start) >= mStart), title = m + " 月要做的事";
    if (!list.length) { list = live.slice(0, 4); title = "接下来要做的事"; }
    const fmt = s => { const p = s.split("-"); return Number(p[1]) + "/" + Number(p[2]); };
    month.querySelector(".t").textContent = title;
    const tag = e => '<span class="dtag ' + (e.d && e.d !== "PRIV" ? e.d : "") + '">' + (e.d === "PRIV" ? "私校" : esc(e.d || "")) + "</span> ";
    month.querySelector(".dates").innerHTML = list.slice(0, 4).map(e => '<span class="dt">' + fmt(e.start) + (e.end ? "–" + fmt(e.end) : "") + '</span><span class="w">' + tag(e) + esc(e.what) + "</span>").join("") || '<span class="dt"></span><span class="w">这段时间没有收录的日期</span>';
  }
})();

// visit count in the footer: old one-page site ("/") plus every page of the new site since launch
(() => {
  const el = document.getElementById("visits"), gc = document.querySelector("script[data-goatcounter]");
  if (!el || !gc) return;
  const base = gc.getAttribute("data-goatcounter").replace(/\/count$/, "/counter/");
  const get = p => fetch(base + p).then(r => r.ok ? r.json() : null).then(d => d ? Number(String(d.count).replace(/[^0-9]/g, "")) || 0 : 0).catch(() => 0);
  Promise.all([get(encodeURIComponent("/") + ".json"), get("TOTAL.json?start=2026-10-30")]).then(([a, b]) => {
    if (!(a + b)) return;
    el.textContent = "累计访问 " + (a + b).toLocaleString("en-US") + " 次";
    el.title = "GoatCounter 统计，最多晚 4 小时更新";
    el.hidden = false;
  });
})();

// college lists on private pages: school's order or admission rate
document.querySelectorAll(".sortseg").forEach(seg => seg.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  const ul = seg.parentElement.querySelector("ul"), k = b.dataset.s;
  [...ul.children].sort((p, q) => (p.dataset[k] - q.dataset[k]) || (p.dataset.i - q.dataset.i)).forEach(x => ul.append(x));
}));

/* 收藏: a short list kept in this browser only; a link can carry it to another phone */
(() => {
  const store = window.store, url = window.siteURL, esc = window.esc, SITE = window.SITE || { base: "" };
  const KEY = "gssc-fav", MAX = 40;
  const read = () => { try { const v = JSON.parse(store.get(KEY) || "[]"); return Array.isArray(v) ? v.filter(x => x && x.p) : []; } catch (e) { return []; } };
  const write = L => { store.set(KEY, JSON.stringify(L.slice(0, MAX))); document.dispatchEvent(new CustomEvent("fav")); };
  const fav = {
    list: read,
    paths: () => read().map(x => x.p),
    has: p => read().some(x => x.p === p),
    toggle(it) { const L = read(), i = L.findIndex(x => x.p === it.p); if (i >= 0) L.splice(i, 1); else L.unshift(it); write(L); },
    remove(p) { write(read().filter(x => x.p !== p)); },
    merge(items) { const L = read(), have = new Set(L.map(x => x.p)); items.forEach(it => { if (!have.has(it.p)) L.push(it); }); write(L); },
    label: on => on ? "★ 已收藏" : "☆ 收藏",
    sync(root) { (root || document).querySelectorAll("[data-fav]").forEach(b => { const on = fav.has(b.dataset.fav); b.setAttribute("aria-pressed", String(on)); b.textContent = fav.label(on); }); }
  };
  window.fav = fav;
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-fav]");
    if (!b) return;
    e.preventDefault();
    fav.toggle({ p: b.dataset.fav, n: b.dataset.favn || "", s: b.dataset.favs || "" });
  });
  const top = () => document.querySelectorAll(".favtop").forEach(a => { const n = read().length; a.hidden = !n; a.querySelector("b").textContent = n; });
  document.addEventListener("fav", () => { fav.sync(); top(); });
  fav.sync(); top();

  // the 收藏 page: my list, and a list someone sent as a link
  const box = document.getElementById("favs");
  if (!box) return;
  const sent = (new URLSearchParams(location.search).get("fav") || "").split(",").map(x => x.trim()).filter(Boolean);
  const idx = {};
  (window.SEARCH || []).forEach(r => { idx[r[2]] = r; });
  let got = null;
  const chip = (it, x) => '<span class="fchip"><a href="' + esc(url(it.p)) + '">' + esc(it.n || it.p) + (it.s ? "<small>" + esc(it.s) + "</small>" : "") + "</a>" +
    (x ? '<button type="button" class="x" data-rm="' + esc(it.p) + '" aria-label="去掉 ' + esc(it.n) + '">×</button>' : "") + "</span>";
  const render = () => {
    const mine = read();
    let h = "";
    if (got && got.length) {
      const fresh = got.filter(it => !mine.some(x => x.p === it.p));
      h += '<div class="fsent"><div class="fh"><b>家人发来的收藏</b><span class="n">' + got.length + ' 个</span></div><div class="fchips">' + got.map(it => chip(it, false)).join("") + "</div>" +
        '<div class="fact">' + (fresh.length ? '<button type="button" class="btn sm" data-act="save">存到我的收藏</button>' : '<span class="n">都已经在你的收藏里了</span>') +
        '<button type="button" class="btn btn2 sm" data-act="close">不用了</button></div></div>';
    }
    if (mine.length) {
      h += '<div class="fmine"><div class="fh"><b>我的收藏</b><span class="n">' + mine.length + ' 个</span><button type="button" class="btn btn2 sm" data-act="share">发给家人</button></div>' +
        '<div class="fchips">' + mine.map(it => chip(it, true)).join("") + '</div><p class="fmsg" hidden></p></div>';
    }
    box.innerHTML = h || '<p class="empty">还没有收藏。在公校页、私校页、托儿和课外班里点“☆ 收藏”，就会出现在这里。</p>';
  };
  const dropQuery = () => { got = null; try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {} render(); };
  box.addEventListener("click", e => {
    const rm = e.target.closest("[data-rm]");
    if (rm) { fav.remove(rm.dataset.rm); return; }
    const a = e.target.closest("[data-act]");
    if (!a) return;
    if (a.dataset.act === "save") { fav.merge(got); dropQuery(); }
    else if (a.dataset.act === "close") dropQuery();
    else if (a.dataset.act === "share") {
      const link = new URL(SITE.base + "zh/favorites/", location.href).href.split("?")[0] + "?fav=" + read().map(x => encodeURIComponent(x.p)).join(",");
      const msg = box.querySelector(".fmsg"), say = t => { msg.textContent = t; msg.hidden = false; };
      if (navigator.share) navigator.share({ title: "收藏的学校", url: link }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => say("链接已经复制，可以贴到微信里发给家人。"), () => say(link));
      else say(link);
    }
  });
  document.addEventListener("fav", render);
  // names for a sent list: schools and classes from the search index, child care from its own data file
  const finish = () => {
    got = sent.map(p => {
      if (p.startsWith("childcare#c=")) {
        const r = window.CC && window.CC.C.find(x => x[0] === p.slice(12));
        return r ? { p, n: r[1], s: "托儿 · " + r[3] } : null;
      }
      const r = idx[p];
      return r ? { p, n: r[0], s: r[1] } : null;
    }).filter(Boolean);
    render();
  };
  if (sent.some(p => p.startsWith("childcare#c=")) && !window.CC) {
    const sc = document.createElement("script"), me = document.querySelector('script[src*="site.js"]');
    sc.src = SITE.base + "assets/cc-data.js" + (me && me.src.includes("?") ? "?" + me.src.split("?")[1] : "");
    sc.onload = finish; sc.onerror = finish;
    document.head.append(sc);
  } else if (sent.length) finish();
  else render();
})();

// offline copies for the home-screen app (live site only)
if (window.SITE && SITE.sw && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register(SITE.base + "sw.js").catch(() => {}));
}
