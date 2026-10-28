/* ==========================================================
   Goal planner — web
   config → calc engine → components (odometer, ruler, popover, chart)
   → sections (banner, plan, result, milestones, funds, checkout)
   ========================================================== */
(() => {
  "use strict";

  /* ---------------- config ---------------- */
  const GOALS = {
    crore: {
      title: "Build your 1st crore", tag: "Milestone", theme: "th-ink",
      num: "₹1<small>Cr</small>",
      head: 'Let\'s build your <span class="serif">first crore.</span>',
      sub: "Create long-term wealth with one disciplined monthly SIP.",
      defaults: { target: 1e7, ret: 12, years: 15, existing: 0, inflation: 6 },
      chips: [5e6, 1e7, 2e7, 5e7],
    },
    home: {
      title: "Buy your dream home", tag: "Home", theme: "th-sky",
      num: "₹75<small>L</small>",
      head: 'Let\'s plan your <span class="serif">dream home.</span>',
      sub: "Save for the down payment, or the whole home.",
      defaults: { target: 7.5e6, ret: 12, years: 10, existing: 5e5, inflation: 6 },
      chips: [2.5e6, 5e6, 7.5e6, 1.5e7],
    },
    car: {
      title: "Buy your dream car", tag: "Car", theme: "th-navy",
      num: "₹15<small>L</small>",
      head: 'Let\'s get your <span class="serif">dream car.</span>',
      sub: "Drive it home with a smaller loan, or none at all.",
      defaults: { target: 1.5e6, ret: 10, years: 5, existing: 2e5, inflation: 6 },
      chips: [8e5, 1.5e6, 2.5e6, 5e6],
    },
    custom: {
      title: "Customise your goal", tag: "Your rules", theme: "th-mist",
      num: '<span class="serif">Anything.</span>',
      head: 'Shape a goal <span class="serif">your way.</span>',
      sub: "Education, a wedding, a sabbatical. You set the numbers.",
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
  const LIMITS = { target: [1e4, 1e9], existing: [0, 1e9] };

  /* Sample fund data for the prototype. fit = which risk level the fund suits. */
  const RISK_TIERS = ["Low", "Moderate", "High", "Very high"];
  const FUNDS = [
    { id: "axmc", name: "Axis Multicap Fund (G)", amc: "Axis Mutual Fund", mono: "AX", c: "#97144D", cat: "Multi Cap", group: "Equity", r3: 18.4, risk: 3, fit: "high", min: 100 },
    { id: "nifc", name: "Nippon India Flexi Cap Fund (G)", amc: "Nippon India Mutual Fund", mono: "NI", c: "#E2231A", cat: "Flexi Cap", group: "Equity", r3: 17.9, risk: 3, fit: "medium", min: 100 },
    { id: "icval", name: "ICICI Pru Value Fund (G)", amc: "ICICI Prudential Mutual Fund", mono: "IC", c: "#B4232A", cat: "Value", group: "Equity", r3: 19.6, risk: 3, fit: "medium", min: 100 },
    { id: "sbict", name: "SBI Contra Fund – Regular (G)", amc: "SBI Mutual Fund", mono: "SBI", c: "#1D8FD1", cat: "Contra", group: "Equity", r3: 21.2, risk: 4, fit: "high", min: 500 },
    { id: "axsil", name: "Axis Silver Fund of Fund – Regular (G)", amc: "Axis Mutual Fund", mono: "AX", c: "#97144D", cat: "FoF · Silver", group: "Commodity", r3: 16.8, risk: 4, fit: "high", min: 100 },
    { id: "ppfc", name: "Parag Parikh Flexi Cap Fund (G)", amc: "PPFAS Mutual Fund", mono: "PP", c: "#2B5F75", cat: "Flexi Cap", group: "Equity", r3: 17.2, risk: 3, fit: "medium", min: 1000 },
    { id: "hdbaf", name: "HDFC Balanced Advantage Fund (G)", amc: "HDFC Mutual Fund", mono: "HD", c: "#004C8F", cat: "Balanced Advantage", group: "Hybrid", r3: 15.1, risk: 2, fit: "medium", min: 100 },
    { id: "kteh", name: "Kotak Equity Hybrid Fund (G)", amc: "Kotak Mahindra Mutual Fund", mono: "KO", c: "#D7262E", cat: "Aggressive Hybrid", group: "Hybrid", r3: 14.3, risk: 2, fit: "low", min: 100 },
    { id: "utin50", name: "UTI Nifty 50 Index Fund (G)", amc: "UTI Mutual Fund", mono: "UTI", c: "#1F4E9C", cat: "Index · Large Cap", group: "Index", r3: 13.2, risk: 2, fit: "low", min: 500 },
    { id: "iccb", name: "ICICI Pru Corporate Bond Fund (G)", amc: "ICICI Prudential Mutual Fund", mono: "IC", c: "#B4232A", cat: "Corporate Bond", group: "Debt", r3: 7.4, risk: 1, fit: "low", min: 100 },
    { id: "sbies", name: "SBI Equity Savings Fund (G)", amc: "SBI Mutual Fund", mono: "SBI", c: "#1D8FD1", cat: "Equity Savings", group: "Hybrid", r3: 9.8, risk: 1, fit: "low", min: 500 },
    { id: "nisc", name: "Nippon India Small Cap Fund (G)", amc: "Nippon India Mutual Fund", mono: "NI", c: "#E2231A", cat: "Small Cap", group: "Equity", r3: 24.1, risk: 4, fit: "high", min: 100 },
    { id: "momc", name: "Motilal Oswal Midcap Fund (G)", amc: "Motilal Oswal Mutual Fund", mono: "MO", c: "#C98A00", cat: "Mid Cap", group: "Equity", r3: 26.3, risk: 4, fit: "high", min: 500 },
    { id: "axbc", name: "Axis Bluechip Fund (G)", amc: "Axis Mutual Fund", mono: "AX", c: "#97144D", cat: "Large Cap", group: "Equity", r3: 12.6, risk: 3, fit: "medium", min: 100 },
  ];
  const GROUPS = ["All", "Equity", "Hybrid", "Index", "Debt", "Commodity"];
  const MAX_PICKS = 5;
  const PALETTE = ["#005DAC", "#2D7FF9", "#12A26A", "#D98E1F", "#7A6CFF"];
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
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M7 10l5 5 5-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
    sortD: '<path d="M8 4v16M8 20l-4-4M8 20l4-4M16 4h4M16 9h3M16 14h2"/>',
    sortU: '<path d="M8 20V4M8 4L4 8M8 4l4 4M16 20h4M16 15h3M16 10h2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    split: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  };
  const icon = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  /* abstract thin-line geometry for the banner */
  function geo(id) {
    let g = "";
    if (id === "crore") {
      for (let r = 40; r <= 260; r += 34) g += `<circle cx="760" cy="40" r="${r}" fill="none" stroke="rgba(255,255,255,.07)"/>`;
      g += `<g class="spin"><circle cx="880" cy="40" r="5" fill="#F2B04A"/><circle cx="760" cy="-60" r="3" fill="#fff" opacity=".7"/></g>`;
    } else if (id === "home") {
      for (let k = 0; k < 8; k++) g += `<polyline points="560,${190 - k * 22} 700,${60 - k * 22} 840,${190 - k * 22}" fill="none" stroke="rgba(11,13,18,${0.09 - k * 0.01})" stroke-width="1.2"/>`;
    } else if (id === "car") {
      for (let k = 0; k < 14; k++) {
        const y = 20 + k * 16, x1 = 420 + ((k * 61) % 220);
        g += `<line x1="${x1}" y1="${y}" x2="1000" y2="${y}" stroke="rgba(255,255,255,${k === 6 ? 0.42 : 0.08})" stroke-width="${k === 6 ? 1.6 : 1}" stroke-linecap="round"/>`;
      }
    } else {
      for (let x = 560; x <= 1000; x += 18) for (let y = 10; y <= 260; y += 18) g += `<circle cx="${x}" cy="${y}" r="1.2" fill="rgba(11,13,18,.1)"/>`;
      g += `<circle cx="760" cy="80" r="70" fill="none" stroke="#7A6CFF" stroke-opacity=".45" stroke-dasharray="3 6"/>`;
    }
    return `<svg class="geo" viewBox="0 0 1000 300" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">${g}</svg>`;
  }

  /* ---------------- state ---------------- */
  function newState(goalId) {
    const d = GOALS[goalId].defaults;
    return { goalId, name: "", ...d, risk: riskFromReturn(d.ret) };
  }
  let s = newState("crore");
  let picks = []; // [{ id, pct }]
  let tab = "suggested", group = "All", sortKey = "r3", sortDir = -1;
  const agree = [false, false];

  const goalName = (st) => (st.goalId === "custom" ? st.name.trim() || "My custom goal" : GOALS[st.goalId].title);
  function fieldError(field, v) {
    const [lo, hi] = LIMITS[field];
    if (field === "target") {
      if (!v || v < lo) return "Enter a goal value of at least ₹10,000";
      if (v > hi) return "Goal value can be up to ₹100 Cr";
      return "";
    }
    return v < lo || v > hi ? "Enter an existing investment between ₹0 and ₹100 Cr" : "";
  }
  const planError = () => fieldError("target", s.target) || fieldError("existing", s.existing);
  const fundOf = (id) => FUNDS.find((f) => f.id === id);
  const sipAmount = () => { const r = calc(s); return planError() || r.covered ? 0 : Math.ceil(r.sip); };

  /* ---------------- dom helpers ---------------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const el = { banner: $("#banner"), plan: $("#plan"), miles: $("#miles"), result: $("#result"), funds: $("#funds"), checkout: $("#checkout") };

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------------- odometer ---------------- */
  const isDigit = (c) => c >= "0" && c <= "9";
  function odo(node, text) {
    if (node._t === text) return;
    const chars = [...text];
    const prev = node._t ? [...node._t] : null;
    const rebuild = !prev || prev.length !== chars.length || chars.some((c, i) => isDigit(c) !== isDigit(prev[i]));
    if (rebuild) {
      node.innerHTML = `<span class="sr">${text}</span><span class="odo" aria-hidden="true">${chars.map((c) => isDigit(c)
        ? `<span class="od"><span class="od-s">${"0123456789".split("").map((d) => `<span>${d}</span>`).join("")}</span></span>`
        : `<span class="od-c">${c}</span>`).join("")}</span>`;
      void node.offsetWidth;
    } else {
      $(".sr", node).textContent = text;
    }
    const cells = $(".odo", node).children;
    chars.forEach((c, i) => { if (isDigit(c)) cells[i].firstChild.style.transform = `translateY(-${c * 10}%)`; });
    node._t = text;
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
    const rl = $(".ruler", host), sc = $(".ruler-scroll", host);
    let cur = value, lock = false, lockT, raf;
    const idx = (v) => Math.round((v - cfg.min) / cfg.step);
    const valAt = (k) => +(cfg.min + clamp(k, 0, n) * cfg.step).toFixed(2);

    function set(v, smooth) {
      cur = v; lock = true; clearTimeout(lockT);
      sc.scrollTo({ left: idx(v) * 10, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
      lockT = setTimeout(() => { lock = false; }, smooth ? 600 : 80);
      rl.setAttribute("aria-valuenow", v);
    }
    const emit = (v) => { if (v === cur) return; cur = v; rl.setAttribute("aria-valuenow", v); onChange(v); };

    sc.addEventListener("scroll", () => {
      if (lock) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => emit(valAt(Math.round(sc.scrollLeft / 10))));
    }, { passive: true });
    sc.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); lock = false; sc.scrollLeft += e.deltaY * 0.5; }
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

    rl.addEventListener("keydown", (e) => {
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

  /* ---------------- popover (desktop replacement for bottom sheets) ---------------- */
  let pop = null;
  function openPop(anchor, html, mount, width) {
    closePop(false);
    const p = document.createElement("div");
    p.className = "pop";
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-modal", "false");
    if (width) p.style.width = width + "px";
    p.innerHTML = `<span class="pop-arrow"></span>${html}`;
    document.body.appendChild(p);
    const place = () => {
      const a = anchor.getBoundingClientRect(), w = p.offsetWidth, vw = document.documentElement.clientWidth;
      const left = clamp(a.left + a.width / 2 - w / 2, 16, vw - w - 16) + scrollX;
      p.style.left = left + "px";
      p.style.top = a.bottom + scrollY + 12 + "px";
      p.style.setProperty("--ax", clamp(a.left + a.width / 2 + scrollX - left, 24, w - 24) + "px");
    };
    place();
    anchor.classList.add("open");
    anchor.setAttribute("aria-expanded", "true");
    const cleanup = mount ? mount(p) : null;
    const outside = (e) => { if (!p.contains(e.target) && !anchor.contains(e.target)) closePop(false); };
    const t = setTimeout(() => document.addEventListener("pointerdown", outside), 0);
    window.addEventListener("resize", place);
    requestAnimationFrame(() => p.classList.add("show"));
    p.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closePop(true); });
    pop = {
      el: p, anchor, place,
      close() {
        clearTimeout(t);
        if (cleanup) cleanup();
        document.removeEventListener("pointerdown", outside);
        window.removeEventListener("resize", place);
        anchor.classList.remove("open");
        anchor.setAttribute("aria-expanded", "false");
        p.remove();
      },
    };
    const f = $("[data-autofocus]", p);
    if (f) f.focus({ preventScroll: true });
  }
  function closePop(refocus) {
    if (!pop) return;
    const cur = pop; pop = null; cur.close();
    if (refocus) cur.anchor.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(true); });
  const popHead = (title) => `<div class="pop-head"><h2>${title}</h2><button class="round" data-close aria-label="Close">${icon("close")}</button></div>`;

  function amountPop(anchor, field) {
    const g = GOALS[s.goalId], isTarget = field === "target";
    const chips = isTarget ? g.chips : [0, 1e5, 5e5, 1e6, 2.5e6];
    openPop(anchor, `
      ${popHead(isTarget ? "Targeted goal value" : "Existing investment")}
      <label class="amt-field" id="amt-f"><span>₹</span><input id="amt-in" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="${isTarget ? "Targeted goal value" : "Existing investment"} in rupees" data-autofocus /></label>
      <div class="amt-words" id="amt-w"></div>
      <div class="suggest">${chips.map((v) => `<button class="chip" data-v="${v}">${v ? short(v) : "None"}</button>`).join("")}</div>
      <p class="pop-note">${isTarget ? "Enter the cost <b>in today's money</b>. We'll adjust it for inflation." : "Money already set aside for this goal. It keeps growing at your expected return."}</p>
      <button class="btn btn-ink wide" data-close>Done</button>`,
    (root) => {
      const inp = $("#amt-in", root), w = $("#amt-w", root), f = $("#amt-f", root);
      const paint = (v) => {
        inp.value = v ? v.toLocaleString("en-IN") : "";
        const err = fieldError(field, v);
        w.textContent = err || words(v) || (isTarget ? "Type an amount" : "Nothing yet? That's fine.");
        w.classList.toggle("err", !!err);
        f.classList.toggle("err", !!err);
        $$("[data-v]", root).forEach((c) => c.classList.toggle("on", +c.dataset.v === v));
        s[field] = v;
        refresh();
      };
      inp.addEventListener("input", () => {
        const digits = inp.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
        paint(digits ? Number(digits) : 0);
        inp.setSelectionRange(inp.value.length, inp.value.length);
      });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); closePop(true); } });
      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-v]");
        if (b) { paint(+b.dataset.v); inp.focus(); }
      });
      paint(s[field]);
      setTimeout(() => inp.select(), 0);
      return null;
    });
  }

  function dialPop(anchor, key) {
    const cfg = DIALS[key];
    openPop(anchor, `
      ${popHead(cfg.label)}
      <div class="dial-val"><span id="dv"></span><small id="du"></small></div>
      <div id="dial-host"></div>
      <div class="steppers">
        <button class="round" data-d="-1" aria-label="Decrease">${icon("minus")}</button>
        <span>Drag, scroll or use ← →</span>
        <button class="round" data-d="1" aria-label="Increase">${icon("plus")}</button>
      </div>
      <p class="pop-note" id="dial-note"></p>
      <button class="btn btn-ink wide" data-close>Done</button>`,
    (root) => {
      const note = () => {
        const r = calc(s);
        if (key === "years") return `Your target date becomes <b>${monthYear(r.targetDate)}</b>, which is ${r.months} monthly SIPs.`;
        if (key === "inflation") return `${short(s.target)} today will cost about <b>${short(r.future)}</b> in ${r.targetDate.getFullYear()}.`;
        const rk = riskOf(s.risk);
        return `That's <b style="color:${rk.tone}">${rk.label} risk</b>. Risk level updates automatically with your return.`;
      };
      const paint = () => {
        if (!$("#dv", root)) return;
        $("#dv", root).textContent = s[key];
        $("#du", root).textContent = cfg.unit(s[key]);
        $("#dial-note", root).innerHTML = note();
      };
      const r = ruler($("#dial-host", root), key, s[key], (v) => {
        const before = s.risk;
        s[key] = v;
        if (key === "ret") { s.risk = riskFromReturn(v); if (retRuler) retRuler.set(v, false); }
        paint();
        refresh(key === "ret" ? (s.risk !== before ? "risk" : "ret") : null);
      });
      root.addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (b) r.step(+b.dataset.d); });
      paint();
      $(".ruler", root).focus({ preventScroll: true });
      return null;
    });
  }

  function howPop(anchor) {
    openPop(anchor, `
      ${popHead("How it works")}
      <ol class="steps">
        <li><span class="n">01</span><div><b>Pick a goal</b><span>First crore, home, car or one of your own.</span></div></li>
        <li><span class="n">02</span><div><b>Fill in your sentence</b><span>Click any blue value to change it. Your plan updates as you go.</span></div></li>
        <li><span class="n">03</span><div><b>Choose funds and invest</b><span>Pick up to 5 funds, split your SIP and start in one step.</span></div></li>
      </ol>`, null, 340);
  }

  /* ==========================================================
     BANNER
     ========================================================== */
  function renderBanner() {
    const g = GOALS[s.goalId];
    el.banner.className = `banner mesh ${g.theme}`;
    el.banner.innerHTML = `${geo(s.goalId)}
      <div class="b-top">
        <div class="crumb">
          <button class="round glass" data-act="back" aria-label="Back to Mutual Funds">${icon("back")}</button>
          <span>Mutual Funds</span><i>/</i><b>Goal planner</b>
        </div>
        <div class="b-acts">
          <button class="pill glass" data-act="reset">${icon("reset")}Reset</button>
          <button class="pill glass" data-act="how" aria-haspopup="dialog">${icon("info")}How it works</button>
        </div>
      </div>
      <div class="b-body">
        <div class="b-copy"><h1>${g.head}</h1><p>${g.sub}</p></div>
        <div class="gswitch" role="tablist" aria-label="Goal">
          ${ORDER.map((id) => {
            const x = GOALS[id];
            return `<button class="glass" role="tab" aria-selected="${id === s.goalId}" data-goal="${id}">
              <span class="gs-tag">${x.tag}</span><span class="gs-num">${x.num}</span><span class="gs-name">${x.title}</span></button>`;
          }).join("")}
        </div>
      </div>`;
  }

  el.banner.addEventListener("click", (e) => {
    const t = e.target.closest("[data-goal],[data-act]");
    if (!t) return;
    if (t.dataset.goal) {
      if (t.dataset.goal === s.goalId) return;
      s = newState(t.dataset.goal);
      renderAll(true);
    } else if (t.dataset.act === "reset") {
      s = { ...newState(s.goalId), name: s.name };
      renderAll(false);
      toast("Reset to suggested values");
    } else if (t.dataset.act === "how") {
      if (pop && pop.anchor === t) closePop(true); else howPop(t);
    } else if (t.dataset.act === "back") {
      toast("Demo: this would go back to Mutual Funds.");
    }
  });

  /* ==========================================================
     PLAN
     ========================================================== */
  let retRuler = null;
  const tok = (key) => `<button class="tok" data-tok="${key}" aria-haspopup="dialog" aria-expanded="false"><span data-tv="${key}"></span>${icon("chev")}</button>`;

  function renderPlan() {
    const g = GOALS[s.goalId], ri = RISK.findIndex((r) => r.id === s.risk);
    el.plan.innerHTML = `
      <div class="c-head">
        <div><h2>Your plan</h2><p>Click any blue value to change it.</p></div>
        <span class="live-dot"><i></i>Updates live</span>
      </div>
      ${s.goalId === "custom" ? `
        <div class="name-row">
          <input class="name-input" id="goal-name" maxlength="40" placeholder="Name your goal" value="${esc(s.name)}" autocomplete="off" aria-label="Goal name" />
          <div class="suggest">${g.names.map((n) => `<button class="chip${n === s.name ? " on" : ""}" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div>
        </div>` : ""}
      <p class="sentence">
        I want ${tok("target")} in <span class="nw">${tok("years")}.</span> I've already invested <span class="nw">${tok("existing")}.</span>
        I'm comfortable with ${tok("risk")} risk, expecting ${tok("ret")} a year, with inflation at <span class="nw">${tok("inflation")}.</span>
      </p>
      <p class="plan-err" id="plan-err" role="alert"></p>

      <div class="block" id="risk-block">
        <div class="block-head"><h3>Risk &amp; return</h3><span class="linked" id="linked">${icon("link")}Linked</span></div>
        <div class="rr">
          <div>
            <div class="seg" id="seg" role="radiogroup" aria-label="Risk level" style="--i:${ri};--tone:${RISK[ri].tone}">
              ${RISK.map((r) => `<button role="radio" data-risk="${r.id}" aria-checked="${r.id === s.risk}">${r.label}</button>`).join("")}
            </div>
            <div class="seg-desc">${RISK.map((r) => `<span>${r.range}</span>`).join("")}</div>
          </div>
          <div class="rr-val">
            <div class="dial-val"><span id="ret-v"></span><small>%</small></div>
            <div class="dial-cap">Expected annual return</div>
          </div>
        </div>
        <div id="ret-host"></div>
      </div>`;

    retRuler = ruler($("#ret-host", el.plan), "ret", s.ret, (v) => {
      const before = s.risk;
      s.ret = v; s.risk = riskFromReturn(v);
      refresh(s.risk !== before ? "risk" : null);
    });
    const nameEl = $("#goal-name", el.plan);
    if (nameEl) nameEl.addEventListener("input", () => {
      s.name = nameEl.value;
      $$("[data-name]", el.plan).forEach((c) => c.classList.toggle("on", c.dataset.name === s.name));
    });
  }

  function flash(node) { if (!node) return; node.classList.remove("flash"); void node.offsetWidth; node.classList.add("flash"); }
  function pulseLinked() {
    const l = $("#linked", el.plan);
    if (!l) return;
    l.classList.add("on"); clearTimeout(l._t); l._t = setTimeout(() => l.classList.remove("on"), 900);
  }

  function refreshPlan(changed) {
    const p = el.plan, rk = riskOf(s.risk);
    const tv = (k, v) => { const n = $(`[data-tv="${k}"]`, p); if (n) n.textContent = v; };
    tv("target", s.target ? short(s.target) : "₹0");
    tv("years", yrs(s.years));
    tv("existing", s.existing ? short(s.existing) : "₹0");
    tv("risk", rk.label.toLowerCase());
    tv("ret", s.ret + "%");
    tv("inflation", s.inflation + "%");
    $('[data-tok="target"]', p).classList.toggle("err", !!fieldError("target", s.target));
    $('[data-tok="existing"]', p).classList.toggle("err", !!fieldError("existing", s.existing));
    const rt = $('[data-tok="risk"]', p);
    rt.classList.add("tone"); rt.style.setProperty("--tone", rk.tone);
    const err = planError();
    $("#plan-err", p).innerHTML = err ? `${icon("alert")}${err}` : "";

    const seg = $("#seg", p), ri = RISK.indexOf(rk);
    seg.style.setProperty("--i", ri); seg.style.setProperty("--tone", rk.tone);
    $$("[data-risk]", seg).forEach((b) => b.setAttribute("aria-checked", b.dataset.risk === s.risk));
    $("#ret-v", p).textContent = s.ret;

    if (changed === "risk") { pulseLinked(); flash(rt); flash($('[data-tok="ret"]', p)); }
  }

  el.plan.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.tok) {
      const k = t.dataset.tok;
      if (pop && pop.anchor === t) { closePop(true); return; }
      if (k === "target" || k === "existing") amountPop(t, k);
      else if (k === "risk") {
        closePop(false);
        const b = $("#risk-block", el.plan);
        b.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        b.classList.remove("focus"); void b.offsetWidth; b.classList.add("focus");
      } else dialPop(t, k);
    } else if (t.dataset.risk) {
      const r = riskOf(t.dataset.risk);
      if (r.id === s.risk) return;
      s.risk = r.id; s.ret = r.preset;
      if (retRuler) retRuler.set(r.preset, true);
      refresh("risk");
    } else if (t.dataset.name) {
      s.name = t.dataset.name;
      $("#goal-name", el.plan).value = s.name;
      $$("[data-name]", el.plan).forEach((c) => c.classList.toggle("on", c === t));
    }
  });

  /* ==========================================================
     RESULT + CHART
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

  const CH = { W: 480, H: 200, px: 24, pt: 18, pb: 4 };
  function chartGeom(r) {
    const { W, H, px, pt, pb } = CH, M = r.months, ph = H - pt - pb;
    const maxV = Math.max(r.future, r.projected) * 1.12 || 1;
    return { x: (m) => px + (m / M) * (W - 2 * px), y: (v) => pt + ph * (1 - v / maxV), M };
  }
  function chartSVG(r) {
    const { W, H } = CH, { x, y, M } = chartGeom(r);
    const step = Math.max(1, Math.round(M / 60)), ms = [];
    for (let m = 0; m < M; m += step) ms.push(m);
    ms.push(M);
    const line = smoothPath(ms.map((m) => [x(m), y(r.valueAt(m))]));
    const area = `${line} L${x(M)},${H} L${x(0)},${H} Z`;
    const gy = y(r.future);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Projected value grows to ${short(r.projected)} by ${monthYear(r.targetDate)}">
      <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D7FF9" stop-opacity=".22"/><stop offset="1" stop-color="#2D7FF9" stop-opacity="0"/></linearGradient></defs>
      <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="#005DAC" stroke-opacity=".35" stroke-dasharray="2 5" stroke-linecap="round"/>
      <text x="${CH.px}" y="${gy - 8}" font-size="11" font-weight="600" fill="#005DAC">Goal · ${short(r.future)}</text>
      <path class="fade" d="${area}" fill="url(#ar)"/>
      <path class="fade" d="${smoothPath(ms.map((m) => [x(m), y(r.investedAt(m))]))}" fill="none" stroke="#868D9A" stroke-width="1.5" stroke-dasharray="4 5" stroke-linecap="round"/>
      <path class="draw" d="${line}" pathLength="1" fill="none" stroke="#0B0D12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line id="sc-l" x1="0" x2="0" y1="0" y2="${H}" stroke="#0B0D12" stroke-opacity=".15"/>
      <circle id="sc-i" r="4" fill="#fff" stroke="#868D9A" stroke-width="2"/>
      <circle id="sc-d" r="6" fill="#0B0D12" stroke="#fff" stroke-width="2.5"/>
    </svg>`;
  }

  function renderResult() {
    el.result.innerHTML = `
      <span class="orb a"></span>
      <div class="r-label"><span id="r-label">Monthly SIP required</span><span class="status" id="r-status"></span></div>
      <div class="mega"><span class="cur">₹</span><span id="mega"></span><span class="per">/mo</span></div>
      <p class="r-sub" id="r-sub"></p>
      <div class="chart">
        <div class="readout" aria-live="polite">
          <div><div class="when" id="ro-when"></div><div class="val" id="ro-val"></div></div>
          <div class="inv" id="ro-inv"></div>
        </div>
        <div class="plot" id="plot"></div>
        <div class="axis" id="axis"></div>
        <div class="legend"><span><i style="background:var(--ink)"></i>Projected value</span><span><i class="dash"></i>Amount invested</span></div>
      </div>
      <div class="tiles">
        <div class="tile"><span>Goal at target date</span><b id="t-future"></b><small id="t-future-s"></small></div>
        <div class="tile"><span>Total SIP invested</span><b id="t-sip"></b><small id="t-sip-s"></small></div>
        <div class="tile pos"><span>Estimated returns</span><b id="t-ret"></b><small id="t-ret-s"></small></div>
        <div class="tile"><span>Existing investment grows to</span><b id="t-ex"></b><small id="t-ex-s"></small></div>
      </div>
      <div class="mix"><div class="mix-bar" id="mix"></div><div class="mix-leg" id="mix-leg"></div></div>`;
    bindScrub();
  }

  let chartR = null;
  function refreshResult(animate) {
    const r = calc(s), err = planError(), R = el.result;
    $(".orb", R).style.background = getComputedStyle(el.banner).getPropertyValue("--orb") || "#2D7FF9";
    $("#r-label", R).textContent = r.covered && !err ? "No SIP needed" : "Monthly SIP required";
    const st = $("#r-status", R);
    st.className = "status" + (err ? " bad" : "");
    st.innerHTML = err ? `${icon("alert")}Check your inputs` : `${icon("check")}${r.covered ? "Covered by existing investment" : "Covers 100% of your goal"}`;
    odo($("#mega", R), err ? "0" : Math.round(r.sip).toLocaleString("en-IN"));
    $("#r-sub", R).innerHTML = err ? "Fix the highlighted value in your plan to see the numbers."
      : r.covered
        ? `Your existing <b>${short(s.existing)}</b> could grow to <b>${short(r.existingFV)}</b>, enough for <b>${short(r.future)}</b> by ${monthYear(r.targetDate)}.`
        : `for <b>${yrs(s.years)}</b> to reach <b>${short(r.future)}</b> by <b>${monthYear(r.targetDate)}</b>.`;

    const plot = $("#plot", R);
    plot.classList.toggle("anim", !!animate && !reduceMotion);
    plot.innerHTML = chartSVG(r);
    plot.style.opacity = err ? ".25" : "";
    chartR = err ? null : r;
    if (err) { $("#ro-when", R).textContent = "At target"; $("#ro-val", R).textContent = "–"; $("#ro-inv", R).innerHTML = ""; }
    else scrubAt(r.months);
    const y0 = new Date().getFullYear();
    $("#axis", R).innerHTML = `<span>${y0}</span><span>${y0 + Math.round(s.years / 2)}</span><span>${y0 + s.years}</span>`;

    const dash = (v) => (err ? "–" : v);
    const gainPct = r.totalInvested > 0 ? Math.round((r.returns / r.totalInvested) * 100) : 0;
    $("#t-future", R).textContent = dash(short(r.future));
    const sub = (v) => (err ? "" : v);
    $("#t-future-s", R).textContent = `${short(s.target)} today at ${s.inflation}% inflation`;
    $("#t-sip", R).textContent = dash(short(r.totalSip));
    $("#t-sip-s", R).textContent = `${r.months} monthly instalments`;
    $("#t-ret", R).textContent = dash("+" + short(r.returns));
    $("#t-ret-s", R).textContent = sub(`${gainPct}% on amount invested`);
    $("#t-ex", R).textContent = dash(s.existing ? short(r.existingFV) : "₹0");
    $("#t-ex-s", R).textContent = err ? "" : s.existing ? `Covers ${Math.round(r.coverPct)}% of your goal` : "Nothing invested yet";

    const base = r.projected || 1;
    const parts = [
      s.existing ? { l: "Existing", v: s.existing, c: "#9CC5FF" } : null,
      { l: "Your SIPs", v: r.totalSip, c: "#005DAC" },
      { l: "Returns", v: Math.max(0, r.returns), c: "#12A26A" },
    ].filter(Boolean);
    $("#mix", R).innerHTML = err ? "" : parts.map((p) => `<i style="background:${p.c};flex-grow:${p.v / base}"></i>`).join("");
    $("#mix-leg", R).innerHTML = err ? "" : parts.map((p) => `<span><i style="background:${p.c}"></i>${p.l} <b>${short(p.v)}</b> · ${Math.round((p.v / base) * 100)}%</span>`).join("");
  }

  function scrubAt(m) {
    const r = chartR, R = el.result, svg = $("#plot svg", R);
    if (!r || !svg) return;
    const { x, y, M } = chartGeom(r);
    const v = r.valueAt(m), iv = r.investedAt(m), px = x(m);
    const l = $("#sc-l", svg), d = $("#sc-d", svg), di = $("#sc-i", svg);
    l.setAttribute("x1", px); l.setAttribute("x2", px);
    d.setAttribute("cx", px); d.setAttribute("cy", y(v));
    di.setAttribute("cx", px); di.setAttribute("cy", y(iv));
    $("#ro-when", R).textContent = m === M ? `At target · ${monthYear(r.targetDate)}` : `${monthYear(addMonths(m))} · year ${Math.floor(m / 12) + 1}`;
    $("#ro-val", R).textContent = short(v);
    $("#ro-inv", R).innerHTML = `Invested ${short(iv)}<br><b>+${short(Math.max(0, v - iv))} growth</b>`;
  }
  function bindScrub() {
    const plot = $("#plot", el.result);
    const fromEvent = (e) => {
      const b = plot.getBoundingClientRect(), M = chartR.months;
      const fx = ((e.clientX - b.left) / b.width) * CH.W;
      return clamp(Math.round(((fx - CH.px) / (CH.W - 2 * CH.px)) * M), 0, M);
    };
    plot.addEventListener("pointermove", (e) => { if (chartR) scrubAt(fromEvent(e)); });
    plot.addEventListener("pointerleave", () => { if (chartR) scrubAt(chartR.months); });
  }

  /* ==========================================================
     MILESTONES
     ========================================================== */
  function refreshMiles(animate) {
    const r = calc(s), err = planError();
    const head = `<div class="c-head"><div><h2>Milestones</h2><p>When your money crosses each quarter of the goal.</p></div></div>`;
    if (err || r.covered) {
      el.miles.innerHTML = head + `<p class="miles-empty">${err ? "Milestones appear once your plan is valid." : "Your existing investment already covers this goal."}</p>`;
      return;
    }
    el.miles.innerHTML = head + `
      <div class="track${animate && !reduceMotion ? " anim" : ""}">
        <div class="rail-line"><i></i></div>
        <div class="nodes">${r.milestones.map((m) => `
          <div class="node ${m.f === 1 ? "goal" : ""}"><span class="dot"></span>
            <div class="p">${m.f === 1 ? "Goal" : m.f * 100 + "%"}</div><b>${monthYear(m.date)}</b><small>${short(m.amount)}</small></div>`).join("")}</div>
      </div>`;
  }

  /* ==========================================================
     FUNDS
     ========================================================== */
  function spark(f) {
    let seed = [...f.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const n = 20, vol = 0.5 + f.risk * 0.55, pts = [];
    let v = 0;
    for (let k = 0; k <= n; k++) { pts.push(v); v += f.r3 / 20 + (rnd() - 0.45) * vol * 2.4; }
    const lo = Math.min(...pts), hi = Math.max(...pts);
    const path = pts.map((p, k) => `${k ? "L" : "M"}${(k / n * 62 + 1).toFixed(1)},${(20 - ((p - lo) / (hi - lo || 1)) * 18).toFixed(1)}`).join("");
    return `<svg viewBox="0 0 64 22" aria-hidden="true"><path d="${path}" fill="none" stroke="#12A26A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  const riskTone = (k) => ["#12A26A", "#7DB43C", "#D98E1F", "#E5484D"][k - 1];
  const riskMeter = (k) => `<span class="risk" style="--tone:${riskTone(k)}"><i>${[1, 2, 3, 4].map((j) => `<span class="${j <= k ? "on" : ""}"></span>`).join("")}</i>${RISK_TIERS[k - 1]}</span>`;

  function visibleFunds() {
    let list = FUNDS.slice();
    if (tab === "suggested") list = list.filter((f) => f.fit === s.risk);
    else if (group !== "All") list = list.filter((f) => f.group === group);
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * -sortDir;
      return (a[sortKey] - b[sortKey]) * sortDir;
    });
    return list;
  }

  function renderFunds() {
    const rk = riskOf(s.risk), sip = sipAmount(), list = visibleFunds();
    const full = picks.length >= MAX_PICKS;
    const sortBtn = (key, label) => `<button data-sort="${key}" class="${sortKey === key ? "on" : ""}">${label}${sortKey === key ? icon(sortDir < 0 ? "sortD" : "sortU") : ""}</button>`;
    el.funds.innerHTML = `
      <div class="c-head">
        <div><h2>Choose your mutual funds</h2><p>Pick up to ${MAX_PICKS} funds. ${sip ? `Your <b style="color:var(--ink)">${inr(sip)}</b> monthly SIP is split across them.` : "Your monthly SIP is split across them."}</p></div>
        <div class="counter"><span><b>${picks.length}</b> of ${MAX_PICKS} selected</span><span class="dots">${Array.from({ length: MAX_PICKS }, (_, k) => `<i class="${k < picks.length ? "on" : ""}"></i>`).join("")}</span></div>
      </div>
      <div class="f-bar">
        <div class="tabs" role="tablist" style="--i:${tab === "suggested" ? 0 : 1};--tone:${rk.tone}">
          <button role="tab" data-tab="suggested" aria-selected="${tab === "suggested"}">Suggested for <em>${rk.label.toLowerCase()} risk</em></button>
          <button role="tab" data-tab="all" aria-selected="${tab === "all"}">All funds · ${FUNDS.length}</button>
        </div>
        ${tab === "all" ? `<div class="cats">${GROUPS.map((x) => `<button class="chip${x === group ? " on" : ""}" data-group="${x}">${x}</button>`).join("")}</div>` : ""}
      </div>
      <div class="f-table" role="group" aria-label="Funds">
        <div class="f-row f-head">
          <span></span>${sortBtn("name", "Fund name")}<span>Category</span>${sortBtn("r3", "3Y returns (p.a.)")}${sortBtn("risk", "Risk")}<span class="f-min">${sortBtn("min", "Min SIP")}</span>
        </div>
        <div class="f-list">${list.length ? list.map((f) => {
          const on = picks.some((p) => p.id === f.id), dis = !on && full;
          return `<div class="f-row f-item${on ? " on" : ""}${dis ? " dis" : ""}" role="checkbox" aria-checked="${on}" aria-disabled="${dis}" tabindex="0" data-fund="${f.id}">
            <span class="cb">${icon("check")}</span>
            <span class="f-name"><span class="logo-c" style="--c:${f.c}">${f.mono}</span><span><b>${f.name}</b><small>${f.amc}${tab === "all" && f.fit === s.risk ? `<span class="fit">FITS YOUR RISK</span>` : ""}</small></span></span>
            <span class="f-cat">${f.cat}</span>
            <span class="f-ret">${spark(f)}<b>${f.r3.toFixed(1)}%</b></span>
            ${riskMeter(f.risk)}
            <span class="f-min">₹${f.min.toLocaleString("en-IN")}</span>
          </div>`;
        }).join("") : `<div class="f-empty">No funds in this category.</div>`}</div>
      </div>`;
  }

  function togglePick(id) {
    const i = picks.findIndex((p) => p.id === id);
    if (i >= 0) picks.splice(i, 1);
    else {
      if (picks.length >= MAX_PICKS) { toast(`You can pick up to ${MAX_PICKS} funds. Remove one to add another.`); return; }
      picks.push({ id, pct: 0 });
    }
    splitEvenly();
    renderFunds();
    renderCheckout();
  }
  function splitEvenly() {
    const n = picks.length;
    if (!n) return;
    const base = Math.floor(100 / n);
    picks.forEach((p, k) => { p.pct = base + (k < 100 - base * n ? 1 : 0); });
  }

  el.funds.addEventListener("click", (e) => {
    const t = e.target.closest("[data-fund],[data-tab],[data-group],[data-sort]");
    if (!t) return;
    if (t.dataset.fund) {
      if (t.classList.contains("dis")) { toast(`You can pick up to ${MAX_PICKS} funds. Remove one to add another.`); return; }
      togglePick(t.dataset.fund);
      const again = $(`[data-fund="${t.dataset.fund}"]`, el.funds);
      if (again) again.focus({ preventScroll: true });
    } else if (t.dataset.tab) { tab = t.dataset.tab; renderFunds(); }
    else if (t.dataset.group) { group = t.dataset.group; renderFunds(); }
    else if (t.dataset.sort) {
      const k = t.dataset.sort;
      if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = k === "name" || k === "min" ? 1 : -1; }
      renderFunds();
    }
  });
  el.funds.addEventListener("keydown", (e) => {
    const t = e.target.closest("[data-fund]");
    if (t && (e.key === " " || e.key === "Enter")) { e.preventDefault(); t.click(); }
  });

  /* ==========================================================
     ALLOCATION + INVEST
     ========================================================== */
  const colorOf = (k) => PALETTE[k % PALETTE.length];
  const amountFor = (p) => Math.round((sipAmount() * p.pct) / 100);

  function renderCheckout() {
    const sip = sipAmount();
    el.checkout.innerHTML = `
      <div class="c-head">
        <div><h2>Your allocation</h2><p>Drag or type to decide how your SIP is split.</p></div>
        ${picks.length > 1 ? `<button class="pill" data-act="even">${icon("split")}Split evenly</button>` : ""}
      </div>
      ${picks.length ? `
        <div class="a-bar" id="a-bar" aria-hidden="true">${picks.map((p, k) => `<i style="background:${colorOf(k)}"></i>`).join("")}</div>
        <div class="a-rows">${picks.map((p, k) => {
          const f = fundOf(p.id);
          return `<div class="a-row" data-row="${p.id}">
            <span class="d" style="background:${colorOf(k)}"></span>
            <span class="a-name"><b>${f.name}</b><small data-minmsg>${f.cat} · Min SIP ₹${f.min.toLocaleString("en-IN")}</small></span>
            <input class="range" type="range" min="0" max="100" step="1" value="${p.pct}" data-alloc="${p.id}" style="--c:${colorOf(k)}" aria-label="Allocation for ${esc(f.name)}" />
            <label class="pct"><input type="number" min="0" max="100" value="${p.pct}" data-pct="${p.id}" aria-label="Percent for ${esc(f.name)}" /><span>%</span></label>
            <span class="a-amt" data-amt><span></span><small>per month</small></span>
            <button class="x" data-unpick="${p.id}" aria-label="Remove ${esc(f.name)}">${icon("close")}</button>
          </div>`;
        }).join("")}</div>
        <div class="a-total" id="a-total"></div>` : `
        <div class="a-empty"><b>No funds selected yet</b>Pick up to ${MAX_PICKS} funds above${sip ? ` to invest your ${inr(sip)} monthly SIP` : ""}.</div>`}

      <div class="terms">
        <h3>Terms &amp; conditions</h3>
        <label class="check"><input type="checkbox" data-agree="0" ${agree[0] ? "checked" : ""} /><span>I have read and agree to the <a href="#" data-tc>Terms &amp; Conditions</a>.</span></label>
        <label class="check"><input type="checkbox" data-agree="1" ${agree[1] ? "checked" : ""} /><span>I understand that mutual fund investments are subject to market risks and I have read all scheme-related documents carefully.</span></label>
      </div>

      <div class="invest">
        <div class="inv-sum" id="inv-sum"></div>
        <button class="btn btn-brand" id="invest">${icon("lock")}<span></span></button>
      </div>
      <p class="fine">${icon("info")}<span>This illustration is based on the return and inflation you selected. It is not a promise, guarantee or forecast of actual returns. Fund details shown are sample data for this prototype. Mutual fund investments are subject to market risks; read all scheme-related documents carefully.</span></p>`;
    refreshCheckout();
  }

  function refreshCheckout() {
    const C = el.checkout, sip = sipAmount();
    const total = picks.reduce((a, p) => a + p.pct, 0);
    picks.forEach((p, k) => {
      const row = $(`[data-row="${p.id}"]`, C);
      if (!row) return;
      const f = fundOf(p.id), amt = amountFor(p), low = sip > 0 && p.pct > 0 && amt < f.min;
      $(".range", row).style.setProperty("--p", p.pct + "%");
      $("[data-amt] span", row).textContent = inr(amt);
      const msg = $("[data-minmsg]", row);
      msg.textContent = low ? `Needs at least ₹${f.min.toLocaleString("en-IN")}/mo` : `${f.cat} · Min SIP ₹${f.min.toLocaleString("en-IN")}`;
      msg.classList.toggle("err", low);
      const bar = $("#a-bar", C);
      if (bar) bar.children[k].style.flexBasis = `calc(${(p.pct / Math.max(100, total)) * 100}% - 3px)`;
    });
    const tEl = $("#a-total", C);
    if (tEl) {
      const left = 100 - total;
      tEl.innerHTML = `<span>Total <b>${total}%</b> · ${inr(picks.reduce((a, p) => a + amountFor(p), 0))}/mo</span>
        ${left === 0 ? `<span class="ok">${icon("check")}Fully allocated</span>` : `<span class="warn">${left > 0 ? `${left}% left to allocate` : `${-left}% over, reduce a fund`}</span>`}`;
    }

    // invest readiness
    const r = calc(s), err = planError();
    let need = "";
    if (err) need = "Fix your plan above to continue";
    else if (r.covered) need = "No SIP needed, your existing investment covers this goal";
    else if (!picks.length) need = "Select at least one fund";
    else if (total !== 100) need = total < 100 ? `Allocate the remaining ${100 - total}%` : `Reduce allocation by ${total - 100}%`;
    else if (picks.some((p) => amountFor(p) < fundOf(p.id).min)) {
      const f = fundOf(picks.find((p) => amountFor(p) < fundOf(p.id).min).id);
      need = `${f.name.replace(/ \(G\)$/, "")} needs at least ₹${f.min.toLocaleString("en-IN")}/mo`;
    } else if (picks.some((p) => p.pct === 0)) need = "Remove funds set to 0%";
    else if (!agree[0] || !agree[1]) need = "Accept both terms to continue";

    const next = new Date(); next.setMonth(next.getMonth() + 1, 5);
    $("#inv-sum", C).innerHTML = `<b>${sip ? `${inr(sip)} / month` : "₹0 / month"}${picks.length ? ` · ${picks.length} fund${picks.length > 1 ? "s" : ""}` : ""}</b>
      <span class="${need ? "need" : ""}">${need || `First instalment today, then on the 5th of every month from ${monthYear(next)}`}</span>`;
    const btn = $("#invest", C);
    btn.disabled = !!need;
    $("span", btn).textContent = `Invest ${inr(sip)} via Razorpay`;
  }

  el.checkout.addEventListener("input", (e) => {
    const t = e.target;
    const id = t.dataset.alloc || t.dataset.pct;
    if (!id) return;
    const p = picks.find((x) => x.id === id);
    if (!p) return;
    p.pct = clamp(Math.round(+t.value || 0), 0, 100);
    const row = t.closest(".a-row");
    if (t.dataset.alloc) $("[data-pct]", row).value = p.pct;
    else $("[data-alloc]", row).value = p.pct;
    refreshCheckout();
  });
  el.checkout.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.agree !== undefined) { agree[+t.dataset.agree] = t.checked; refreshCheckout(); }
    if (t.dataset.pct) { const p = picks.find((x) => x.id === t.dataset.pct); if (p) t.value = p.pct; }
  });
  el.checkout.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act],[data-unpick],[data-tc],#invest");
    if (!t) return;
    if (t.dataset.tc !== undefined) { e.preventDefault(); toast("Demo: this would open the Terms & Conditions."); }
    else if (t.dataset.act === "even") { splitEvenly(); renderCheckout(); }
    else if (t.dataset.unpick) togglePick(t.dataset.unpick);
    else if (t.id === "invest") toast(`Demo: this would open Razorpay for ${inr(sipAmount())} across ${picks.length} fund${picks.length > 1 ? "s" : ""}. Payments aren't connected in this prototype.`);
  });

  /* ==========================================================
     WATCHLIST (static, mirrors the live web app)
     ========================================================== */
  $("#wl").innerHTML = Array.from({ length: 10 }, () => `<li><small>Equity • Small Cap Fund</small><b>Nippon India Large Cap Fund<br>Direct Growth</b><em>10.5%</em></li>`).join("");

  /* ==========================================================
     orchestration
     ========================================================== */
  function refresh(changed) {
    refreshPlan(changed);
    refreshResult(false);
    refreshMiles(false);
    if (changed === "risk") renderFunds();
    else {
      const p = $(".c-head p", el.funds);
      if (p) {
        const sip = sipAmount();
        p.innerHTML = `Pick up to ${MAX_PICKS} funds. ${sip ? `Your <b style="color:var(--ink)">${inr(sip)}</b> monthly SIP is split across them.` : "Your monthly SIP is split across them."}`;
      }
    }
    if (el.checkout.innerHTML) refreshCheckout();
    if (pop) pop.place();
  }
  function renderAll(animate) {
    closePop(false);
    renderBanner();
    renderPlan();
    refreshPlan();
    refreshResult(animate);
    refreshMiles(animate);
    renderFunds();
    renderCheckout();
  }

  renderResult();
  renderAll(true);
})();
