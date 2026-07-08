export const G = {
  gold: "#D4A017", goldLight: "#F0C040", dark: "#1A1108", dark2: "#241A0C",
  dark3: "#2E2010", panel: "#1E1609", card: "#2A1D0E",
  border: "rgba(212,160,23,0.18)", text: "#F5EDD6", muted: "#9A8060",
  success: "#4CAF80", danger: "#E05050",
};

export const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',sans-serif; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:${G.dark3}; border-radius:4px; }
  @keyframes slideIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
  @keyframes popIn   { from { transform:scale(0); } to { transform:scale(1); } }
  @keyframes toastIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  .menu-item:hover { border-color:rgba(212,160,23,0.4) !important; transform:translateY(-1px); }
  .menu-item:active { transform:scale(0.97) !important; }
  .qty-btn:hover { background:${G.gold} !important; border-color:${G.gold} !important; color:${G.dark} !important; }
  .remove-btn:hover { color:${G.danger} !important; }
  .cat-btn:hover { border-color:${G.gold} !important; color:${G.gold} !important; }
  .search-input:focus { border-color:${G.gold} !important; outline:none; }
  .form-input:focus { border-color:${G.gold} !important; outline:none; }
  .order-item { animation: slideIn 0.2s ease; }
  .modal-overlay { backdrop-filter:blur(4px); }
  .kos-shell { min-height: 100vh; background:#120C06; color:${G.text}; padding:24px; }
  .kos-hero {
    display:flex; justify-content:space-between; align-items:center; gap:16px;
    margin-bottom:18px; padding:16px 18px; border-radius:18px;
    background:linear-gradient(135deg, rgba(212,160,23,0.18), rgba(36,26,12,0.96));
    border:1px solid ${G.border};
  }
  .kos-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
  .kos-stats { display:flex; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
  .kos-stat { background:${G.dark2}; border:1px solid ${G.border}; border-radius:14px; padding:14px 16px; }
  .kos-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px; }
  .kos-ticket { border-radius:18px; padding:18px; }
  .kos-ticket-head { display:grid; grid-template-columns:1.4fr 0.5fr 0.8fr; gap:10px; padding:8px 10px; border-bottom:1px solid ${G.border}; color:${G.muted}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; }
  .kos-ticket-row { display:grid; grid-template-columns:1.4fr 0.5fr 0.8fr; gap:10px; align-items:center; padding:10px 10px; background:${G.card}; border-radius:12px; border:1px solid ${G.border}; }
  @media (max-width: 768px) {
    .kos-shell { padding:14px; }
    .kos-hero { flex-direction:column; align-items:stretch; padding:14px; }
    .kos-actions { justify-content:stretch; }
    .kos-actions button { flex:1 1 100%; width:100%; }
    .kos-stats { flex-direction:column; }
    .kos-stat { width:100%; min-width:0 !important; }
    .kos-grid { grid-template-columns:1fr; }
    .kos-ticket { padding:14px; }
    .kos-ticket-head, .kos-ticket-row { grid-template-columns: 1fr 70px 92px; }
    .kos-ticket-head { font-size:11px; }
    .kos-ticket-row div { font-size:14px !important; }
  }
`;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4242";

const resolveOrderApiBaseUrl = () => {
  const configured = (import.meta.env.VITE_ORDER_API_BASE_URL || "").trim();

  // In production, never force requests to localhost; fall back to same-origin serverless routes.
  if (
    import.meta.env.PROD
    && configured
    && /^http:\/\/localhost(?::\d+)?$/i.test(configured)
  ) {
    return "";
  }

  return configured.replace(/\/+$/, "");
};

export const ORDER_API_BASE_URL = resolveOrderApiBaseUrl();
export const ADMIN_PIN = "254010@";
export const SALE_DRAFT_KEY = "happy-hour-pending-card-sale";
export const CUSTOM_MENU_KEY = "happy-hour-custom-menu-items";
export const LEDGER_KEYS = {
  income: "happy-hour-income-ledger",
  expenses: "happy-hour-expense-ledger",
};
