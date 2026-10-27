/* ==========================================================
   Achieve Your Goals — goal planner prototype
   config → calc engine → components (odometer, ruler, sheet, chart) → screens
   ========================================================== */
(() => {
  "use strict";

  /* ---------------- config ---------------- */
  const GOALS = {
    crore: {
      title: "Build your 1st crore", tag: "Milestone", theme: "th-ink",
      num: "₹1<small>Cr</small>",
      head: 'Let\'s build your <span class="serif">first crore.</span>',
      defaults: { target: 1e7, ret: 12, years: 15, existing: 0, inflation: 6 },
      chips: [5e6, 1e7, 2e7, 5e7],
    },
    home: {
      title: "Buy your dream home", tag: "Home", theme: "th-sky",
      num: "₹75<small>L</small>",
      head: 'Let\'s plan your <span class="serif">dream home.</span>',
      defaults: { target: 7.5e6, ret: 12, years: 10, existing: 5e5, inflation: 6 },
      chips: [2.5e6, 5e6, 7.5e6, 1.5e7],
    },
    car: {
      title: "Buy your dream car", tag: "Car", theme: "th-navy",
      num: "₹15<small>L</small>",
      head: 'Let\'s get your <span class="serif">dream car.</span>',
      defaults: { target: 1.5e6, ret: 10, years: 5, existing: 2e5, inflation: 6 },
      chips: [8e5, 1.5e6, 2.5e6, 5e6],
    },
    custom: {
      title: "Customise your goal", tag: "Your rules", theme: "th-mist",
      num: '<span class="serif">Anything.</span>',
      head: 'Shape a goal <span class="serif">your way.</span>',
      defaults: { target: 1e6, ret: 11, years: 7, existing: 0, inflation: 6 },
      chips: [5e5, 1e6, 2.5e6, 5e6],
      names: ["Child's education", "Wedding", "World trip", "Early retirement", "Sabbatical"],
    },
  };
  const ORDER = ["crore", "home", "car", "custom"];

  const RISK = [
    { id: "low", label: "Low", range: "Up to 9%", preset: 8, tone: "#12A26A" },
    { id: "medium", label: "Medium", range: "9–13%", preset: 11, tone: "#D98E1F" },
    { id: "high", label: "High", range: "13%+", preset: 15, tone: "#E5484D" },
  ];
  const riskFromReturn = (r) => (r < 9 ? "low" : r < 13 ? "medium" : "high");
  const riskOf = (id) => RISK.find((r) => r.id === id);

  const DIALS = {
    years: { label: "Tenure", min: 1, max: 40, step: 1, major: 5, unit: (v) => (v === 1 ? " yr" : " yrs"), fmt: (v) => v },
    ret: { label: "Expected annual return", min: 1, max: 30, step: 0.5, major: 4, unit: () => "%", fmt: (v) => v + "%" },
    inflation: { label: "Inflation", min: 0, max: 15, step: 0.5, major: 2, unit: () => "%", fmt: (v) => v + "%" },
  };
  const AMOUNT_MIN = 1e4, AMOUNT_MAX_DIGITS = 11;
  const STORE_KEY = "bb_goals_v2";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- formatting ---------------- */
  const inr = (v) => "₹" + Math.round(v).toLocaleString("en-IN");
  const trim = (n) => String(+n.toFixed(2));
  const short = (v) => {
    const a = Math.abs(v);
    if (a >= 1e7) return "₹" + trim(v / 1e7) + " Cr";
    if (a >= 1e5) return "₹" + trim(v / 1e5) + " L";
    if (a >= 1e3) return "₹" + trim(v / 1e3) + "K";
    return inr(v);
  };
  const words = (v) => {
    if (v >= 1e7) return trim(v / 1e7) + " Crore";
    if (v >= 1e5) return trim(v / 1e5) + " Lakh";
    if (v >= 1e3) return trim(v / 1e3) + " Thousand";
    return "";
  };
  const addMonths = (m) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m); return d; };
  const monthYear = (d) => d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yrs = (n) => n + (n === 1 ? " year" : " years");

  /* ---------------- calc engine ----------------
     Goal value is inflated to the target date. Existing investment compounds
     annually at the expected return. SIP is paid at the start of each month
     (annuity due) at a monthly rate of return / 12.                        */
  function calc(s) {
    const n = s.years, r = s.ret / 100, i = r / 12, M = n * 12;
    const fac = (m) => (i === 0 ? m : ((Math.pow(1 + i, m) - 1) / i) * (1 + i));
    const exAt = (m) => s.existing * Math.pow(1 + r, m / 12);
    const future = s.target * Math.pow(1 + s.inflation / 100, n);
    const sip = M > 0 ? Math.max(0, future - exAt(M)) / fac(M) : 0;
    const valueAt = (m) => exAt(m) + sip * fac(m);
    const investedAt = (m) => s.existing + sip * m;
    const projected = valueAt(M), totalSip = sip * M, totalInvested = totalSip + s.existing;

    const milestones = [0.25, 0.5, 0.75, 1].map((f) => {
      const need = f * future * 0.99999;
      let m = 0;
      while (m < M && valueAt(m) < need) m++;
      return { f, month: m, date: addMonths(m), amount: f * future };
    });

    return {
      future, sip, totalSip, totalInvested, projected, returns: projected - totalInvested,
      valueAt, investedAt, months: M, milestones,
      existingFV: exAt(M), covered: exAt(M) >= future,
      coverPct: future > 0 ? clamp((exAt(M) / future) * 100, 0, 100) : 0,
      targetDate: addMonths(M),
    };
  }

  /* ---------------- icons ---------------- */
  const P = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    reset: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4V3z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    del: '<path d="M21 5H9l-7 7 7 7h12a1 1 0 001-1V6a1 1 0 00-1-1z"/><path d="M17 9l-6 6M11 9l6 6"/>',
    chev: '<path d="M7 10l5 5 5-5"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  /* ---------------- abstract geometry (thin-line, no illustration) ---------------- */
  function geo(id) {
    const W = 300, H = 400;
    let g = "";
    if (id === "crore") {
      for (let r = 40; r <= 220; r += 30) g += `<circle cx="240" cy="112" r="${r}" fill="none" stroke="rgba(255,255,255,.09)"/>`;
      g += `<g class="spin"><circle cx="340" cy="112" r="5" fill="#F2B04A"/><circle cx="240" cy="12" r="3" fill="#fff" opacity=".7"/></g>`;
    } else if (id === "home") {
      for (let k = 0; k < 7; k++) g += `<polyline points="130,${200 - k * 22} 235,${95 - k * 22} 340,${200 - k * 22}" fill="none" stroke="rgba(11,13,18,${0.1 - k * 0.012})" stroke-width="1.2"/>`;
    } else if (id === "car") {
      for (let k = 0; k < 11; k++) {
        const y = 52 + k * 14, x1 = 90 + ((k * 37) % 90);
        g += `<line x1="${x1}" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,${k === 5 ? 0.5 : 0.1})" stroke-width="${k === 5 ? 1.6 : 1}" stroke-linecap="round"/>`;
      }
    } else {
      for (let x = 150; x <= 300; x += 16) for (let y = 20; y <= 200; y += 16) g += `<circle cx="${x}" cy="${y}" r="1.2" fill="rgba(11,13,18,.12)"/>`;
      g += `<circle cx="232" cy="110" r="62" fill="none" stroke="#7A6CFF" stroke-opacity=".5" stroke-dasharray="3 6"/>`;
      g += `<path d="M232 92v36M214 110h36" stroke="#7A6CFF" stroke-width="2" stroke-linecap="round"/>`;
    }
    return `<svg class="geo" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">${g}</svg>`;
  }

  /* ---------------- state ---------------- */
  let current = null;
  let saved = load();
  function load() {
    try { const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* storage unavailable */ } }
  function newState(goalId) {
    const d = GOALS[goalId].defaults;
    return { goalId, name: "", ...d, risk: riskFromReturn(d.ret), savedId: null };
  }
  const goalName = (s) => (s.goalId === "custom" ? s.name.trim() || "My custom goal" : GOALS[s.goalId].title);
  const targetError = (v) => (!v || v < AMOUNT_MIN ? "Enter at least ₹10,000" : "");

  /* ---------------- dom helpers ---------------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const scr = { home: $("#scr-home"), planner: $("#scr-planner"), result: $("#scr-result") };

  /* ---------------- odometer ---------------- */
  const isDigit = (c) => c >= "0" && c <= "9";
  function odo(el, text) {
    if (el._t === text) return;
    const chars = [...text];
    const prev = el._t ? [...el._t] : null;
    const rebuild = !prev || prev.length !== chars.length || chars.some((c, i) => isDigit(c) !== isDigit(prev[i]));
    if (rebuild) {
      el.innerHTML = `<span class="sr">${text}</span><span class="odo" aria-hidden="true">${chars.map((c) => isDigit(c)
        ? `<span class="od"><span class="od-s">${"0123456789".split("").map((d) => `<span>${d}</span>`).join("")}</span></span>`
        : `<span class="od-c">${c}</span>`).join("")}</span>`;
      void el.offsetWidth;
    } else {
      $(".sr", el).textContent = text;
    }
    const cells = $(".odo", el).children;
    chars.forEach((c, i) => { if (isDigit(c)) cells[i].firstChild.style.transform = `translateY(-${c * 10}%)`; });
    el._t = text;
  }

  /* ---------------- ruler (scroll-snap dial) ---------------- */
  function ruler(host, key, value, onChange) {
    const cfg = DIALS[key];
    const n = Math.round((cfg.max - cfg.min) / cfg.step);
    let ticks = "";
    for (let k = 0; k <= n; k++) {
      const v = +(cfg.min + k * cfg.step).toFixed(2), maj = k % cfg.major === 0;
      ticks += `<span class="t${maj ? " maj" : ""}">${maj ? `<em>${cfg.fmt(v)}</em>` : ""}</span>`;
    }
    host.innerHTML = `<div class="ruler" tabindex="0" role="slider" aria-label="${cfg.label}" aria-valuemin="${cfg.min}" aria-valuemax="${cfg.max}" aria-valuenow="${value}">
      <div class="ruler-scroll"><span class="sp"></span>${ticks}<span class="sp"></span></div><span class="needle"></span></div>`;
    const el = $(".ruler", host), sc = $(".ruler-scroll", host);
    let cur = value, lock = false, lockT, raf;
    const idx = (v) => Math.round((v - cfg.min) / cfg.step);
    const valAt = (k) => +(cfg.min + clamp(k, 0, n) * cfg.step).toFixed(2);

    function set(v, smooth) {
      cur = v; lock = true; clearTimeout(lockT);
      sc.scrollTo({ left: idx(v) * 10, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
      lockT = setTimeout(() => { lock = false; }, smooth ? 600 : 80);
      el.setAttribute("aria-valuenow", v);
    }
    const emit = (v) => { if (v === cur) return; cur = v; el.setAttribute("aria-valuenow", v); onChange(v); };

    sc.addEventListener("scroll", () => {
      if (lock) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => emit(valAt(Math.round(sc.scrollLeft / 10))));
    }, { passive: true });
    sc.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); sc.scrollLeft += e.deltaY * 0.5; }
    }, { passive: false });

    let dragX = null, startL = 0;
    sc.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragX = e.clientX; startL = sc.scrollLeft; lock = false;
      sc.classList.add("drag"); sc.setPointerCapture(e.pointerId);
    });
    sc.addEventListener("pointermove", (e) => { if (dragX !== null) sc.scrollLeft = startL - (e.clientX - dragX); });
    const end = () => { if (dragX === null) return; dragX = null; sc.classList.remove("drag"); set(cur, true); };
    sc.addEventListener("pointerup", end);
    sc.addEventListener("pointercancel", end);

    el.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const v = valAt(idx(cur) + d);
      emit(v); set(v, true);
    });

    set(value, false);
    requestAnimationFrame(() => set(cur, false));
    return { set, step: (d) => { const v = valAt(idx(cur) + d); emit(v); set(v, true); } };
  }

  /* ---------------- sheet ---------------- */
  const sheet = $("#sheet"), backdrop = $("#backdrop");
  let sheetCleanup = null, lastFocus = null;
  function openSheet(html, onMount) {
    lastFocus = document.activeElement;
    sheet.innerHTML = `<div class="grab"></div>${html}`;
    sheet.hidden = false; backdrop.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add("show"); backdrop.classList.add("show");
    sheetCleanup = onMount ? onMount(sheet) : null;
    const f = $("[data-autofocus]", sheet) || $("button", sheet);
    if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove("show"); backdrop.classList.remove("show");
    if (sheetCleanup) sheetCleanup(); sheetCleanup = null;
    setTimeout(() => { sheet.hidden = true; backdrop.hidden = true; sheet.innerHTML = ""; }, 420);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  backdrop.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  const sheetHead = (title) => `<div class="sheet-head"><h2 id="sheet-title">${title}</h2><button class="round" data-close aria-label="Close">${icon("close")}</button></div>`;
  sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });

  function amountSheet(field) {
    const s = current, g = GOALS[s.goalId];
    const isTarget = field === "target";
    let buf = s[field] ? String(Math.round(s[field])) : "";
    const chips = isTarget ? g.chips : [0, 1e5, 5e5, 1e6, 2.5e6];
    openSheet(`
      ${sheetHead(isTarget ? "Targeted goal value" : "Existing investment")}
      <div class="amt-display" id="amt-d" aria-live="polite"></div>
      <div class="amt-words" id="amt-w"></div>
      <div class="suggest">${chips.map((v) => `<button class="chip" data-v="${v}">${v ? short(v) : "None"}</button>`).join("")}</div>
      <div class="keypad" role="group" aria-label="Number pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button data-k="${k}">${k}</button>`).join("")}
        <button data-k="00">00</button><button data-k="0">0</button><button data-k="del" aria-label="Delete">${icon("del")}</button>
      </div>
      <button class="btn btn-ink wide" data-done data-autofocus>Done</button>
      <p class="sheet-note">${isTarget ? "Enter the cost <b>in today's money</b>. We'll adjust it for inflation." : "Money already set aside for this goal. It keeps growing at your expected return."}</p>`,
    (root) => {
      const d = $("#amt-d", root), w = $("#amt-w", root);
      const paint = () => {
        const v = buf ? Number(buf) : 0;
        d.innerHTML = `<span class="cur">₹</span>${v ? v.toLocaleString("en-IN") : `<span style="color:var(--faint)">0</span>`}<span class="caret"></span>`;
        const err = isTarget ? targetError(v) : "";
        w.textContent = err && buf ? err : words(v) || (isTarget ? "Type an amount" : "Nothing yet? That's fine.");
        w.classList.toggle("err", !!(err && buf));
        $$("[data-v]", root).forEach((c) => c.classList.toggle("on", +c.dataset.v === v));
        s[field] = v;
        refreshPlanner();
      };
      const press = (k) => {
        if (k === "del") buf = buf.slice(0, -1);
        else if (buf.length + k.length <= AMOUNT_MAX_DIGITS && !(buf === "" && k[0] === "0")) buf += k;
        else { d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); return; }
        paint();
      };
      root.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.k) press(b.dataset.k);
        else if (b.dataset.v !== undefined) { buf = +b.dataset.v ? String(b.dataset.v) : ""; paint(); }
        else if (b.hasAttribute("data-done")) {
          if (isTarget && targetError(Number(buf))) { d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); return; }
          closeSheet();
        }
      });
      const onKey = (e) => {
        if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
        else if (e.key === "Backspace") { e.preventDefault(); press("del"); }
        else if (e.key === "Enter") { e.preventDefault(); $("[data-done]", root).click(); }
      };
      document.addEventListener("keydown", onKey);
      paint();
      return () => document.removeEventListener("keydown", onKey);
    });
  }

  function dialSheet(key) {
    const s = current, cfg = DIALS[key];
    openSheet(`
      ${sheetHead(cfg.label)}
      <div class="dial-val"><span id="dv"></span><small id="du"></small></div>
      <div id="dial-host"></div>
      <div class="steppers">
        <button class="round" data-d="-1" aria-label="Decrease">${icon("minus")}</button>
        <button class="round" data-d="1" aria-label="Increase">${icon("plus")}</button>
      </div>
      <p class="sheet-note" id="dial-note"></p>
      <button class="btn btn-ink wide" data-close data-autofocus>Done</button>`,
    (root) => {
      const note = () => {
        const r = calc(s);
        if (key === "years") return `Your target date becomes <b>${monthYear(r.targetDate)}</b>, which is ${r.months} monthly SIPs.`;
        if (key === "inflation") return `${short(s.target)} today will cost about <b>${short(r.future)}</b> in ${r.targetDate.getFullYear()}.`;
        const rk = riskOf(s.risk);
        return `That's <b style="color:${rk.tone}">${rk.label} risk</b>. Risk level updates automatically with your return.`;
      };
      const paint = () => {
        if (!$("#dv", root)) return; // sheet already closed
        $("#dv", root).textContent = s[key];
        $("#du", root).textContent = cfg.unit(s[key]);
        $("#dial-note", root).innerHTML = note();
      };
      const r = ruler($("#dial-host", root), key, s[key], (v) => {
        s[key] = v;
        if (key === "ret") s.risk = riskFromReturn(v);
        paint(); refreshPlanner(key === "ret" ? "ret" : null);
      });
      root.addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (b) r.step(+b.dataset.d); });
      paint();
      $(".ruler", root).focus({ preventScroll: true });
      return null;
    });
  }

  /* ---------------- navigation ---------------- */
  let active = "home";
  function transition(fn, el) {
    if (!document.startViewTransition || reduceMotion) { fn(); return; }
    if (el) el.style.viewTransitionName = "goal-mesh";
    let done = false;
    const run = () => { if (done) return; done = true; if (el) el.style.viewTransitionName = ""; fn(); };
    try { document.startViewTransition(run); } catch { run(); }
    setTimeout(run, 350); // never leave navigation hanging if the transition stalls
  }
  function show(name) {
    if (name === "result") syncSaved();
    if (name === "home") renderHome();
    if (name === "result") renderResult();
    if (name === "planner" && !scr.planner.innerHTML) renderPlanner();
    Object.entries(scr).forEach(([k, el]) => { el.hidden = k !== name; });
    active = name;
    window.scrollTo(0, 0);
    onScroll();
    if (!document.startViewTransition) { scr[name].classList.remove("enter"); void scr[name].offsetWidth; scr[name].classList.add("enter"); }
    if (name === "result") playResult();
  }
  function go(name, el) {
    history.pushState({ screen: name, from: active }, "");
    transition(() => show(name), el);
  }
  window.addEventListener("popstate", (e) => {
    closeSheet();
    let name = (e.state && e.state.screen) || "home";
    if (name !== "home" && !current) name = "home";
    transition(() => show(name));
  });
  history.replaceState({ screen: "home" }, "");

  function onScroll() {
    const nav = $(".nav[data-sticky]", scr[active]);
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3000);
  }

  /* ==========================================================
     HOME
     ========================================================== */
  function renderHome() {
    const cards = ORDER.map((id, k) => {
      const g = GOALS[id], r = calc(newState(id));
      const est = id === "custom"
        ? `<b>Name it, price it</b>Education, travel, anything`
        : `<b>≈ ${inr(r.sip)}/mo</b>for ${yrs(g.defaults.years)}`;
      return `<button class="gcard mesh ${g.theme}" data-goal="${id}" aria-label="${g.title}">
        ${geo(id)}
        <span class="top"><span class="tag">${g.tag}</span><span class="idx">0${k + 1} / 04</span></span>
        <span>
          <span class="num" style="display:block">${g.num}</span>
          <span class="name" style="display:block">${g.title}</span>
          <span class="foot"><span class="est">${est}</span><span class="go">${icon("arrow")}</span></span>
        </span>
      </button>`;
    }).join("");

    const savedHtml = saved.length ? `
      <section class="sec">
        <div class="sec-head"><h2 class="h2">Your goals</h2><span class="meta">${saved.length} saved</span></div>
        <div class="rows">${saved.map((p) => {
          const g = GOALS[p.state.goalId];
          return `<div class="row">
            <button class="row-open" data-open="${p.id}">
              <span class="chip-mesh mesh ${g.theme}">${short(p.state.target).replace("₹", "")}</span>
              <span class="meta"><b>${esc(goalName(p.state))}</b><span>${short(p.future)} by ${monthYear(new Date(p.targetDate))}</span></span>
              <span class="amt">${inr(p.sip)}<span>per month</span></span>
            </button>
            <button class="x" data-del="${p.id}" aria-label="Remove ${esc(goalName(p.state))}">${icon("close")}</button>
          </div>`;
        }).join("")}</div>
      </section>` : "";

    scr.home.innerHTML = `
      <header class="nav" data-sticky>
        <button class="round" data-act="exit" aria-label="Back to Bajaj Broking">${icon("back")}</button>
        <span class="title">Goals</span>
        <button class="round" data-act="how" aria-label="How it works">${icon("info")}</button>
      </header>
      <div class="pad">
        <div class="eyebrow">Goal planner</div>
        <h1 class="h1">What are you<br><span class="serif">saving for?</span></h1>
        <p class="lede">Pick a goal. We'll turn it into one monthly number.</p>
      </div>
      <section class="sec" style="margin-top:28px">
        <div class="rail" id="rail" style="position:relative">${cards}</div>
        <div class="rail-progress" aria-hidden="true"><i id="rail-thumb"></i></div>
      </section>
      ${savedHtml}
      <section class="sec" id="how">
        <div class="sec-head"><h2 class="h2">How it works</h2></div>
        <ol class="steps">
          <li><span class="n">01</span><div><b>Pick a goal</b><span>First crore, home, car or your own</span></div></li>
          <li><span class="n">02</span><div><b>Fill in your sentence</b><span>Tap any blue value to change it</span></div></li>
          <li><span class="n">03</span><div><b>Get your SIP plan</b><span>Monthly amount, growth path and milestones</span></div></li>
        </ol>
      </section>
      <p class="fine">Estimates on cards use suggested values for each goal. Mutual fund investments are subject to market risks. Returns are not guaranteed.</p>`;

    const rail = $("#rail", scr.home), thumb = $("#rail-thumb", scr.home);
    const cardsEl = $$(".gcard", rail);
    const paint = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      thumb.style.transform = `translateX(${max > 0 ? (rail.scrollLeft / max) * 300 : 0}%)`;
      cardsEl.forEach((c) => {
        const d = Math.abs(c.offsetLeft - rail.scrollLeft - 20);
        c.style.setProperty("--k", (1 - Math.min(1, d / c.offsetWidth)).toFixed(3));
      });
    };
    let raf;
    rail.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }, { passive: true });
    paint();
  }

  scr.home.addEventListener("click", (e) => {
    const t = e.target.closest("[data-goal],[data-open],[data-del],[data-act]");
    if (!t) return;
    if (t.dataset.goal) {
      current = newState(t.dataset.goal);
      scr.planner.innerHTML = "";
      go("planner", t);
    } else if (t.dataset.open) {
      const p = saved.find((x) => x.id === t.dataset.open);
      if (p) { current = { ...p.state, savedId: p.id }; scr.planner.innerHTML = ""; go("result"); }
    } else if (t.dataset.del) {
      const p = saved.find((x) => x.id === t.dataset.del);
      saved = saved.filter((x) => x.id !== t.dataset.del); persist(); renderHome();
      if (p) toast(`Removed “${goalName(p.state)}”`);
    } else if (t.dataset.act === "exit") toast("Demo: this would return to the Bajaj Broking home screen.");
    else if (t.dataset.act === "how") $("#how").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ==========================================================
     PLANNER
     ========================================================== */
  let retRuler = null;
  const tok = (key, extra = "") => `<button class="tok" data-tok="${key}" ${extra}><span data-tv="${key}"></span>${icon("chev")}</button>`;

  function renderPlanner() {
    const s = current, g = GOALS[s.goalId];
    const ri = RISK.findIndex((r) => r.id === s.risk);
    scr.planner.innerHTML = `
      <div class="p-head mesh ${g.theme}" style="view-transition-name:goal-mesh">
        ${geo(s.goalId)}
        <header class="nav">
          <button class="round glass" data-act="back" aria-label="Back">${icon("back")}</button>
          <button class="round glass" data-act="reset" aria-label="Reset to suggested values">${icon("reset")}</button>
        </header>
        <div class="kicker">${g.title}</div>
        <h1>${g.head}</h1>
      </div>
      <div class="panel">
        ${s.goalId === "custom" ? `
          <input class="name-input" id="goal-name" maxlength="40" placeholder="Name your goal" value="${esc(s.name)}" autocomplete="off" aria-label="Goal name" />
          <div class="suggest">${g.names.map((n) => `<button class="chip" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : ""}
        <div class="label-sm">Your plan, in one sentence</div>
        <p class="sentence">
          I want ${tok("target")} in <span class="nw">${tok("years")}.</span> I've already invested <span class="nw">${tok("existing")}.</span>
          I'm comfortable with ${tok("risk")} risk, expecting ${tok("ret")} a year, with inflation at <span class="nw">${tok("inflation")}.</span>
        </p>
        <div class="tap-hint"><i></i>Tap any blue value to change it</div>

        <div class="block" id="risk-block">
          <div class="block-head"><h3>Risk &amp; return</h3><span class="linked" id="linked">${icon("link")}Linked</span></div>
          <div class="seg" id="seg" role="radiogroup" aria-label="Risk level" style="--i:${ri};--tone:${RISK[ri].tone}">
            ${RISK.map((r) => `<button role="radio" data-risk="${r.id}" aria-checked="${r.id === s.risk}">${r.label}</button>`).join("")}
          </div>
          <div class="seg-desc">${RISK.map((r) => `<span>${r.range}</span>`).join("")}</div>
          <div class="dial-val"><span id="ret-v"></span><small>%</small></div>
          <div class="dial-cap">Expected annual return</div>
          <div id="ret-host"></div>
        </div>

        <div class="facts">
          <div class="fact"><span>Goal at target date</span><b id="f-future"></b><small id="f-date"></small></div>
          <div class="fact"><span>Existing covers</span><b id="f-cover"></b><div class="bar"><i id="f-bar"></i></div></div>
        </div>
        <p class="fine">Projections assume a constant return and are for illustration only. Market-linked returns are not guaranteed.</p>
      </div>
      <div class="dock"><div class="dock-bar">
        <div class="live"><span>Monthly SIP required</span><b><span id="live"></span><em>/mo</em></b></div>
        <button class="btn btn-light" data-act="plan">See plan ${icon("arrow")}</button>
      </div></div>`;

    retRuler = ruler($("#ret-host", scr.planner), "ret", s.ret, (v) => {
      const before = current.risk;
      current.ret = v; current.risk = riskFromReturn(v);
      refreshPlanner(current.risk !== before ? "risk" : null);
    });
    const nameEl = $("#goal-name", scr.planner);
    if (nameEl) nameEl.addEventListener("input", () => {
      current.name = nameEl.value;
      $$("[data-name]", scr.planner).forEach((c) => c.classList.toggle("on", c.dataset.name === current.name));
    });
    refreshPlanner();
  }

  function flash(el) { if (!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  function pulseLinked() {
    const l = $("#linked", scr.planner);
    if (!l) return;
    l.classList.add("on"); clearTimeout(l._t); l._t = setTimeout(() => l.classList.remove("on"), 900);
  }

  function refreshPlanner(changed) {
    const p = scr.planner;
    if (!p.innerHTML || !current) return;
    const s = current, r = calc(s), rk = riskOf(s.risk), err = targetError(s.target);
    const tv = (k, v) => { const el = $(`[data-tv="${k}"]`, p); if (el) el.textContent = v; };
    tv("target", s.target ? short(s.target) : "₹0");
    tv("years", yrs(s.years));
    tv("existing", s.existing ? short(s.existing) : "₹0");
    tv("risk", rk.label.toLowerCase());
    tv("ret", s.ret + "%");
    tv("inflation", s.inflation + "%");
    $('[data-tok="target"]', p).classList.toggle("err", !!err);
    const rt = $('[data-tok="risk"]', p);
    rt.classList.add("tone"); rt.style.setProperty("--tone", rk.tone);

    const seg = $("#seg", p), ri = RISK.indexOf(rk);
    seg.style.setProperty("--i", ri); seg.style.setProperty("--tone", rk.tone);
    $$("[data-risk]", seg).forEach((b) => b.setAttribute("aria-checked", b.dataset.risk === s.risk));
    $("#ret-v", p).textContent = s.ret;

    if (changed === "risk") { pulseLinked(); flash(rt); flash($('[data-tok="ret"]', p)); }
    if (changed === "ret") { flash($('[data-tok="ret"]', p)); if (retRuler) retRuler.set(s.ret, false); }

    $("#f-future", p).textContent = err ? "–" : short(r.future);
    $("#f-date", p).textContent = "by " + monthYear(r.targetDate);
    $("#f-cover", p).textContent = err ? "–" : Math.round(r.coverPct) + "%";
    $("#f-bar", p).style.width = (err ? 0 : r.coverPct) + "%";

    odo($("#live", p), err ? "₹0" : inr(r.sip));
    $('[data-act="plan"]', p).disabled = !!err;
  }

  scr.planner.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t || !current) return;
    const s = current;
    if (t.dataset.act === "back") history.back();
    else if (t.dataset.act === "reset") {
      current = { ...newState(s.goalId), name: s.name, savedId: s.savedId };
      renderPlanner(); toast("Reset to suggested values");
    } else if (t.dataset.act === "plan") go("result");
    else if (t.dataset.tok) {
      const k = t.dataset.tok;
      if (k === "target" || k === "existing") amountSheet(k);
      else if (k === "risk") {
        const b = $("#risk-block", scr.planner);
        b.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        b.classList.remove("focus"); void b.offsetWidth; b.classList.add("focus");
      } else dialSheet(k);
    } else if (t.dataset.risk) {
      const r = riskOf(t.dataset.risk);
      if (r.id === s.risk) return;
      s.risk = r.id; s.ret = r.preset;
      if (retRuler) retRuler.set(r.preset, true);
      refreshPlanner("risk");
    } else if (t.dataset.name) {
      s.name = t.dataset.name;
      $("#goal-name", scr.planner).value = s.name;
      $$("[data-name]", scr.planner).forEach((c) => c.classList.toggle("on", c === t));
    }
  });

  /* ==========================================================
     RESULT
     ========================================================== */
  function smoothPath(pts) {
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  const CH = { W: 390, H: 220, px: 20, pt: 16, pb: 6 };
  function chartGeom(r) {
    const { W, H, px, pt, pb } = CH, M = r.months, ph = H - pt - pb;
    const maxV = Math.max(r.future, r.projected) * 1.12 || 1;
    const x = (m) => px + (m / M) * (W - 2 * px);
    const y = (v) => pt + ph * (1 - v / maxV);
    return { x, y, M };
  }

  function chartSVG(r) {
    const { W, H } = CH, { x, y, M } = chartGeom(r);
    const step = Math.max(1, Math.round(M / 60)), ms = [];
    for (let m = 0; m < M; m += step) ms.push(m);
    ms.push(M);
    const val = ms.map((m) => [x(m), y(r.valueAt(m))]);
    const inv = ms.map((m) => [x(m), y(r.investedAt(m))]);
    const line = smoothPath(val);
    const area = `${line} L${x(M)},${H} L${x(0)},${H} Z`;
    const gy = y(r.future);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Projected value grows to ${short(r.projected)} by ${monthYear(r.targetDate)}">
      <defs>
        <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D7FF9" stop-opacity=".22"/><stop offset="1" stop-color="#2D7FF9" stop-opacity="0"/></linearGradient>
      </defs>
      <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="#005DAC" stroke-opacity=".35" stroke-dasharray="2 5" stroke-linecap="round"/>
      <text x="${CH.px}" y="${gy - 8}" font-size="11" font-weight="600" fill="#005DAC">Goal · ${short(r.future)}</text>
      <path class="fade" d="${area}" fill="url(#ar)"/>
      <path class="fade" d="${smoothPath(inv)}" fill="none" stroke="#868D9A" stroke-width="1.5" stroke-dasharray="4 5" stroke-linecap="round"/>
      <path class="draw" d="${line}" pathLength="1" fill="none" stroke="#0B0D12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="scrub">
        <line id="sc-l" x1="0" x2="0" y1="0" y2="${H}" stroke="#0B0D12" stroke-opacity=".15"/>
        <circle id="sc-i" r="4" fill="#fff" stroke="#868D9A" stroke-width="2"/>
        <circle id="sc-d" r="6" fill="#0B0D12" stroke="#fff" stroke-width="2.5"/>
      </g>
    </svg>`;
  }

  function renderResult() {
    const s = current, g = GOALS[s.goalId], r = calc(s), rk = riskOf(s.risk);
    const isSaved = !!(s.savedId && saved.some((p) => p.id === s.savedId));
    const base = r.projected || 1;
    const parts = [
      s.existing ? { l: "Existing investment", v: s.existing, c: "#9CC5FF" } : null,
      { l: "Your SIPs", v: r.totalSip, c: "#005DAC" },
      { l: "Estimated returns", v: r.returns, c: "#12A26A" },
    ].filter(Boolean);
    const gainPct = r.totalInvested > 0 ? Math.round((r.returns / r.totalInvested) * 100) : 0;
    const y0 = new Date().getFullYear();

    scr.result.innerHTML = `
      <header class="nav" data-sticky>
        <button class="round" data-act="back" aria-label="Back">${icon("back")}</button>
        <span class="title">Your plan</span>
        <button class="round" data-act="edit" aria-label="Edit inputs">${icon("edit")}</button>
      </header>
      <section class="r-hero ${g.theme}">
        <span class="orb a"></span><span class="orb b"></span>
        <div class="kick"><i></i>${esc(goalName(s))}</div>
        <div class="label">${r.covered ? "No SIP needed" : "Invest every month"}</div>
        <div class="mega"><span class="cur">₹</span><span id="mega"></span><span class="per">/mo</span></div>
        <p class="sub">${r.covered
          ? `Your existing <b>${short(s.existing)}</b> could grow to <b>${short(r.existingFV)}</b>, enough to cover <b>${short(r.future)}</b> by ${monthYear(r.targetDate)}.`
          : `for <b>${yrs(s.years)}</b> to reach <b>${short(r.future)}</b> by <b>${monthYear(r.targetDate)}</b>.`}</p>
        <span class="status">${icon("check")}${r.covered ? "Covered by existing investment" : "Plan covers 100% of your goal"}</span>
      </section>

      <section class="chart">
        <div class="readout" aria-live="polite">
          <div><div class="when" id="ro-when"></div><div class="val" id="ro-val"></div></div>
          <div class="inv" id="ro-inv"></div>
        </div>
        <div class="plot" id="plot">${chartSVG(r)}</div>
        <div class="axis"><span>${y0}</span><span>${y0 + Math.round(s.years / 2)}</span><span>${y0 + s.years}</span></div>
        <div class="legend"><span><i style="background:var(--ink)"></i>Projected value</span><span><i class="dash"></i>Amount invested</span></div>
      </section>

      <section class="sec">
        <div class="tiles">
          <div class="tile dark"><span>Monthly SIP required</span><b>${inr(r.sip)}</b><small>${r.months} instalments</small></div>
          <div class="tile"><span>Goal at target date</span><b>${short(r.future)}</b><small>${short(s.target)} today, ${s.inflation}% inflation</small></div>
          <div class="tile"><span>Total SIP invested</span><b>${short(r.totalSip)}</b><small>over ${yrs(s.years)}</small></div>
          <div class="tile pos"><span>Est. returns</span><b>+${short(r.returns)}</b><small>${gainPct}% on amount invested</small></div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2 class="h2">Where it comes from</h2><span class="meta">${short(r.projected)}</span></div>
        <div class="mix">
          <div class="mix-bar" id="mix">${parts.map((p) => `<i style="background:${p.c}" data-g="${p.v / base}"></i>`).join("")}</div>
          <div class="mix-rows">${parts.map((p) => `<div><span class="d" style="background:${p.c}"></span><span class="l">${p.l}</span><span class="a">${short(p.v)}</span><span class="p">${Math.round((p.v / base) * 100)}%</span></div>`).join("")}</div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2 class="h2">Milestones</h2><span class="meta">Projected</span></div>
        <div class="track">
          <div class="rail-line"><i id="track-fill"></i></div>
          <div class="nodes">${r.milestones.map((m) => `
            <div class="node ${m.f === 1 ? "goal" : ""}"><span class="dot"></span>
              <div class="p">${m.f === 1 ? "Goal" : m.f * 100 + "%"}</div><b>${monthYear(m.date)}</b><small>${short(m.amount)}</small></div>`).join("")}</div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2 class="h2">Assumptions</h2></div>
        <div class="assume">
          <span class="chip"><em>Goal</em>${short(s.target)}</span>
          <span class="chip"><em>Tenure</em>${yrs(s.years)}</span>
          <span class="chip"><em>Return</em>${s.ret}% p.a.</span>
          <span class="chip"><em>Risk</em><span style="color:${rk.tone}">${rk.label}</span></span>
          <span class="chip"><em>Existing</em>${s.existing ? short(s.existing) : "None"}</span>
          <span class="chip"><em>Inflation</em>${s.inflation}%</span>
          <button class="chip" data-act="edit">Edit</button>
        </div>
      </section>

      <p class="fine">Illustrative projection based only on the values you entered. It assumes a constant return, SIPs at the start of each month and annual compounding on existing investments. Mutual fund investments are subject to market risks and returns are not guaranteed.</p>

      <div class="dock"><div class="dock-row">
        <button class="btn btn-soft ${isSaved ? "on" : ""}" data-act="save" aria-pressed="${isSaved}">${icon(isSaved ? "check" : "bookmark")}<span>${isSaved ? "Saved" : "Save"}</span></button>
        <button class="btn btn-brand grow" data-act="sip" ${r.covered ? "disabled" : ""}>Start SIP ${icon("arrow")}</button>
      </div></div>`;

    bindScrub(r);
  }

  function playResult() {
    const r = calc(current);
    odo($("#mega", scr.result), Math.round(r.sip).toLocaleString("en-IN"));
    setTimeout(() => {
      $$("#mix i", scr.result).forEach((i) => { i.style.flexGrow = i.dataset.g; });
      const f = $("#track-fill", scr.result); if (f) f.style.width = "100%";
    }, 60);
  }

  function bindScrub(r) {
    const plot = $("#plot", scr.result), svg = $("svg", plot), { x, y, M } = chartGeom(r);
    const l = $("#sc-l", svg), d = $("#sc-d", svg), di = $("#sc-i", svg);
    const when = $("#ro-when", scr.result), val = $("#ro-val", scr.result), inv = $("#ro-inv", scr.result);
    const at = (m) => {
      const v = r.valueAt(m), iv = r.investedAt(m), px = x(m);
      l.setAttribute("x1", px); l.setAttribute("x2", px);
      d.setAttribute("cx", px); d.setAttribute("cy", y(v));
      di.setAttribute("cx", px); di.setAttribute("cy", y(iv));
      when.textContent = m === M ? `At target · ${monthYear(r.targetDate)}` : `${monthYear(addMonths(m))} · year ${Math.floor(m / 12) + 1}`;
      val.textContent = short(v);
      inv.innerHTML = `Invested ${short(iv)}<br><b>+${short(Math.max(0, v - iv))} growth</b>`;
    };
    const fromEvent = (e) => {
      const b = svg.getBoundingClientRect();
      const fx = ((e.clientX - b.left) / b.width) * CH.W;
      return clamp(Math.round(((fx - CH.px) / (CH.W - 2 * CH.px)) * M), 0, M);
    };
    plot.addEventListener("pointermove", (e) => at(fromEvent(e)));
    plot.addEventListener("pointerdown", (e) => at(fromEvent(e)));
    const reset = () => at(M);
    plot.addEventListener("pointerleave", reset);
    plot.addEventListener("pointercancel", reset);
    plot.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") reset(); });
    reset();
  }

  function syncSaved() {
    const p = current && current.savedId && saved.find((x) => x.id === current.savedId);
    if (!p) return;
    const r = calc(current), { savedId, ...plain } = current;
    Object.assign(p, { state: plain, sip: r.sip, future: r.future, targetDate: r.targetDate.toISOString() });
    persist();
  }

  scr.result.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t || !current) return;
    const s = current, act = t.dataset.act;
    if (act === "back") history.back();
    else if (act === "edit") {
      if (history.state && history.state.from === "planner") history.back();
      else go("planner");
    } else if (act === "save") {
      if (s.savedId && saved.some((p) => p.id === s.savedId)) {
        saved = saved.filter((p) => p.id !== s.savedId); s.savedId = null;
        toast("Removed from your goals");
      } else {
        const r = calc(s), id = "g" + Date.now().toString(36), { savedId, ...plain } = s;
        saved.unshift({ id, state: plain, sip: r.sip, future: r.future, targetDate: r.targetDate.toISOString() });
        s.savedId = id;
        toast(`Saved “${goalName(s)}” to your goals`);
      }
      persist();
      const on = !!s.savedId;
      t.classList.toggle("on", on); t.setAttribute("aria-pressed", on);
      t.innerHTML = `${icon(on ? "check" : "bookmark")}<span>${on ? "Saved" : "Save"}</span>`;
    } else if (act === "sip") {
      toast(`Demo: this would set up a ${inr(calc(s).sip)}/month SIP. Payments aren't connected in this prototype.`);
    }
  });

  /* ---------------- boot ---------------- */
  show("home");
})();
