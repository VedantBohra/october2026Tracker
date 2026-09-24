// SETTINGS. Change anything here, save, and the site updates.
const CONFIG = {
  title: "Target Tracker",
  startDate: "2026-09-25",   // first day (YYYY-MM-DD)
  endDate: "2026-10-31",     // last day
  startBalance: 4600,        // balance at the START of the first day
  minTarget: 1200,           // minimum to add each day
  stretchTarget: 1500,       // the "even better" amount
  currency: "₹",
  locale: "en-IN",           // Indian digit grouping: 1,00,000
  theme: "ledger",           // ledger | slate | midnight | plum | ember
  accent: "",                // optional custom colour, e.g. "#d6336c"
  // Columns shown, in this order. Options:
  // day date open added close status progress plan note
  columns: ["day", "date", "open", "added", "close", "status", "progress", "plan", "note"]
};