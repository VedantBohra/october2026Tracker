const COLS = { day: "Day", date: "Date", open: "Started with", added: "Added today", close: "Ended with", status: "Status", progress: "Progress", plan: "Minimum-plan balance", note: "Note" };
const THEMES = ["ledger", "slate", "midnight", "plum", "ember"];
const LABEL = { stretch: "Stretch hit", hit: "Target hit", low: "Below minimum", today: "Today", missed: "Not logged", soon: "Upcoming" };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = n => (n < 0 ? "-" : "") + CONFIG.currency + Math.abs(Math.round(n)).toLocaleString(CONFIG.locale);
const key = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDate = (d, o) => d.toLocaleDateString("en-GB", o);
let dirty = false, lastBal = 0, rows = [];

// Builds every day; each day's "open" is the previous day's "close" (automatic).
function compute() {
  const C = CONFIG, map = new Map(DAYS.map(d => [d.date, d])), today = key(new Date());
  let bal = C.startBalance, i = 0; const out = [];
  for (let dt = parse(C.startDate); key(dt) <= C.endDate; dt.setDate(dt.getDate() + 1)) {
    const k = key(dt), e = map.get(k) || { date: k, added: null, note: "" };
    const has = e.added !== null && e.added !== undefined && e.added !== "" && !isNaN(e.added);
    const added = has ? +e.added : 0;
    const r = { i: ++i, k, dt: new Date(dt), e, has, added, open: bal, close: bal + added, plan: C.startBalance + C.minTarget * i, today: k === today, past: k < today };
    r.st = has ? (added >= C.stretchTarget ? "stretch" : added >= C.minTarget ? "hit" : "low") : r.today ? "today" : r.past ? "missed" : "soon";
    out.push(r); bal = r.close;
  }
  return out;
}

const CELL = {
  day: r => `<td class="dn">${r.i}</td>`,
  date: r => `<td><b>${fmtDate(r.dt, { day: "numeric", month: "short" })}</b> <span class="muted">${fmtDate(r.dt, { weekday: "short" })}</span></td>`,
  open: r => `<td class="money">${money(r.open)}</td>`,
  added: r => `<td><input class="amt" type="number" min="0" inputmode="numeric" placeholder="${CONFIG.minTarget}" value="${r.has ? r.added : ""}" data-k="${r.k}" data-f="added" aria-label="Added on ${r.k}"></td>`,
  close: r => `<td class="money strong">${money(r.close)}</td>`,
  status: r => `<td><span class="badge ${r.st}">${LABEL[r.st]}</span></td>`,
  progress: r => `<td><div class="bar"><i class="${r.st}" style="width:${Math.min(100, r.added / CONFIG.stretchTarget * 100)}%"></i><b style="left:${CONFIG.minTarget / CONFIG.stretchTarget * 100}%" title="Minimum target"></b></div></td>`,
  plan: r => `<td class="money muted">${money(r.plan)}</td>`,
  note: r => `<td><input class="note" type="text" placeholder="Add a note" value="${esc(r.e.note || "")}" data-k="${r.k}" data-f="note" aria-label="Note for ${r.k}"></td>`
};

function render() {
  rows = compute();
  const C = CONFIG, logged = rows.filter(r => r.has), done = rows.filter(r => r.has || r.past).length;
  const bal = logged.length ? logged[logged.length - 1].close : C.startBalance;
  const total = logged.reduce((s, r) => s + r.added, 0);
  const goal = C.startBalance + C.minTarget * rows.length, stretch = C.startBalance + C.stretchTarget * rows.length;
  const left = rows.filter(r => !r.has && !r.past).length;
  const delta = bal - (C.startBalance + C.minTarget * done);
  let streak = 0; for (let j = rows.map(r => r.has).lastIndexOf(true); j >= 0 && rows[j].has && rows[j].added >= C.minTarget; j--) streak++;

  countUp($("#balNow"), bal, lastBal); lastBal = bal;
  $("#balSub").textContent = `Started at ${money(C.startBalance)} · ${logged.length} of ${rows.length} days logged`;
  $("#stats").innerHTML = [
    ["Total added", money(total), `${money(logged.length ? total / logged.length : 0)} a day on average`, ""],
    ["Streak", streak + (streak === 1 ? " day" : " days"), `in a row at ${money(C.minTarget)} or more`, ""],
    ["Against plan", (delta >= 0 ? "+" : "") + money(delta), delta < 0 ? "behind the minimum plan" : "ahead of the minimum plan", delta < 0 ? "neg" : "pos"],
    ["Projected finish", money(bal + left * C.minTarget), "if every day left hits the minimum", ""]
  ].map(([a, b, c, k]) => `<div><dt>${a}</dt><dd class="${k}">${b}</dd><small>${c}</small></div>`).join("");

  $("#strip").innerHTML = rows.map((r, i) => `<i class="${r.st}${r.today ? " now" : ""}" style="--i:${i}" title="${fmtDate(r.dt, { day: "numeric", month: "short" })}: ${r.has ? money(r.added) : LABEL[r.st]}"></i>`).join("");
  const pct = Math.max(0, Math.min(100, (bal - C.startBalance) / (goal - C.startBalance) * 100));
  $("#goalBar").style.width = pct + "%";
  $("#goalTxt").textContent = `${pct.toFixed(0)}% of the way to ${money(goal)} (minimum plan). Stretch plan ends at ${money(stretch)}.`;

  const cols = C.columns.filter(c => COLS[c]); let html = "", prevM = "";
  $("#tbl thead").innerHTML = "<tr>" + cols.map(c => `<th>${COLS[c]}</th>`).join("") + "</tr>";
  rows.forEach(r => {
    const m = fmtDate(r.dt, { month: "long", year: "numeric" });
    if (m !== prevM) { html += `<tr class="month"><td colspan="${cols.length}">${m}</td></tr>`; prevM = m; }
    html += `<tr class="${r.today ? "today " : ""}${r.st}">` + cols.map(c => CELL[c](r)).join("") + "</tr>";
  });
  $("#tbl tbody").innerHTML = html;
  $("#copyBtn").classList.toggle("dirty", dirty);
}

function countUp(el, to, from) {
  const t0 = performance.now();
  (function f(t) { const p = Math.min(1, (t - t0) / 700); el.textContent = money(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
}

function setDay(k, f, v) {
  let e = DAYS.find(d => d.date === k);
  if (!e) { e = { date: k, added: null, note: "" }; DAYS.push(e); DAYS.sort((a, b) => a.date < b.date ? -1 : 1); }
  e[f] = v; dirty = true; render();
}

function dataText() {
  return "// DAILY NUMBERS. Set  added: 1350  for a day. null = not logged yet. Notes are optional.\nconst DAYS = [\n" +
    rows.map(r => `  { date: "${r.k}", added: ${r.has ? r.added : "null"}, note: ${JSON.stringify(r.e.note || "")} },`).join("\n") + "\n];\n";
}

function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); }

function look() {
  const s = document.documentElement.style;
  document.documentElement.dataset.theme = CONFIG.theme;
  CONFIG.accent ? s.setProperty("--accent", CONFIG.accent) : s.removeProperty("--accent");
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.theme === CONFIG.theme));
  $("#cfgOut").textContent = `theme: "${CONFIG.theme}",\naccent: "${CONFIG.accent}",\ncolumns: ${JSON.stringify(CONFIG.columns)}`;
}

// Events
$("#tbl").addEventListener("change", e => {
  const t = e.target; if (!t.dataset.k) return;
  setDay(t.dataset.k, t.dataset.f, t.dataset.f === "added" ? (t.value === "" ? null : Math.max(0, +t.value)) : t.value);
});
$("#tbl").addEventListener("keydown", e => { if (e.key === "Enter") e.target.blur(); });
$("#themes").onclick = e => { if (e.target.dataset.theme) { CONFIG.theme = e.target.dataset.theme; look(); } };
$("#accent").oninput = e => { CONFIG.accent = e.target.value; look(); };
$("#resetAccent").onclick = () => { CONFIG.accent = ""; look(); };
$("#colToggles").onchange = () => { CONFIG.columns = [...document.querySelectorAll("#colToggles input:checked")].map(i => i.value); look(); render(); };
$("#setBtn").onclick = () => $("#drawer").classList.toggle("open");
$("#closeBtn").onclick = () => $("#drawer").classList.remove("open");
$("#copyBtn").onclick = () => {
  const t = dataText();
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
    .then(() => { dirty = false; render(); toast("Copied. Paste it over data.js in your repo."); })
    .catch(() => prompt("Copy this into data.js:", t));
};
window.onbeforeunload = e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };

// Start
$("#title").textContent = CONFIG.title;
document.title = CONFIG.title;
$("#range").textContent = fmtDate(parse(CONFIG.startDate), { day: "numeric", month: "long" }) + " to " + fmtDate(parse(CONFIG.endDate), { day: "numeric", month: "long", year: "numeric" });
$("#themes").innerHTML = THEMES.map(t => `<button class="chip" data-theme="${t}" title="${t}" aria-label="${t} theme"></button>`).join("");
$("#colToggles").innerHTML = Object.entries(COLS).map(([k, v]) => `<label><input type="checkbox" value="${k}" ${CONFIG.columns.includes(k) ? "checked" : ""}> ${v}</label>`).join("");
$("#strip").classList.add("intro"); setTimeout(() => $("#strip").classList.remove("intro"), 1800);
look(); render();
const nowRow = $("tr.today"); if (nowRow) nowRow.scrollIntoView({ block: "center" });