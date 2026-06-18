import { useState, useEffect } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PAINTER_LEVELS = {
  "Painter 1": { multiplier: 0.12, label: "P1", desc: "Prep & paint by system" },
  "Painter 2": { multiplier: 0.15, label: "P2", desc: "Finish-ready, independent" },
  "Painter 3": { multiplier: 0.18, label: "P3", desc: "Owns quality & pace" },
  "A Tier Sub": { multiplier: null, label: "A Sub", desc: "95% on-schedule, low callbacks", isSub: true },
  "B Tier Sub": { multiplier: null, label: "B Sub", desc: "75% on-schedule, minor callbacks", isSub: true },
  "C Tier Sub": { multiplier: null, label: "C Sub", desc: "Interiors only, expected callbacks", isSub: true },
};

const SUB_LABOR_GUIDE = { "A Tier Sub": 40, "B Tier Sub": 35, "C Tier Sub": 30 };

const PROJECT_TYPES = ["Res Int", "Res Ext", "Res Cab", "Com Int", "Com Ext"];
const PROJECT_LABELS = {
  "Res Int": "Residential Interior",
  "Res Ext": "Residential Exterior",
  "Res Cab": "Residential Cabinets",
  "Com Int": "Commercial Interior",
  "Com Ext": "Commercial Exterior",
};

const GP_TARGETS = {
  "Res Int": 0.50, "Res Ext": 0.50, "Res Cab": 0.55,
  "Com Int": 0.30, "Com Ext": 0.30,
};

const PACKAGES = ["Standard", "Gold", "Platinum", "N/A"];
const MAT_PCT = { Standard: 0.15, Gold: 0.15, Platinum: 0.18, "N/A": 0.15 };

const SALESPERSON_LIST = ["Greg", "Doug"];
const PM_LIST = ["Z", "Greg"];
const DEFAULT_TEAM_LEADS = [
  "Abel Favela", "Zach Howick", "David Hernandez (Precision Drywall)",
  "Fernando Blancarte (Blancarte Painting)", "Ricky Aguilar (Saias Painting)",
  "Jose Ojeda (Western Pro Painting)", "Sergio Barba (SBAV Contractor Painting)", "N/A",
];
const TEAM_MEMBERS = [
  "Abel Favela", "Zach Howick", "Danny DaVito", "Steve Tollardo",
  "Justin Edwards", "Rony (Brothers Esteban)", "Jose (Western Pro Painting)",
  "Luis (Brushi Painting)", "Fernando (Blancarte Painting)",
  "Ricky (Saias Painting)", "Carlos (Carlex Painting)", "Enio (Yualex Painting)",
];

// ─── PAINT PRICES (fallback - app loads from /paint-prices.md at runtime) ───
const FALLBACK_CATALOG = [
  { id: "sp-int", name: "SW SuperPaint Interior", unit: "gal", price: 40, tier: "Standard", usage: "int" },
  { id: "sp-ext", name: "SW SuperPaint Exterior", unit: "gal", price: 45, tier: "Standard", usage: "ext" },
  { id: "dur-int", name: "SW Duration Interior", unit: "gal", price: 50, tier: "Gold", usage: "int" },
  { id: "dur-ext", name: "SW Duration Exterior", unit: "gal", price: 55, tier: "Gold", usage: "ext" },
  { id: "em-int", name: "SW Emerald Interior", unit: "gal", price: 60, tier: "Platinum", usage: "int" },
  { id: "em-ext", name: "SW Emerald Exterior", unit: "gal", price: 65, tier: "Platinum", usage: "ext" },
  { id: "em-ute", name: "SW Emerald Urethane Trim Enamel", unit: "gal", price: 65 },
  { id: "pm400", name: "SW ProMar 400", unit: "gal", price: 25 },
  { id: "sw-gal", name: "SW Gallery", unit: "gal", price: 120 },
  { id: "ppg-sh", name: "PPG SpeedHide", unit: "gal", price: 19 },
  { id: "ppg-mh", name: "PPG Manor Hall", unit: "gal", price: 25 },
  { id: "xbond", name: "Extreme Bond Primer", unit: "gal", price: 45 },
  { id: "ren-pr", name: "Renner Primer", unit: "gal", price: 75 },
  { id: "ren-tc", name: "Renner Topcoat", unit: "gal", price: 110 },
];

const FALLBACK_PKG_MAP = {
  Standard: { int: "sp-int", ext: "sp-ext" },
  Gold: { int: "dur-int", ext: "dur-ext" },
  Platinum: { int: "em-int", ext: "em-ext" },
};

function parsePricesMd(text) {
  const lines = text.split("\n");
  const catalog = [];
  const pkgMap = {};
  let section = null;

  for (const line of lines) {
    if (line.startsWith("## Paints")) { section = "paints"; continue; }
    if (line.startsWith("## Package")) { section = "packages"; continue; }
    if (line.startsWith("## ")) { section = null; continue; }
    if (!line.startsWith("|") || line.includes("---")) continue;

    const cells = line.split("|").map(c => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    if (section === "paints" && cells[0] !== "id") {
      catalog.push({
        id: cells[0],
        name: cells[1],
        unit: cells[2] || "gal",
        price: parseFloat(cells[3]) || 0,
        tier: cells[4] || undefined,
        usage: cells[5] || undefined,
      });
    }
    if (section === "packages" && cells[0] !== "package") {
      pkgMap[cells[0]] = { int: cells[1], ext: cells[2] };
    }
  }
  return { catalog, pkgMap };
}

async function loadPaintPrices() {
  try {
    const res = await fetch("/paint-prices.md");
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    return parsePricesMd(text);
  } catch {
    return { catalog: FALLBACK_CATALOG, pkgMap: FALLBACK_PKG_MAP };
  }
}

function getRecommendedPaint(pkgMap, pkg, projectType) {
  const map = pkgMap[pkg];
  if (!map) return null;
  const isExt = projectType === "Res Ext" || projectType === "Com Ext";
  return isExt ? map.ext : map.int;
}

const COLORS = {
  navy: "#1a2540",
  navyLight: "#243050",
  gold: "#C8972A",
  goldLight: "#e8b84b",
  orange: "#FF8800",
  pink: "#FF4C94",
  blue: "#4154A5",
  charcoal: "#272C2F",
  offWhite: "#F5F5F5",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  muted: "#8a96a8",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt$(n) {
  if (!n && n !== 0) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtPct(n) {
  return (n * 100).toFixed(1) + "%";
}
function parseNum(s) {
  return parseFloat(String(s).replace(/[$,]/g, "")) || 0;
}

function gpColor(gp, target) {
  if (gp >= target - 0.01) return COLORS.green;
  if (gp >= target - 0.06) return COLORS.yellow;
  return COLORS.red;
}

function gpLabel(gp, target) {
  if (gp >= target - 0.01) return "ON TARGET";
  if (gp >= target - 0.06) return "WATCH";
  return "BELOW TARGET";
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

async function loadHistory() {
  try {
    const r = await window.storage.get("epp_job_history");
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}

async function saveHistory(history) {
  try {
    await window.storage.set("epp_job_history", JSON.stringify(history));
  } catch (e) { /* ignore */ }
}

async function loadTeamLeads() {
  try {
    const r = await window.storage.get("epp_team_leads");
    return r ? JSON.parse(r.value) : DEFAULT_TEAM_LEADS;
  } catch { return DEFAULT_TEAM_LEADS; }
}

async function saveTeamLeads(leads) {
  try {
    await window.storage.set("epp_team_leads", JSON.stringify(leads));
  } catch { /* ignore */ }
}

async function loadCrewCapacity() {
  try {
    const r = await window.storage.get("epp_crew_capacity");
    return r ? JSON.parse(r.value) : {};
  } catch { return {}; }
}

async function saveCrewCapacity(data) {
  try {
    await window.storage.set("epp_crew_capacity", JSON.stringify(data));
  } catch { /* ignore */ }
}

async function loadCustomPaints() {
  try {
    const r = await window.storage.get("epp_custom_paints");
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}

async function saveCustomPaints(paints) {
  try {
    await window.storage.set("epp_custom_paints", JSON.stringify(paints));
  } catch { /* ignore */ }
}

const CAPACITY_STATUSES = ["available", "on-job", "unavailable"];
const CAPACITY_LABELS = { available: "Available", "on-job": "On Job", unavailable: "Unavailable" };
const CAPACITY_COLORS = { available: "#22c55e", "on-job": "#C8972A", unavailable: "#6b7280" };

function getWeekDates(weekOffset) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getWeekLabel(weekOffset) {
  if (weekOffset === 0) return "This Week";
  if (weekOffset === 1) return "Next Week";
  if (weekOffset === -1) return "Last Week";
  if (weekOffset === -2) return "2 Weeks Ago";
  return `Week ${weekOffset > 0 ? "+" : ""}${weekOffset}`;
}

function getDayLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Mon", "Tue", "Wed", "Thu", "Fri"][d.getDay() === 0 ? 6 : d.getDay() - 1] || "";
}

function getDateLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── CSV EXPORT / IMPORT ────────────────────────────────────────────────────

const CSV_COLUMNS = [
  "date", "dateCompleted", "clientName", "projectId", "projectType", "package",
  "salesperson", "pm", "teamLead", "revenue", "changeOrderRev",
  "laborBudget", "laborPct", "materialCost", "materialPct",
  "gpDollar", "gpPct", "crewSize", "totalDays", "manDays", "totalManHours",
  "crewSummary",
];

const CSV_HEADERS = [
  "Date Saved", "Date Completed", "Client", "Project ID", "Project Type", "Package",
  "Salesperson", "PM", "Team Lead", "Revenue", "Change Orders",
  "Labor Budget", "Labor %", "Material Cost", "Material %",
  "Est. GP $", "GP %", "# Guys", "Total Days", "Man-Days", "Man Hours",
  "Crew",
];

function escCsv(val) {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function jobToCsvRow(job) {
  const crewStr = (job.crew || [])
    .filter(c => c.name)
    .map(c => `${c.name} (${c.level}) ${c.days}d`)
    .join("; ");

  return CSV_COLUMNS.map(col => {
    if (col === "crewSummary") return escCsv(crewStr);
    if (col === "dateCompleted") return escCsv(job.dateCompleted || "");
    if (col === "laborPct" || col === "materialPct" || col === "gpPct")
      return escCsv(((job[col] || 0) * 100).toFixed(1));
    if (col === "revenue" || col === "changeOrderRev" || col === "laborBudget" || col === "materialCost" || col === "gpDollar")
      return escCsv((job[col] || 0).toFixed(2));
    return escCsv(job[col]);
  }).join(",");
}

function exportHistoryCsv(history) {
  const header = CSV_HEADERS.map(escCsv).join(",");
  const rows = history.map(jobToCsvRow);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `epp_job_history_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

function importCsvToJobs(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());

  const colMap = {};
  const mapping = {
    date: ["date", "date saved"], datecompleted: ["date completed", "datecompleted", "completed"],
    clientname: ["client", "clientname", "client name"],
    projectid: ["project id", "projectid"], projecttype: ["project type", "projecttype"],
    package: ["package"], salesperson: ["salesperson"], pm: ["pm"],
    teamlead: ["team lead", "teamlead", "lead"],
    revenue: ["revenue"], changeorderrev: ["change orders", "changeorderrev", "change order rev"],
    laborbudget: ["labor budget", "laborbudget"], laborpct: ["labor %", "laborpct", "labor pct"],
    materialcost: ["material cost", "materialcost"], materialpct: ["material %", "materialpct", "material pct"],
    gpdollar: ["est. gp $", "gpdollar", "gp $", "gp dollar"], gppct: ["gp %", "gppct", "gp pct"],
    crewsize: ["# guys", "crewsize", "crew size", "num guys"],
    totaldays: ["total days", "totaldays"], mandays: ["man-days", "mandays", "man days"],
    totalmanhours: ["man hours", "totalmanhours", "total man hours"],
  };

  for (const [field, aliases] of Object.entries(mapping)) {
    const idx = headers.findIndex(h => aliases.includes(h));
    if (idx !== -1) colMap[field] = idx;
  }

  const jobs = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const get = (field) => (colMap[field] !== undefined ? cells[colMap[field]]?.trim() : "") || "";
    const num = (field) => parseFloat(get(field).replace(/[$,]/g, "")) || 0;

    jobs.push({
      id: Date.now() + i,
      date: get("date") || new Date().toLocaleDateString("en-US"),
      dateCompleted: get("datecompleted") || "",
      clientName: get("clientname"),
      projectId: get("projectid"),
      projectType: get("projecttype") || "Res Int",
      package: get("package") || "Standard",
      salesperson: get("salesperson"),
      pm: get("pm"),
      teamLead: get("teamlead"),
      revenue: num("revenue"),
      changeOrderRev: num("changeorderrev"),
      laborBudget: num("laborbudget"),
      laborPct: num("laborpct") / 100,
      materialCost: num("materialcost"),
      materialPct: num("materialpct") / 100,
      gpDollar: num("gpdollar"),
      gpPct: num("gppct") / 100,
      crewSize: num("crewsize") || 0,
      totalDays: num("totaldays"),
      manDays: num("mandays") || 0,
      totalManHours: num("totalmanhours"),
      crew: [],
    });
  }
  return jobs;
}

// ─── CREW ROW ────────────────────────────────────────────────────────────────

function CrewRow({ member, onChange, onRemove, laborBudget }) {
  const levelData = PAINTER_LEVELS[member.level] || {};
  const isSub = levelData.isSub;

  let pay = 0;
  let hourlyRate = 0;
  const hours = member.days * 8;

  if (isSub) {
    pay = laborBudget;
    hourlyRate = hours > 0 ? pay / hours : 0;
  } else if (member.multiplier > 0 && laborBudget > 0) {
    pay = member.multiplierShare * laborBudget;
    hourlyRate = hours > 0 ? pay / hours : 0;
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 130px 100px 80px 80px 28px",
      gap: "8px",
      alignItems: "center",
      padding: "10px 12px",
      background: "rgba(255,255,255,0.04)",
      borderRadius: "8px",
      marginBottom: "6px",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <select
        value={member.name}
        onChange={e => onChange({ ...member, name: e.target.value })}
        style={inputStyle}
      >
        <option value="">Select team member</option>
        {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
        <option value="__custom">Other...</option>
      </select>
      <select
        value={member.level}
        onChange={e => onChange({ ...member, level: e.target.value })}
        style={inputStyle}
      >
        {Object.keys(PAINTER_LEVELS).map(l => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        step="0.5"
        placeholder="Days"
        value={member.days || ""}
        onChange={e => onChange({ ...member, days: parseFloat(e.target.value) || 0 })}
        style={{ ...inputStyle, textAlign: "center" }}
      />
      <div style={{ textAlign: "right", fontSize: "13px", color: COLORS.goldLight, fontWeight: 600 }}>
        {pay > 0 ? fmt$(pay) : "--"}
      </div>
      <div style={{ textAlign: "right", fontSize: "12px", color: COLORS.muted }}>
        {hourlyRate > 0 ? fmt$(hourlyRate) + "/hr" : "--"}
      </div>
      <button onClick={onRemove} style={{
        background: "none", border: "none", color: COLORS.muted,
        cursor: "pointer", fontSize: "16px", padding: "0", lineHeight: 1,
        transition: "color 0.15s",
      }}
        onMouseEnter={e => e.target.style.color = COLORS.red}
        onMouseLeave={e => e.target.style.color = COLORS.muted}
      >×</button>
    </div>
  );
}

// ─── HISTORY ROW ─────────────────────────────────────────────────────────────

const editInputStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "5px",
  color: "#F5F5F5",
  padding: "5px 8px",
  fontSize: "12px",
  width: "100%",
  fontFamily: "inherit",
};

const editLabelStyle = {
  fontSize: "10px",
  color: "#8a96a8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "3px",
};

function HistoryRow({ job, onDelete, onUpdate, paintCatalog, teamLeadList }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const target = GP_TARGETS[job.projectType] || 0.5;
  const color = gpColor(job.gpPct, target);

  function startEdit(e) {
    e.stopPropagation();
    setDraft({
      ...job,
      salesperson: job.salesperson || SALESPERSON_LIST[0],
      pm: job.pm || PM_LIST[0],
      teamLead: job.teamLead || teamLeadList[0],
      projectType: job.projectType || PROJECT_TYPES[0],
      package: job.package || PACKAGES[0],
      paintItems: (job.paintItems || []).map((pi, i) => ({ ...pi, id: pi.id || Date.now() + i })),
    });
    setEditing(true);
    setExpanded(true);
  }

  function cancelEdit(e) {
    e.stopPropagation();
    setDraft(null);
    setEditing(false);
  }

  function saveEdit(e) {
    e.stopPropagation();
    const rev = parseNum(draft.revenue);
    const co = parseNum(draft.changeOrderRev);
    const totalRev = rev + co;
    const lab = parseNum(draft.laborBudget);
    const mat = parseNum(draft.materialCost);
    const days = parseNum(draft.totalDays);
    const guys = parseNum(draft.crewSize) || 0;
    const md = guys * days;
    const updated = {
      ...draft,
      revenue: rev,
      laborBudget: lab,
      laborPct: totalRev > 0 ? lab / totalRev : 0,
      materialCost: mat,
      materialPct: totalRev > 0 ? mat / totalRev : 0,
      gpDollar: totalRev - lab - mat,
      gpPct: totalRev > 0 ? (totalRev - lab - mat) / totalRev : 0,
      crewSize: guys,
      totalDays: days,
      manDays: md,
      totalManHours: md * 8,
      changeOrderRev: co,
      paintItems: (draft.paintItems || []).filter(pi => pi.productId).map(pi => ({
        productId: pi.productId,
        qtyPurchased: pi.qtyPurchased || 0,
        qtyUsed: pi.qtyUsed || 0,
      })),
    };
    onUpdate(updated);
    setDraft(null);
    setEditing(false);
  }

  function updateDraft(field, value) {
    setDraft({ ...draft, [field]: value });
  }

  return (
    <div style={{
      borderRadius: "10px",
      border: `1px solid ${editing ? COLORS.gold + "44" : "rgba(255,255,255,0.08)"}`,
      marginBottom: "8px",
      overflow: "hidden",
    }}>
      <div
        onClick={() => !editing && setExpanded(!expanded)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 90px 90px 80px 28px 28px",
          gap: "8px",
          alignItems: "center",
          padding: "12px 16px",
          background: editing ? "rgba(200,151,42,0.06)" : "rgba(255,255,255,0.03)",
          cursor: editing ? "default" : "pointer",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px", color: COLORS.offWhite }}>{job.clientName || "Unnamed Job"}</div>
          <div style={{ fontSize: "11px", color: COLORS.muted, marginTop: "2px" }}>
            {job.projectId ? `#${job.projectId} · ` : ""}{PROJECT_LABELS[job.projectType]} · {job.package} · {job.dateCompleted || job.date}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "13px", color: COLORS.offWhite }}>{fmt$(job.revenue + (job.changeOrderRev || 0))}</div>
        <div style={{ textAlign: "right", fontSize: "13px", color: COLORS.offWhite }}>{fmt$(job.laborBudget)}</div>
        <div style={{ textAlign: "right", fontSize: "13px", color: COLORS.offWhite }}>{fmt$(job.gpDollar)}</div>
        <div style={{
          textAlign: "center", fontSize: "11px", fontWeight: 700,
          color, background: color + "22", borderRadius: "6px", padding: "3px 6px",
        }}>
          {fmtPct(job.gpPct)}
        </div>
        <button
          onClick={startEdit}
          title="Edit"
          style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "13px" }}
        >{editing ? "" : "✎"}</button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(job.id); }}
          style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "16px" }}
        >×</button>
      </div>

      {expanded && !editing && (
        <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
            {[
              ["Date Completed", job.dateCompleted || "--"],
              ["Salesperson", job.salesperson], ["PM", job.pm], ["Team Lead", job.teamLead],
              ["# Guys", job.crewSize || "--"],
              ["Days", (job.totalDays || 0) + " days"],
              ["Man-Days", (job.manDays || 0) + " man-days"],
              ["Labor Budget", fmt$(job.laborBudget) + " (" + fmtPct(job.laborPct) + ")"],
              ["Material Est.", fmt$(job.materialCost) + " (" + fmtPct(job.materialPct) + ")"],
              ["GP Target", fmtPct(target)],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: "13px", color: COLORS.offWhite, marginTop: "2px" }}>{val || "--"}</div>
              </div>
            ))}
          </div>
          {job.crew && job.crew.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Crew</div>
              {job.crew.map((c, i) => (
                <div key={i} style={{ fontSize: "12px", color: COLORS.offWhite, marginBottom: "3px" }}>
                  {c.name} · {c.level} · {c.days} days
                </div>
              ))}
            </div>
          )}
          {job.paintItems && job.paintItems.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Paint Usage</div>
              {job.paintItems.map((pi, i) => {
                const over = (pi.qtyPurchased || 0) - (pi.qtyUsed || 0);
                const pName = pi.productId === "__other__" ? (pi.customName || "Other") : (paintCatalog.find(p => p.id === pi.productId)?.name || pi.productId);
                return (
                  <div key={i} style={{ fontSize: "12px", color: COLORS.offWhite, marginBottom: "3px" }}>
                    {pName} · {pi.qtyPurchased || 0} bought · {pi.qtyUsed || 0} used
                    {pi.qtyUsed > 0 && <span style={{
                      fontWeight: 600, marginLeft: "6px",
                      color: over > 0 ? COLORS.gold : over < 0 ? COLORS.red : "#4ade80",
                    }}>({over > 0 ? "+" : ""}{over} {over > 0 ? "over" : over < 0 ? "short" : "exact"})</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editing && draft && (
        <div style={{ padding: "14px 16px", background: "rgba(0,0,0,0.25)", borderTop: `1px solid ${COLORS.gold}33` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "12px" }}>
            <div>
              <div style={editLabelStyle}>Client Name</div>
              <input style={editInputStyle} value={draft.clientName || ""} onChange={e => updateDraft("clientName", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Project ID</div>
              <input style={editInputStyle} value={draft.projectId || ""} onChange={e => updateDraft("projectId", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Date Completed</div>
              <input style={editInputStyle} type="date" value={draft.dateCompleted || ""} onChange={e => updateDraft("dateCompleted", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Project Type</div>
              <select style={editInputStyle} value={draft.projectType} onChange={e => updateDraft("projectType", e.target.value)}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{PROJECT_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <div style={editLabelStyle}>Package</div>
              <select style={editInputStyle} value={draft.package} onChange={e => updateDraft("package", e.target.value)}>
                {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <div style={editLabelStyle}>Salesperson</div>
              <select style={editInputStyle} value={draft.salesperson} onChange={e => updateDraft("salesperson", e.target.value)}>
                {SALESPERSON_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={editLabelStyle}>PM</div>
              <select style={editInputStyle} value={draft.pm} onChange={e => updateDraft("pm", e.target.value)}>
                {PM_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <div style={editLabelStyle}>Team Lead</div>
              <select style={editInputStyle} value={draft.teamLead || ""} onChange={e => updateDraft("teamLead", e.target.value)}>
                {teamLeadList.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <div style={editLabelStyle}>Revenue ($)</div>
              <input style={editInputStyle} type="number" value={draft.revenue} onChange={e => updateDraft("revenue", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Change Orders ($)</div>
              <input style={editInputStyle} type="number" value={draft.changeOrderRev || 0} onChange={e => updateDraft("changeOrderRev", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Labor Budget ($)</div>
              <input style={editInputStyle} type="number" value={draft.laborBudget} onChange={e => updateDraft("laborBudget", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Material Cost ($)</div>
              <input style={editInputStyle} type="number" value={draft.materialCost} onChange={e => updateDraft("materialCost", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}># Guys</div>
              <input style={editInputStyle} type="number" value={draft.crewSize || 0} onChange={e => updateDraft("crewSize", e.target.value)} />
            </div>
            <div>
              <div style={editLabelStyle}>Total Days</div>
              <input style={editInputStyle} type="number" value={draft.totalDays || 0} onChange={e => updateDraft("totalDays", e.target.value)} />
            </div>
          </div>

          {/* Paint Items */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Paint Usage</div>
            {(draft.paintItems || []).map((pi, idx) => (
              <div key={pi.id || idx} style={{
                display: "grid", gridTemplateColumns: "1fr 70px 70px 28px",
                gap: "6px", alignItems: "center", marginBottom: "6px",
              }}>
                <select style={editInputStyle} value={pi.productId || ""} onChange={e => {
                  const items = draft.paintItems.map((p, i) => i === idx ? { ...p, productId: e.target.value } : p);
                  updateDraft("paintItems", items);
                }}>
                  <option value="">Select paint</option>
                  {paintCatalog.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input style={{ ...editInputStyle, textAlign: "center" }} type="number" min="0" placeholder="Bought"
                  value={pi.qtyPurchased || ""} onChange={e => {
                    const items = draft.paintItems.map((p, i) => i === idx ? { ...p, qtyPurchased: parseFloat(e.target.value) || 0 } : p);
                    updateDraft("paintItems", items);
                  }} />
                <input style={{ ...editInputStyle, textAlign: "center" }} type="number" min="0" placeholder="Used"
                  value={pi.qtyUsed || ""} onChange={e => {
                    const items = draft.paintItems.map((p, i) => i === idx ? { ...p, qtyUsed: parseFloat(e.target.value) || 0 } : p);
                    updateDraft("paintItems", items);
                  }} />
                <button onClick={() => updateDraft("paintItems", draft.paintItems.filter((_, i) => i !== idx))}
                  style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "14px" }}>x</button>
              </div>
            ))}
            <button onClick={() => updateDraft("paintItems", [...(draft.paintItems || []), { id: Date.now(), productId: "", qtyPurchased: 0, qtyUsed: 0 }])}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: "6px", color: COLORS.muted, padding: "6px", width: "100%",
                cursor: "pointer", fontSize: "11px",
              }}>+ Add paint item</button>
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={cancelEdit} style={{
              fontSize: "11px", fontWeight: 600, color: COLORS.muted,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
            }}>Cancel</button>
            <button onClick={saveEdit} style={{
              fontSize: "11px", fontWeight: 600, color: COLORS.charcoal,
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
              border: "none", borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
            }}>Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHARED STYLES ───────────────────────────────────────────────────────────

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "7px",
  color: COLORS.offWhite,
  padding: "8px 10px",
  fontSize: "13px",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle = {
  fontSize: "10px",
  color: COLORS.muted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "5px",
  display: "block",
};

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "16px",
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("calc");
  const [saved, setSaved] = useState(false);

  // Calculator state
  const [clientName, setClientName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectType, setProjectType] = useState("Res Int");
  const [pkg, setPkg] = useState("Gold");
  const [salesperson, setSalesperson] = useState("Greg");
  const [pm, setPm] = useState("Z");
  const [teamLead, setTeamLead] = useState(DEFAULT_TEAM_LEADS[0]);
  const [teamLeadList, setTeamLeadList] = useState(DEFAULT_TEAM_LEADS);
  const [editingLeads, setEditingLeads] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [revenue, setRevenue] = useState("");
  const [changeOrder, setChangeOrder] = useState("");
  const [targetLaborPct, setTargetLaborPct] = useState(35);
  const [materialPctOverride, setMaterialPctOverride] = useState("");
  const [crew, setCrew] = useState([{ id: 1, name: "", level: "Painter 2", days: 0 }]);
  const [crewSize, setCrewSize] = useState("");
  const [materialItems, setMaterialItems] = useState([]);
  const [dateCompleted, setDateCompleted] = useState(new Date().toISOString().slice(0, 10));
  const [laborDollarEdit, setLaborDollarEdit] = useState(null);
  const [matDollarEdit, setMatDollarEdit] = useState(null);

  // Paint catalog (loaded from /paint-prices.md)
  const [paintCatalog, setPaintCatalog] = useState(FALLBACK_CATALOG);
  const [pkgPaintMap, setPkgPaintMap] = useState(FALLBACK_PKG_MAP);

  // Custom paints catalog
  const [customPaints, setCustomPaints] = useState([]);

  // Crew capacity
  const [crewCapacity, setCrewCapacity] = useState({});
  const [capacityWeekOffset, setCapacityWeekOffset] = useState(-2);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    loadHistory().then(h => { setHistory(h); setHistoryLoaded(true); });
    loadTeamLeads().then(leads => { setTeamLeadList(leads); setTeamLead(leads[0]); });
    loadPaintPrices().then(({ catalog, pkgMap }) => {
      if (catalog.length > 0) setPaintCatalog(catalog);
      if (Object.keys(pkgMap).length > 0) setPkgPaintMap(pkgMap);
    });
    loadCrewCapacity().then(setCrewCapacity);
    loadCustomPaints().then(setCustomPaints);
  }, []);

  // ─── CALCULATIONS ──────────────────────────────────────────────────────────

  // Detect if a sub tier is in the crew for the labor guide hint
  const activeSubTier = crew.find(m => PAINTER_LEVELS[m.level]?.isSub)?.level || null;
  const suggestedLaborPct = activeSubTier ? SUB_LABOR_GUIDE[activeSubTier] : null;

  const rev = parseNum(revenue);
  const co = parseNum(changeOrder);
  const totalRev = rev + co;
  const matPct = materialPctOverride !== "" ? parseNum(materialPctOverride) / 100 : MAT_PCT[pkg];
  const materialCost = totalRev * matPct;
  const laborBudget = totalRev * (targetLaborPct / 100);
  const gpTarget = GP_TARGETS[projectType] || 0.5;
  const gpDollar = totalRev - laborBudget - materialCost;
  const gpPct = totalRev > 0 ? gpDollar / totalRev : 0;
  const laborPct = targetLaborPct / 100;

  // Crew multiplier shares
  const totalMultiplier = crew.reduce((sum, m) => {
    const ld = PAINTER_LEVELS[m.level];
    return sum + (ld && !ld.isSub ? ld.multiplier : 0);
  }, 0);

  const enrichedCrew = crew.map(m => {
    const ld = PAINTER_LEVELS[m.level] || {};
    return {
      ...m,
      multiplier: ld.multiplier || 0,
      multiplierShare: totalMultiplier > 0 && !ld.isSub ? ld.multiplier / totalMultiplier : 0,
    };
  });

  const totalCrewPay = enrichedCrew.reduce((sum, m) => {
    const ld = PAINTER_LEVELS[m.level] || {};
    if (ld.isSub) {
      return sum + laborBudget;
    }
    return sum + m.multiplierShare * laborBudget;
  }, 0);

  const fullPaintCatalog = [...paintCatalog, ...customPaints];

  const paintItemsTotal = materialItems.reduce((sum, item) => {
    if (item.productId === "__other__") {
      return sum + ((item.customPrice || 0) * (item.qtyPurchased || item.qty || 0));
    }
    const product = fullPaintCatalog.find(p => p.id === item.productId);
    return sum + (product ? product.price * (item.qtyPurchased || item.qty || 0) : 0);
  }, 0);

  const totalGalPurchased = materialItems.reduce((s, i) => s + (i.qtyPurchased || i.qty || 0), 0);
  const totalGalUsed = materialItems.reduce((s, i) => s + (i.qtyUsed || 0), 0);
  const totalGalOver = totalGalPurchased - totalGalUsed;

  const totalDays = crew.reduce((s, m) => s + (m.days || 0), 0);
  const numGuys = parseNum(crewSize) || crew.filter(m => m.name).length || 0;
  const manDays = numGuys * totalDays;
  const totalManHours = manDays * 8;

  // ─── SLACK TABLE ──────────────────────────────────────────────────────────

  const slackTable = `*Work Order Labor Budget*
Project: ${clientName || "TBD"} | ${PROJECT_LABELS[projectType]} | ${pkg}
Revenue: ${fmt$(totalRev)} | Target Labor: ${targetLaborPct}%

Crew: ${numGuys} guys | Days: ${totalDays} | Man-Days: ${manDays} | Labor Budget: ${fmt$(laborBudget)}

*Crew Assignments:*
${enrichedCrew.filter(m => m.name).map(m => {
  const ld = PAINTER_LEVELS[m.level] || {};
  let pay;
  if (ld.isSub) {
    pay = laborBudget;
  } else {
    pay = m.multiplierShare * laborBudget;
  }
  return `• ${m.name} (${m.level}) — ${m.days} days — ${fmt$(pay)}`;
}).join("\n")}

GP Estimate: ${fmt$(gpDollar)} (${fmtPct(gpPct)}) | Target: ${fmtPct(gpTarget)}`;

  // ─── SAVE JOB ─────────────────────────────────────────────────────────────

  async function handleSave() {
    const job = {
      id: Date.now(),
      date: new Date().toLocaleDateString("en-US"),
      dateCompleted,
      clientName, projectId, projectType, package: pkg,
      salesperson, pm, teamLead, revenue: rev, changeOrderRev: co,
      laborBudget, laborPct, materialCost, materialPct: matPct,
      gpDollar, gpPct, totalDays, crewSize: numGuys, manDays, totalManHours,
      crew: enrichedCrew.filter(m => m.name),
      paintItems: materialItems.filter(i => i.productId).map(i => ({
        productId: i.productId,
        qtyPurchased: i.qtyPurchased || i.qty || 0,
        qtyUsed: i.qtyUsed || 0,
        ...(i.productId === "__other__" ? { customName: i.customName || "", customPrice: i.customPrice || 0 } : {}),
      })),
    };
    const updated = [job, ...history];
    setHistory(updated);
    await saveHistory(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDelete(id) {
    const updated = history.filter(j => j.id !== id);
    setHistory(updated);
    await saveHistory(updated);
  }

  async function handleUpdateJob(updatedJob) {
    const updated = history.map(j => j.id === updatedJob.id ? updatedJob : j);
    setHistory(updated);
    await saveHistory(updated);
  }

  function handleImportCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const jobs = importCsvToJobs(ev.target.result);
      if (jobs.length === 0) return;
      const existingIds = new Set(history.map(j => j.projectId).filter(Boolean));
      const fresh = jobs.filter(j => !j.projectId || !existingIds.has(j.projectId));
      const skipped = jobs.length - fresh.length;
      if (fresh.length === 0) return;
      const updated = [...fresh, ...history];
      setHistory(updated);
      await saveHistory(updated);
      if (skipped > 0) setImportMsg(`Imported ${fresh.length} jobs, skipped ${skipped} duplicates`);
      else setImportMsg(`Imported ${fresh.length} jobs`);
      setTimeout(() => setImportMsg(""), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function addCrewMember() {
    setCrew([...crew, { id: Date.now(), name: "", level: "Painter 2", days: 0 }]);
  }

  function removeCrewMember(id) {
    setCrew(crew.filter(m => m.id !== id));
  }

  function updateCrewMember(id, updated) {
    setCrew(crew.map(m => m.id === id ? { ...m, ...updated } : m));
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, #0f1624 0%, #1a2540 50%, #0f1624 100%)`,
      color: COLORS.offWhite,
      fontFamily: "'DM Sans', 'Nunito', sans-serif",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "rgba(0,0,0,0.3)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.gold})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
          }}>🎨</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.01em" }}>EPP Labor Calculator</div>
            <div style={{ fontSize: "10px", color: COLORS.muted, letterSpacing: "0.06em" }}>ELEVATE PAINT PROS</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["calc", "crew", "history"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? COLORS.gold : "transparent",
                color: tab === t ? COLORS.charcoal : COLORS.muted,
                border: `1px solid ${tab === t ? COLORS.gold : "rgba(255,255,255,0.12)"}`,
                borderRadius: "8px",
                padding: "7px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "all 0.15s",
              }}
            >
              {t === "calc" ? "Calculator" : t === "crew" ? "Crew" : `History (${history.length})`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "24px 16px" }}>

        {/* ── CALCULATOR TAB ── */}
        {tab === "calc" && (
          <>
            {/* Job Info */}
            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Job Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Client Name</label>
                  <input style={inputStyle} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Smith Residence" />
                </div>
                <div>
                  <label style={labelStyle}>DripJobs Project ID</label>
                  <input style={inputStyle} value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="2XXXXXX" />
                </div>
                <div>
                  <label style={labelStyle}>Project Type</label>
                  <select style={inputStyle} value={projectType} onChange={e => setProjectType(e.target.value)}>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{PROJECT_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Package</label>
                  <select style={inputStyle} value={pkg} onChange={e => setPkg(e.target.value)}>
                    {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Salesperson</label>
                  <select style={inputStyle} value={salesperson} onChange={e => setSalesperson(e.target.value)}>
                    {SALESPERSON_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Project Manager</label>
                  <select style={inputStyle} value={pm} onChange={e => setPm(e.target.value)}>
                    {PM_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Team Lead</label>
                  <select style={inputStyle} value={teamLead} onChange={e => setTeamLead(e.target.value)}>
                    {teamLeadList.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date Completed</label>
                  <input style={inputStyle} type="date" value={dateCompleted} onChange={e => setDateCompleted(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div style={cardStyle}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Revenue & Targets</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Contract Revenue ($)</label>
                  <input style={inputStyle} type="number" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="10,000" />
                </div>
                <div>
                  <label style={labelStyle}>Change Order Revenue ($)</label>
                  <input style={inputStyle} type="number" value={changeOrder} onChange={e => setChangeOrder(e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Labor target - % and $ inputs */}
              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>Target Labor <span style={{ color: COLORS.muted, fontWeight: 400 }}>(default: 35%)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      type="number" min="20" max="50" step="any"
                      value={targetLaborPct}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        setTargetLaborPct(isNaN(v) ? 35 : Math.min(50, Math.max(20, v)));
                      }}
                    />
                    <span style={{ fontSize: "14px", color: COLORS.muted, whiteSpace: "nowrap" }}>%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: COLORS.muted, whiteSpace: "nowrap" }}>$</span>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      type="number" min="0" step="any"
                      value={laborDollarEdit !== null ? laborDollarEdit : (totalRev > 0 ? laborBudget.toFixed(2) : "")}
                      placeholder="0"
                      onFocus={e => setLaborDollarEdit(e.target.value)}
                      onChange={e => setLaborDollarEdit(e.target.value)}
                      onBlur={() => {
                        const dollars = parseFloat(laborDollarEdit) || 0;
                        if (totalRev > 0) {
                          const pct = (dollars / totalRev) * 100;
                          setTargetLaborPct(Math.min(50, Math.max(20, pct)));
                        }
                        setLaborDollarEdit(null);
                      }}
                    />
                  </div>
                </div>
                <input
                  className="epp-slider"
                  type="range" min="20" max="50" step="0.5"
                  value={targetLaborPct}
                  onChange={e => { setTargetLaborPct(parseFloat(e.target.value)); setLaborDollarEdit(null); }}
                  style={{ width: "100%", marginTop: "8px" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: COLORS.muted, marginTop: "2px" }}>
                  <span>20%</span><span>50%</span>
                </div>
                {activeSubTier && (
                  <div style={{
                    marginTop: "8px",
                    padding: "8px 10px",
                    background: "rgba(200,151,42,0.08)",
                    border: "1px solid rgba(200,151,42,0.2)",
                    borderRadius: "7px",
                    fontSize: "11px",
                    color: COLORS.goldLight,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    <span style={{ fontSize: "13px" }}>&#9670;</span>
                    <span>
                      Sub labor guide:
                      {Object.entries(SUB_LABOR_GUIDE).map(([tier, pct]) => (
                        <span key={tier} style={{
                          marginLeft: "8px",
                          fontWeight: tier === activeSubTier ? 700 : 400,
                          color: tier === activeSubTier ? COLORS.gold : COLORS.muted,
                          textDecoration: tier === activeSubTier ? "underline" : "none",
                          textUnderlineOffset: "3px",
                        }}>
                          {tier.replace(" Tier Sub", "")}: {pct}%
                        </span>
                      ))}
                    </span>
                    {targetLaborPct !== suggestedLaborPct && (
                      <button
                        onClick={() => setTargetLaborPct(suggestedLaborPct)}
                        style={{
                          marginLeft: "auto",
                          background: "rgba(200,151,42,0.2)",
                          border: "1px solid rgba(200,151,42,0.3)",
                          borderRadius: "5px",
                          color: COLORS.gold,
                          padding: "3px 8px",
                          fontSize: "10px",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.03em",
                        }}
                      >
                        Set to {suggestedLaborPct}%
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Material target - % and $ inputs */}
              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>Materials Budget <span style={{ color: COLORS.muted, fontWeight: 400 }}>(default: {(MAT_PCT[pkg] * 100).toFixed(0)}%)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      type="number" min="5" max="25" step="any"
                      value={materialPctOverride}
                      onChange={e => setMaterialPctOverride(e.target.value)}
                      placeholder={(MAT_PCT[pkg] * 100).toFixed(0)}
                    />
                    <span style={{ fontSize: "14px", color: COLORS.muted, whiteSpace: "nowrap" }}>%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: COLORS.muted, whiteSpace: "nowrap" }}>$</span>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      type="number" min="0" step="25"
                      value={matDollarEdit !== null ? matDollarEdit : (totalRev > 0 ? materialCost.toFixed(2) : "")}
                      placeholder="0"
                      onFocus={e => setMatDollarEdit(e.target.value)}
                      onChange={e => setMatDollarEdit(e.target.value)}
                      onBlur={() => {
                        const dollars = parseFloat(matDollarEdit) || 0;
                        if (totalRev > 0) {
                          const pct = (dollars / totalRev) * 100;
                          setMaterialPctOverride(String(pct));
                        }
                        setMatDollarEdit(null);
                      }}
                    />
                  </div>
                </div>
                <input
                  className="epp-slider"
                  type="range" min="5" max="25" step="0.5"
                  value={materialPctOverride !== "" ? materialPctOverride : MAT_PCT[pkg] * 100}
                  onChange={e => { setMaterialPctOverride(e.target.value); setMatDollarEdit(null); }}
                  style={{ width: "100%", marginTop: "8px" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: COLORS.muted, marginTop: "2px" }}>
                  <span>5%</span><span>25%</span>
                </div>
              </div>
            </div>

            {/* Paint Items */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, letterSpacing: "0.05em", textTransform: "uppercase" }}>Paint Materials</div>
                {paintItemsTotal > 0 && (
                  <div style={{ fontSize: "12px", color: COLORS.muted }}>
                    Actual: {fmt$(paintItemsTotal)} · Budget: {fmt$(materialCost)}
                  </div>
                )}
              </div>
              {(() => {
                const recId = getRecommendedPaint(pkgPaintMap, pkg, projectType);
                const recProduct = paintCatalog.find(p => p.id === recId);
                return recProduct ? (
                  <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "14px" }}>
                    {pkg} package recommends <span style={{ color: COLORS.goldLight, fontWeight: 600 }}>{recProduct.name}</span> ({fmt$(recProduct.price)}/gal)
                  </div>
                ) : null;
              })()}

              {/* Column headers */}
              {materialItems.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 65px 65px 55px 70px 80px 28px",
                  gap: "6px",
                  padding: "0 12px 8px",
                }}>
                  {["Product", "Bought", "Used", "+/-", "Unit $", "Line $", ""].map(h => (
                    <div key={h} style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h === "Product" ? "left" : "center" }}>{h}</div>
                  ))}
                </div>
              )}

              {materialItems.map(item => {
                const isOther = item.productId === "__other__";
                const product = isOther ? null : fullPaintCatalog.find(p => p.id === item.productId);
                const unitPrice = isOther ? (item.customPrice || 0) : (product ? product.price : 0);
                const bought = item.qtyPurchased || item.qty || 0;
                const used = item.qtyUsed || 0;
                const overUnder = bought - used;
                const lineTotal = unitPrice * bought;
                return (
                  <div key={item.id} style={{ marginBottom: "6px" }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 65px 65px 55px 70px 80px 28px",
                      gap: "6px",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: isOther ? "8px 8px 0 0" : "8px",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <select
                        value={item.productId}
                        onChange={e => setMaterialItems(materialItems.map(i =>
                          i.id === item.id ? { ...i, productId: e.target.value, customName: "", customPrice: 0, addToCatalog: false } : i
                        ))}
                        style={inputStyle}
                      >
                        <option value="">Select paint</option>
                        {paintCatalog.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        {customPaints.length > 0 && (
                          <option disabled>--- Custom ---</option>
                        )}
                        {customPaints.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        <option disabled>---</option>
                        <option value="__other__">Other (custom)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={item.qtyPurchased || item.qty || ""}
                        onChange={e => setMaterialItems(materialItems.map(i =>
                          i.id === item.id ? { ...i, qtyPurchased: parseFloat(e.target.value) || 0 } : i
                        ))}
                        style={{ ...inputStyle, textAlign: "center", padding: "8px 4px" }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={item.qtyUsed || ""}
                        onChange={e => setMaterialItems(materialItems.map(i =>
                          i.id === item.id ? { ...i, qtyUsed: parseFloat(e.target.value) || 0 } : i
                        ))}
                        style={{ ...inputStyle, textAlign: "center", padding: "8px 4px" }}
                      />
                      <div style={{
                        textAlign: "center", fontSize: "12px", fontWeight: 600,
                        color: used === 0 ? COLORS.muted : overUnder > 0 ? COLORS.gold : overUnder < 0 ? COLORS.red : "#4ade80",
                      }}>
                        {used === 0 ? "--" : (overUnder > 0 ? "+" : "") + overUnder}
                      </div>
                      <div style={{ textAlign: "center", fontSize: "12px", color: COLORS.muted }}>
                        {unitPrice > 0 ? fmt$(unitPrice) + "/gal" : "--"}
                      </div>
                      <div style={{ textAlign: "right", fontSize: "13px", color: COLORS.goldLight, fontWeight: 600 }}>
                        {lineTotal > 0 ? fmt$(lineTotal) : "--"}
                      </div>
                      <button
                        onClick={() => setMaterialItems(materialItems.filter(i => i.id !== item.id))}
                        style={{
                          background: "none", border: "none", color: COLORS.muted,
                          cursor: "pointer", fontSize: "16px", padding: "0", lineHeight: 1,
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e => e.target.style.color = COLORS.red}
                        onMouseLeave={e => e.target.style.color = COLORS.muted}
                      >x</button>
                    </div>
                    {isOther && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px auto",
                        gap: "8px",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "rgba(200,151,42,0.06)",
                        borderRadius: "0 0 8px 8px",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderTop: "none",
                      }}>
                        <input
                          type="text"
                          placeholder="Product name"
                          value={item.customName || ""}
                          onChange={e => setMaterialItems(materialItems.map(i =>
                            i.id === item.id ? { ...i, customName: e.target.value } : i
                          ))}
                          style={{ ...inputStyle, fontSize: "12px" }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="$/gal"
                          value={item.customPrice || ""}
                          onChange={e => setMaterialItems(materialItems.map(i =>
                            i.id === item.id ? { ...i, customPrice: parseFloat(e.target.value) || 0 } : i
                          ))}
                          style={{ ...inputStyle, fontSize: "12px", textAlign: "center" }}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                          <input
                            type="checkbox"
                            checked={item.addToCatalog || false}
                            onChange={e => {
                              const checked = e.target.checked;
                              setMaterialItems(materialItems.map(i =>
                                i.id === item.id ? { ...i, addToCatalog: checked } : i
                              ));
                              if (checked && item.customName && item.customPrice > 0) {
                                const newId = "custom-" + Date.now();
                                const newProduct = { id: newId, name: item.customName, unit: "gal", price: item.customPrice };
                                const updated = [...customPaints, newProduct];
                                setCustomPaints(updated);
                                saveCustomPaints(updated);
                                setMaterialItems(materialItems.map(i =>
                                  i.id === item.id ? { ...i, productId: newId, addToCatalog: false } : i
                                ));
                              }
                            }}
                            style={{ accentColor: COLORS.gold }}
                          />
                          Add to catalog
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setMaterialItems([...materialItems, { id: Date.now(), productId: getRecommendedPaint(pkgPaintMap, pkg, projectType) || "", qtyPurchased: 0, qtyUsed: 0 }])}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  color: COLORS.muted,
                  padding: "9px",
                  width: "100%",
                  cursor: "pointer",
                  fontSize: "12px",
                  letterSpacing: "0.04em",
                  marginTop: "4px",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.borderColor = COLORS.gold; e.target.style.color = COLORS.gold; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.color = COLORS.muted; }}
              >
                + Add paint item
              </button>

              {paintItemsTotal > 0 && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: paintItemsTotal > materialCost ? "rgba(239,68,68,0.08)" : "rgba(200,151,42,0.08)",
                  borderRadius: "8px",
                  border: `1px solid ${paintItemsTotal > materialCost ? "rgba(239,68,68,0.2)" : "rgba(200,151,42,0.2)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: "12px", color: COLORS.muted }}>
                    Paint total {paintItemsTotal > materialCost ? "(over budget)" : ""}
                  </span>
                  <span style={{
                    fontSize: "14px", fontWeight: 700,
                    color: paintItemsTotal > materialCost ? COLORS.red : COLORS.goldLight,
                  }}>
                    {fmt$(paintItemsTotal)} <span style={{ fontSize: "11px", fontWeight: 400, color: COLORS.muted }}>/ {fmt$(materialCost)} budget</span>
                  </span>
                </div>
              )}

              {totalGalPurchased > 0 && (
                <div style={{
                  marginTop: "8px",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: "12px", color: COLORS.muted }}>
                    Gallon tracking
                  </span>
                  <span style={{ fontSize: "12px", color: COLORS.offWhite }}>
                    {totalGalPurchased} bought
                    {totalGalUsed > 0 && <> · {totalGalUsed} used · <span style={{
                      fontWeight: 700,
                      color: totalGalOver > 0 ? COLORS.gold : totalGalOver < 0 ? COLORS.red : "#4ade80",
                    }}>{totalGalOver > 0 ? "+" : ""}{totalGalOver} {totalGalOver > 0 ? "over" : totalGalOver < 0 ? "short" : "exact"}</span></>}
                  </span>
                </div>
              )}
            </div>

            {/* GP Summary Bar */}
            {totalRev > 0 && (
              <div style={{
                ...cardStyle,
                background: "rgba(0,0,0,0.25)",
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${gpColor(gpPct, gpTarget)}44`,
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "14px" }}>
                    {[
                      ["Total Revenue", fmt$(totalRev)],
                      ["Labor Budget", fmt$(laborBudget)],
                      ["Materials Est.", fmt$(materialCost)],
                      ["Est. GP", fmt$(gpDollar)],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: COLORS.offWhite, marginTop: "2px" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      flex: 1, height: "8px", background: "rgba(255,255,255,0.08)",
                      borderRadius: "4px", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(Math.max(gpPct * 100, 0), 100)}%`,
                        background: gpColor(gpPct, gpTarget),
                        borderRadius: "4px",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{
                      fontSize: "13px", fontWeight: 700, color: gpColor(gpPct, gpTarget),
                      minWidth: "80px", textAlign: "right",
                    }}>
                      {fmtPct(gpPct)} GP
                    </div>
                    <div style={{
                      fontSize: "10px", fontWeight: 700,
                      color: gpColor(gpPct, gpTarget),
                      background: gpColor(gpPct, gpTarget) + "22",
                      borderRadius: "6px", padding: "3px 8px",
                      letterSpacing: "0.06em",
                    }}>
                      {gpLabel(gpPct, gpTarget)}
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.muted, marginTop: "8px" }}>
                    GP target for {PROJECT_LABELS[projectType]}: {fmtPct(gpTarget)} · Labor target: {targetLaborPct}% · Materials: {fmtPct(matPct)}
                  </div>
              </div>
            )}

            {/* Crew */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, letterSpacing: "0.05em", textTransform: "uppercase" }}>Crew & Piece Rate</div>
                  <button
                    onClick={() => setEditingLeads(!editingLeads)}
                    style={{
                      fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em",
                      color: editingLeads ? COLORS.charcoal : COLORS.muted,
                      background: editingLeads ? `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})` : "rgba(255,255,255,0.06)",
                      border: `1px solid ${editingLeads ? "transparent" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: "5px", padding: "4px 10px", cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >{editingLeads ? "Done" : "Manage Team"}</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <label style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}># Guys</label>
                    <input
                      style={{ ...inputStyle, width: "50px", padding: "4px 8px", fontSize: "12px", textAlign: "center" }}
                      type="number" min="0" value={crewSize}
                      onChange={e => setCrewSize(e.target.value)}
                      placeholder={String(crew.filter(m => m.name).length || 0)}
                    />
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.muted }}>
                    {totalDays} days · {manDays} man-days · {totalManHours} man-hrs
                  </div>
                </div>
              </div>

              {editingLeads && (
                <div style={{
                  padding: "14px",
                  marginBottom: "16px",
                  background: "rgba(200,151,42,0.04)",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.gold}33`,
                }}>
                  <div style={{ fontSize: "11px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Team Leads</div>
                  {teamLeadList.filter(l => l !== "N/A").map(lead => (
                    <div key={lead} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "5px 10px", marginBottom: "3px",
                      background: "rgba(255,255,255,0.04)", borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <span style={{ fontSize: "12px", color: COLORS.offWhite }}>{lead}</span>
                      <button
                        onClick={() => {
                          const updated = teamLeadList.filter(l => l !== lead);
                          setTeamLeadList(updated);
                          saveTeamLeads(updated);
                          if (teamLead === lead) setTeamLead(updated[0] || "N/A");
                        }}
                        style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "14px" }}
                        onMouseEnter={e => e.target.style.color = COLORS.red}
                        onMouseLeave={e => e.target.style.color = COLORS.muted}
                      >x</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input
                      style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
                      placeholder="New team lead name"
                      value={newLeadName}
                      onChange={e => setNewLeadName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newLeadName.trim()) {
                          const updated = [...teamLeadList.filter(l => l !== "N/A"), newLeadName.trim(), "N/A"];
                          setTeamLeadList(updated);
                          saveTeamLeads(updated);
                          setNewLeadName("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!newLeadName.trim()) return;
                        const updated = [...teamLeadList.filter(l => l !== "N/A"), newLeadName.trim(), "N/A"];
                        setTeamLeadList(updated);
                        saveTeamLeads(updated);
                        setNewLeadName("");
                      }}
                      style={{
                        fontSize: "11px", fontWeight: 600, color: COLORS.charcoal,
                        background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
                        border: "none", borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
                      }}
                    >Add</button>
                  </div>
                </div>
              )}

              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 100px 80px 80px 28px",
                gap: "8px",
                padding: "0 12px 8px",
              }}>
                {["Team Member", "Level", "Days", "Pay", "$/hr", ""].map(h => (
                  <div key={h} style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                ))}
              </div>

              {enrichedCrew.map(m => (
                <CrewRow
                  key={m.id}
                  member={m}
                  laborBudget={laborBudget}
                  onChange={updated => updateCrewMember(m.id, updated)}
                  onRemove={() => removeCrewMember(m.id)}
                />
              ))}

              <button onClick={addCrewMember} style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: COLORS.muted,
                padding: "9px",
                width: "100%",
                cursor: "pointer",
                fontSize: "12px",
                letterSpacing: "0.04em",
                marginTop: "4px",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.target.style.borderColor = COLORS.gold; e.target.style.color = COLORS.gold; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.color = COLORS.muted; }}
              >
                + Add crew member
              </button>

              {totalCrewPay > 0 && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "rgba(200,151,42,0.08)",
                  borderRadius: "8px",
                  border: "1px solid rgba(200,151,42,0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: "12px", color: COLORS.muted }}>Total crew pay</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: COLORS.goldLight }}>{fmt$(totalCrewPay)}</span>
                </div>
              )}
            </div>

            {/* Slack Output */}
            {totalRev > 0 && enrichedCrew.some(m => m.name) && (
              <div style={cardStyle}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Slack Work Order Output</div>
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "8px",
                  padding: "14px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  lineHeight: "1.7",
                  color: COLORS.offWhite,
                  whiteSpace: "pre-wrap",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {slackTable}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(slackTable)}
                  style={{
                    marginTop: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: COLORS.offWhite,
                    padding: "8px 16px",
                    fontSize: "12px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  Copy to Clipboard
                </button>
              </div>
            )}

            {/* Save Button */}
            {totalRev > 0 && (
              <button
                onClick={handleSave}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: saved
                    ? `linear-gradient(135deg, ${COLORS.green}, #16a34a)`
                    : `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
                  border: "none",
                  borderRadius: "10px",
                  color: saved ? "#fff" : COLORS.charcoal,
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                  marginBottom: "24px",
                }}
              >
                {saved ? "✓ Saved to History" : "Save to Job History"}
              </button>
            )}
          </>
        )}

        {/* ── CREW CAPACITY TAB ── */}
        {tab === "crew" && (() => {
          const leads = teamLeadList.filter(l => l !== "N/A");
          const weeks = [0, 1, 2, 3].map(i => ({
            offset: capacityWeekOffset + i,
            label: getWeekLabel(capacityWeekOffset + i),
            days: getWeekDates(capacityWeekOffset + i),
          }));

          const today = new Date().toISOString().slice(0, 10);

          function toggleStatus(lead, dateStr) {
            const key = `${lead}|${dateStr}`;
            const current = crewCapacity[key] || "available";
            const nextIdx = (CAPACITY_STATUSES.indexOf(current) + 1) % CAPACITY_STATUSES.length;
            const updated = { ...crewCapacity, [key]: CAPACITY_STATUSES[nextIdx] };
            setCrewCapacity(updated);
            saveCrewCapacity(updated);
          }

          return (
            <>
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Crew Capacity
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      onClick={() => setCapacityWeekOffset(capacityWeekOffset - 1)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: COLORS.offWhite, padding: "4px 10px", cursor: "pointer", fontSize: "13px" }}
                    >&larr;</button>
                    <button
                      onClick={() => setCapacityWeekOffset(-2)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: COLORS.muted, padding: "4px 10px", cursor: "pointer", fontSize: "11px" }}
                    >Today</button>
                    <button
                      onClick={() => setCapacityWeekOffset(capacityWeekOffset + 1)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: COLORS.offWhite, padding: "4px 10px", cursor: "pointer", fontSize: "13px" }}
                    >&rarr;</button>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "11px" }}>
                  {CAPACITY_STATUSES.map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: CAPACITY_COLORS[s] }} />
                      <span style={{ color: COLORS.muted }}>{CAPACITY_LABELS[s]}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto", color: COLORS.muted, fontStyle: "italic" }}>
                    Click a cell to cycle status
                  </div>
                </div>

                {weeks.map(week => {
                  const weekAvailCount = leads.reduce((sum, lead) => {
                    const availDays = week.days.filter(d => (crewCapacity[`${lead}|${d}`] || "available") === "available").length;
                    return sum + availDays;
                  }, 0);
                  const totalSlots = leads.length * week.days.length;
                  const weekCapPct = totalSlots > 0 ? weekAvailCount / totalSlots : 0;
                  const capColor = weekCapPct >= 0.5 ? COLORS.green : weekCapPct >= 0.25 ? COLORS.yellow : COLORS.red;

                  return (
                    <div key={week.offset} style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontWeight: 600, fontSize: "12px", color: COLORS.offWhite }}>{week.label}</div>
                        <div style={{
                          fontSize: "11px", fontWeight: 700, color: capColor,
                          background: capColor + "22", borderRadius: "6px", padding: "3px 8px",
                        }}>
                          {(weekCapPct * 100).toFixed(0)}% Available
                        </div>
                      </div>

                      {/* Day headers */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "130px repeat(5, 1fr)",
                        gap: "3px",
                        marginBottom: "3px",
                      }}>
                        <div />
                        {week.days.map(d => (
                          <div key={d} style={{
                            textAlign: "center", fontSize: "10px", color: d === today ? COLORS.gold : COLORS.muted,
                            fontWeight: d === today ? 700 : 400,
                          }}>
                            {getDayLabel(d)} {getDateLabel(d)}
                          </div>
                        ))}
                      </div>

                      {/* Lead rows */}
                      {leads.map(lead => (
                        <div key={lead} style={{
                          display: "grid",
                          gridTemplateColumns: "130px repeat(5, 1fr)",
                          gap: "3px",
                          marginBottom: "2px",
                        }}>
                          <div style={{
                            fontSize: "11px", color: COLORS.offWhite, padding: "6px 8px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }} title={lead}>
                            {lead.split(" (")[0]}
                          </div>
                          {week.days.map(d => {
                            const status = crewCapacity[`${lead}|${d}`] || "available";
                            const isPast = d < today;
                            return (
                              <button
                                key={d}
                                onClick={() => toggleStatus(lead, d)}
                                title={`${lead.split(" (")[0]} - ${getDayLabel(d)} ${getDateLabel(d)}: ${CAPACITY_LABELS[status]}`}
                                style={{
                                  background: CAPACITY_COLORS[status] + (isPast ? "44" : "33"),
                                  border: d === today ? `2px solid ${COLORS.gold}` : "1px solid transparent",
                                  borderRadius: "4px",
                                  padding: "6px 2px",
                                  cursor: "pointer",
                                  fontSize: "9px",
                                  fontWeight: 600,
                                  color: CAPACITY_COLORS[status],
                                  textAlign: "center",
                                  transition: "all 0.1s",
                                  opacity: isPast ? 0.6 : 1,
                                }}
                              >
                                {status === "available" ? "A" : status === "on-job" ? "J" : "X"}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Weekly summary */}
              <div style={cardStyle}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "12px" }}>
                  Weekly Summary
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {weeks.map(week => {
                    const dayAvails = week.days.map(d => {
                      const avail = leads.filter(l => (crewCapacity[`${l}|${d}`] || "available") === "available").length;
                      return avail;
                    });
                    const avgAvail = dayAvails.reduce((s, v) => s + v, 0) / dayAvails.length;
                    const onJob = leads.filter(l =>
                      week.days.some(d => (crewCapacity[`${l}|${d}`] || "available") === "on-job")
                    ).length;

                    return (
                      <div key={week.offset} style={{ textAlign: "center", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                        <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", marginBottom: "6px" }}>{week.label}</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: COLORS.goldLight }}>{avgAvail.toFixed(1)}</div>
                        <div style={{ fontSize: "10px", color: COLORS.muted }}>avg leads/day</div>
                        <div style={{ fontSize: "11px", color: COLORS.gold, marginTop: "4px" }}>{onJob} on jobs</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (() => {
          const filteredHistory = history.filter(j => {
            const d = j.dateCompleted || j.date || "";
            const dateVal = d.includes("-") ? d : (() => {
              const p = new Date(d);
              return isNaN(p.getTime()) ? "" : p.toISOString().slice(0, 10);
            })();
            if (filterFrom && dateVal < filterFrom) return false;
            if (filterTo && dateVal > filterTo) return false;
            return true;
          });
          const isFiltered = filterFrom || filterTo;

          return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>Job History</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: COLORS.muted }}>
                  {isFiltered ? `${filteredHistory.length} of ${history.length}` : history.length} jobs
                </span>
                <label style={{
                  fontSize: "11px", fontWeight: 600, color: COLORS.goldLight,
                  background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`,
                  borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
                }}>
                  Import CSV
                  <input type="file" accept=".csv" onChange={handleImportCsv}
                    style={{ display: "none" }} />
                </label>
                {history.length > 0 && (
                  <button onClick={() => exportHistoryCsv(filteredHistory)} style={{
                    fontSize: "11px", fontWeight: 600, color: COLORS.goldLight,
                    background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`,
                    borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
                  }}>
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {importMsg && (
              <div style={{
                fontSize: "12px", color: COLORS.green, background: COLORS.green + "18",
                border: `1px solid ${COLORS.green}33`, borderRadius: "8px",
                padding: "8px 14px", marginBottom: "12px",
              }}>{importMsg}</div>
            )}

            {/* Date filter */}
            {history.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                marginBottom: "16px", flexWrap: "wrap",
              }}>
                <span style={{ fontSize: "11px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="date" value={filterFrom}
                    onChange={e => setFilterFrom(e.target.value)}
                    style={{ ...editInputStyle, width: "140px", padding: "4px 8px" }}
                  />
                  <span style={{ fontSize: "11px", color: COLORS.muted }}>to</span>
                  <input
                    type="date" value={filterTo}
                    onChange={e => setFilterTo(e.target.value)}
                    style={{ ...editInputStyle, width: "140px", padding: "4px 8px" }}
                  />
                </div>
                {isFiltered && (
                  <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} style={{
                    fontSize: "11px", color: COLORS.muted, background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px",
                    padding: "4px 10px", cursor: "pointer",
                  }}>Clear</button>
                )}
              </div>
            )}

            {history.length === 0 && (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                color: COLORS.muted, fontSize: "14px",
              }}>
                No jobs saved yet. Calculate a job and hit Save.
              </div>
            )}

            {/* Summary row - uses filtered data */}
            {filteredHistory.length > 0 && (() => {
              const withGP = filteredHistory.filter(j => j.revenue > 0);
              const totalRev = withGP.reduce((s, j) => s + j.revenue + (j.changeOrderRev || 0), 0);
              const totalGP = withGP.reduce((s, j) => s + j.gpDollar, 0);
              const avgGP = totalRev > 0 ? totalGP / totalRev : 0;
              return (
                <div style={{
                  ...cardStyle,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginBottom: "20px",
                }}>
                  {[
                    ["Total Revenue", fmt$(totalRev)],
                    ["Total Est. GP", fmt$(totalGP)],
                    ["Avg GP %", fmtPct(avgGP)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: COLORS.goldLight, marginTop: "4px" }}>{v}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 90px 90px 80px 28px 28px",
              gap: "8px",
              padding: "0 16px 8px",
            }}>
              {["Client", "Revenue", "Labor", "Est. GP", "GP %", "", ""].map((h, i) => (
                <div key={h + i} style={{ fontSize: "10px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h === "Client" ? "left" : "right" }}>{h}</div>
              ))}
            </div>

            {filteredHistory.length === 0 && history.length > 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: COLORS.muted, fontSize: "13px" }}>
                No jobs match the selected date range.
              </div>
            )}

            {filteredHistory.map(job => (
              <HistoryRow key={job.id} job={job} onDelete={handleDelete} onUpdate={handleUpdateJob} paintCatalog={fullPaintCatalog} teamLeadList={teamLeadList} />
            ))}
          </>
          );
        })()}
      </div>
    </div>
  );
}
