import { useState, useEffect, useCallback } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const MENU = [
  { id:1,  name:"Crispy Calamari",   cat:"Starters",  price:890,  emoji:"🦑", tag:"" },
  { id:2,  name:"Bruschetta",        cat:"Starters",  price:650,  emoji:"🥖", tag:"Popular" },
  { id:3,  name:"Spring Rolls",      cat:"Starters",  price:750,  emoji:"🥢", tag:"" },
  { id:4,  name:"Chicken Wings",     cat:"Starters",  price:1100, emoji:"🍗", tag:"Hot" },
  { id:5,  name:"Garlic Bread",      cat:"Starters",  price:420,  emoji:"🫓", tag:"" },
  { id:6,  name:"Nachos Platter",    cat:"Starters",  price:980,  emoji:"🧀", tag:"" },
  { id:7,  name:"Grilled Salmon",    cat:"Mains",     price:2400, emoji:"🐟", tag:"Chef's Pick" },
  { id:8,  name:"Beef Burger",       cat:"Mains",     price:1650, emoji:"🍔", tag:"Popular" },
  { id:9,  name:"Pasta Carbonara",   cat:"Mains",     price:1400, emoji:"🍝", tag:"" },
  { id:10, name:"Chicken Tikka",     cat:"Mains",     price:1800, emoji:"🍛", tag:"" },
  { id:11, name:"Club Sandwich",     cat:"Mains",     price:1200, emoji:"🥪", tag:"" },
  { id:12, name:"Veggie Pizza",      cat:"Mains",     price:1550, emoji:"🍕", tag:"" },
  { id:13, name:"Mojito",            cat:"Drinks",    price:680,  emoji:"🍹", tag:"Popular" },
  { id:14, name:"Draft Beer",        cat:"Drinks",    price:550,  emoji:"🍺", tag:"" },
  { id:15, name:"Fresh Lime Soda",   cat:"Drinks",    price:320,  emoji:"🍋", tag:"" },
  { id:16, name:"Mango Lassi",       cat:"Drinks",    price:380,  emoji:"🥭", tag:"" },
  { id:17, name:"Cold Coffee",       cat:"Drinks",    price:450,  emoji:"☕", tag:"" },
  { id:18, name:"Watermelon Juice",  cat:"Drinks",    price:350,  emoji:"🍉", tag:"" },
  { id:19, name:"Chocolate Lava",    cat:"Desserts",  price:780,  emoji:"🍫", tag:"Popular" },
  { id:20, name:"Cheesecake",        cat:"Desserts",  price:720,  emoji:"🍰", tag:"" },
  { id:21, name:"Tiramisu",          cat:"Desserts",  price:850,  emoji:"🎂", tag:"" },
  { id:22, name:"Ice Cream Scoop",   cat:"Desserts",  price:380,  emoji:"🍨", tag:"" },
];
const CATEGORIES = ["All", ...new Set(MENU.map(i => i.cat))];
const fmt = (n) => `Rs. ${Number(n).toLocaleString("en", { minimumFractionDigits: 2 })}`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4242";
const ADMIN_PIN = "254010@";
const LEDGER_KEYS = {
  income: "happy-hour-income-ledger",
  expenses: "happy-hour-expense-ledger",
};
const todayKey = (value = new Date()) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const readLedger = (key) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const writeLedger = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in unsupported environments.
  }
};

const buildReceiptHtml = ({ order, discount, serviceType, note }) => {
  const sub = order.reduce((s, o) => s + o.price * o.qty, 0);
  const disc = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discAmt = sub * disc / 100;
  const taxable = sub - discAmt;
  const total = taxable * 1.1;

  return `<html><head><title>Happy Hour Receipt</title>
    <style>body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:20px}
    h2{color:#D4A017;font-size:18px}.r{display:flex;justify-content:space-between;margin:3px 0}
    hr{border:none;border-top:1px dashed #999;margin:8px 0}.total{font-weight:bold;font-size:15px}
    .center{text-align:center}@media print{body{margin:0}}</style></head><body>
    <div class="center"><h2>🍹 Happy Hour</h2><p>Fine Dining &amp; Bar</p></div><hr>
    ${order.map(o=>`<div class="r"><span>${o.name} x${o.qty}</span><span>Rs.${(o.price*o.qty).toLocaleString()}</span></div>`).join("")}
    <hr>
    ${disc>0?`<div class="r"><span>Discount(${disc}%)</span><span>-Rs.${discAmt.toLocaleString("en",{minimumFractionDigits:2})}</span></div>`:""}
    <div class="r"><span>Tax(10%)</span><span>Rs.${(taxable*0.1).toLocaleString("en",{minimumFractionDigits:2})}</span></div>
    <div class="r total"><span>TOTAL</span><span>Rs.${total.toLocaleString("en",{minimumFractionDigits:2})}</span></div>
    ${note ? `<div class="r"><span>Note</span><span>${note}</span></div>` : ""}
    <div class="r"><span>Order Type</span><span>${serviceType}</span></div>
    <hr><div class="center" style="font-size:10px">Thank you! Please come again 🍹</div>
    </body></html>`;
};

const printReceipt = (receiptData) => {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(buildReceiptHtml(receiptData));
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 300);
  return true;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const G = {
  gold:"#D4A017", goldLight:"#F0C040", dark:"#1A1108", dark2:"#241A0C",
  dark3:"#2E2010", panel:"#1E1609", card:"#2A1D0E",
  border:"rgba(212,160,23,0.18)", text:"#F5EDD6", muted:"#9A8060",
  success:"#4CAF80", danger:"#E05050",
};

const globalCss = `
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
`;

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, warn }) {
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:300,
      background: warn ? G.danger : G.success,
      color:"#fff", padding:"10px 18px", borderRadius:8,
      fontSize:13, fontWeight:500,
      animation:"toastIn 0.3s ease",
      pointerEvents:"none",
    }}>{msg}</div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
        display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{
        background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16,
        width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto",
        scrollbarWidth:"thin", scrollbarColor:`${G.dark3} transparent`,
      }}>
        <div style={{ padding:"20px 24px 16px", display:"flex", alignItems:"center",
          justifyContent:"space-between", borderBottom:`1px solid ${G.border}` }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:G.text }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:G.muted,
            fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function AdminPinModal({ open, onClose, onVerify, isSubmitting }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const submit = () => {
    const ok = onVerify(pin);
    if (!ok) {
      setError("Incorrect PIN. Please try again.");
      return;
    }
    setError("");
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pin]);

  return (
    <Modal open={open} onClose={onClose} title="Admin Access">
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <p style={{ color:G.muted, fontSize:13 }}>Enter PIN to open the Admin Dashboard.</p>
        <input
          className="form-input"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter admin PIN"
          style={{ width:"100%", padding:"11px 14px", background:G.card,
            border:`1px solid ${G.border}`, color:G.text, borderRadius:8,
            fontSize:14, fontFamily:"'DM Sans',sans-serif", transition:"border 0.2s" }}
        />
        {error && <div style={{ color:G.danger, fontSize:12 }}>{error}</div>}
        <button
          onClick={submit}
          disabled={isSubmitting}
          style={{
            width:"100%", padding:12,
            background:`linear-gradient(135deg,${G.gold},#B8880E)`, color:G.dark,
            border:"none", borderRadius:10, fontSize:14, fontWeight:700,
            cursor:isSubmitting ? "not-allowed" : "pointer", opacity:isSubmitting ? 0.7 : 1,
            fontFamily:"'DM Sans',sans-serif",
          }}
        >
          {isSubmitting ? "Checking..." : "Unlock Admin"}
        </button>
      </div>
    </Modal>
  );
}

// ─── RECEIPT VIEW ─────────────────────────────────────────────────────────────
function Receipt({ order, discount, serviceType, note }) {
  const now = new Date();
  const sub = order.reduce((s,o) => s + o.price * o.qty, 0);
  const disc = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discAmt = sub * disc / 100;
  const taxable = sub - discAmt;
  const tax = taxable * 0.1;
  const total = taxable + tax;
  const orderId = "HH-" + Math.floor(Math.random() * 9000 + 1000);

  return (
    <div style={{ background:"#fff", color:"#1A1108", borderRadius:8, padding:20,
      fontFamily:"'Courier New',monospace", fontSize:12 }}>
      <div style={{ textAlign:"center", marginBottom:12 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.gold }}>🍹 Happy Hour</div>
        <div style={{ fontSize:10, color:"#666" }}>Fine Dining &amp; Bar</div>
        <div style={{ fontSize:10, color:"#666" }}>Tel: +94 11 234 5678 | happyhour.lk</div>
      </div>
      <hr style={{ border:"none", borderTop:"1px dashed #ccc", margin:"8px 0" }} />
      {[["Order #", orderId], ["Order Type", serviceType],
        ["Date", now.toLocaleDateString("en-GB")],
        ["Time", now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})],
        ...(note ? [["Note", note]] : [])
      ].map(([k,v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
          <span>{k}</span><span>{v}</span>
        </div>
      ))}
      <hr style={{ border:"none", borderTop:"1px dashed #ccc", margin:"8px 0" }} />
      <div style={{ fontWeight:"bold", marginBottom:6 }}>ITEMS</div>
      {order.map(o => (
        <div key={o.id} style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
          <span>{o.name} x{o.qty}</span>
          <span>Rs. {(o.price*o.qty).toLocaleString()}</span>
        </div>
      ))}
      <hr style={{ border:"none", borderTop:"1px dashed #ccc", margin:"8px 0" }} />
      <div style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
        <span>Subtotal</span><span>{fmt(sub)}</span>
      </div>
      {disc > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
          <span>Discount ({disc}%)</span><span>-{fmt(discAmt)}</span>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
        <span>Tax (10%)</span><span>{fmt(tax)}</span>
      </div>
      <hr style={{ border:"none", borderTop:"1px dashed #ccc", margin:"8px 0" }} />
      <div style={{ display:"flex", justifyContent:"space-between", fontWeight:"bold", fontSize:14 }}>
        <span>TOTAL</span><span>{fmt(total)}</span>
      </div>
      <hr style={{ border:"none", borderTop:"1px dashed #ccc", margin:"8px 0" }} />
      <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:"#888" }}>
        Thank you for dining with us!<br/>Please visit again 🍹<br/>*All prices inclusive of service charge*
      </div>
    </div>
  );
}

// ─── CARD MODAL ───────────────────────────────────────────────────────────────
function CardModal({ open, onClose, total, onStartCheckout, isProcessing }) {
  const [receiptEmail, setReceiptEmail] = useState("");

  const close = () => {
    setReceiptEmail("");
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Enter" && !isProcessing) {
        e.preventDefault();
        onStartCheckout(receiptEmail);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, receiptEmail, isProcessing]);

  return (
    <Modal open={open} onClose={close} title="Card Payment">
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ textAlign:"center", padding:14, background:G.card,
          border:`1px solid ${G.border}`, borderRadius:10 }}>
          <div style={{ fontSize:12, color:G.muted }}>Amount to Pay</div>
          <div style={{ fontSize:28, fontWeight:700, color:G.gold,
            fontFamily:"'Playfair Display',serif" }}>{fmt(total)}</div>
        </div>

        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:10, padding:12 }}>
          <div style={{ fontSize:12, color:G.muted, marginBottom:8 }}>Secure Checkout</div>
          <div style={{ fontSize:13, color:G.text, lineHeight:1.45 }}>
            Card payments are processed through Stripe Checkout.
            You will be redirected to a secure card payment page and then returned automatically.
          </div>
        </div>

        <div>
          <label style={{ fontSize:12, color:G.muted, display:"block", marginBottom:4 }}>Receipt Email (optional)</label>
          <input
            className="form-input"
            type="email"
            value={receiptEmail}
            onChange={e => setReceiptEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width:"100%", padding:"11px 14px", background:G.card,
              border:`1px solid ${G.border}`, color:G.text, borderRadius:8,
              fontSize:14, fontFamily:"'DM Sans',sans-serif", transition:"border 0.2s" }}
          />
        </div>

        <button
          onClick={() => onStartCheckout(receiptEmail)}
          disabled={isProcessing}
          style={{
            width:"100%", padding:14,
            background:"linear-gradient(135deg,#2060C0,#1840A0)",
            color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700,
            cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.7 : 1,
            fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}
        >
          {isProcessing ? "Processing..." : `💳 Pay ${fmt(total)}`}
        </button>
      </div>
    </Modal>
  );
}

// ─── CASH MODAL ───────────────────────────────────────────────────────────────
function CashModal({ open, onClose, total, onSuccess }) {
  const [received, setReceived] = useState("");
  const [success, setSuccess] = useState(false);
  const change = (parseFloat(received) || 0) - total;

  const confirm = () => {
    if ((parseFloat(received) || 0) < total) return;
    setSuccess(true);
    onSuccess({ amount: total, method: "Cash" });
  };
  const close = () => { setReceived(""); setSuccess(false); onClose(); };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (success) {
          close();
        } else {
          confirm();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, received, total, success]);

  return (
    <Modal open={open} onClose={close} title="Cash Payment">
      {success ? (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ width:70, height:70, background:G.success, borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:32,
            margin:"0 auto 14px", animation:"popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}>✓</div>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:G.text, marginBottom:6 }}>Payment Complete!</h3>
          <p style={{ color:G.muted, fontSize:13 }}>Received: {fmt(parseFloat(received))}</p>
          <p style={{ color:G.success, fontSize:15, fontWeight:700, marginTop:6 }}>Change: {fmt(Math.max(0,change))}</p>
          <button onClick={close} style={{ width:"100%", padding:13, background:G.success,
            color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:600,
            cursor:"pointer", marginTop:16, fontFamily:"'DM Sans',sans-serif" }}>Done &amp; New Order</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ textAlign:"center", padding:14, background:G.card,
            border:`1px solid ${G.border}`, borderRadius:10 }}>
            <div style={{ fontSize:12, color:G.muted }}>Amount Due</div>
            <div style={{ fontSize:28, fontWeight:700, color:G.gold,
              fontFamily:"'Playfair Display',serif" }}>{fmt(total)}</div>
          </div>
          <div>
            <label style={{ fontSize:12, color:G.muted, display:"block", marginBottom:4 }}>Cash Received</label>
            <input className="form-input" type="number" value={received}
              onChange={e=>setReceived(e.target.value)} placeholder="Enter amount"
              style={{ width:"100%", padding:"11px 14px", background:G.card,
                border:`1px solid ${G.border}`, color:G.text, borderRadius:8,
                fontSize:14, fontFamily:"'DM Sans',sans-serif", transition:"border 0.2s" }} />
          </div>
          {received && parseFloat(received) > 0 && (
            <div style={{ padding:12, background:G.card, border:`1px solid ${G.border}`,
              borderRadius:8, textAlign:"center" }}>
              <div style={{ fontSize:12, color:G.muted }}>Change</div>
              <div style={{ fontSize:24, fontWeight:700,
                color: change >= 0 ? G.success : G.danger,
                fontFamily:"'Playfair Display',serif" }}>{fmt(Math.max(0,change))}</div>
              {change < 0 && <div style={{ fontSize:11, color:G.danger, marginTop:4 }}>⚠️ Insufficient amount</div>}
            </div>
          )}
          <button onClick={confirm}
            disabled={(parseFloat(received)||0) < total}
            style={{ width:"100%", padding:13,
              background: (parseFloat(received)||0) >= total
                ? `linear-gradient(135deg,${G.gold},#B8880E)` : G.dark3,
              color: (parseFloat(received)||0) >= total ? G.dark : G.muted,
              border:"none", borderRadius:10, fontSize:15, fontWeight:700,
              cursor: (parseFloat(received)||0) >= total ? "pointer" : "not-allowed",
              fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}>
            💵 Confirm Payment
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── BILL MODAL ───────────────────────────────────────────────────────────────
function BillModal({ open, onClose, order, discount, serviceType, note }) {
  const printBill = () => {
    printReceipt({ order, discount, serviceType, note });
  };

  return (
    <Modal open={open} onClose={onClose} title="Print Bill">
      <Receipt order={order} discount={discount} serviceType={serviceType} note={note} />
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={printBill} style={{
          flex:1, padding:12, background:`linear-gradient(135deg,${G.gold},#B8880E)`,
          color:G.dark, border:"none", borderRadius:8, fontSize:14, fontWeight:700,
          cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>🖨️ Print Receipt</button>
        <button onClick={onClose} style={{
          flex:1, padding:12, background:G.dark3, border:`1px solid ${G.border}`,
          color:G.muted, borderRadius:8, fontSize:14, cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif" }}>Close</button>
      </div>
    </Modal>
  );
}

function OrderTypeModal({ open, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Order Type">
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ color:G.muted, fontSize:13 }}>Select order type before continuing payment.</div>
        <button onClick={() => onConfirm("Dining")} style={{
          width:"100%", padding:12, borderRadius:10, border:`1px solid ${G.border}`,
          background:G.card, color:G.text, cursor:"pointer", fontWeight:700,
          fontFamily:"'DM Sans',sans-serif"
        }}>
          Dining
        </button>
        <button onClick={() => onConfirm("Takeaway")} style={{
          width:"100%", padding:12, borderRadius:10, border:`1px solid ${G.border}`,
          background:G.card, color:G.text, cursor:"pointer", fontWeight:700,
          fontFamily:"'DM Sans',sans-serif"
        }}>
          Takeaway
        </button>
        <div style={{ color:G.muted, fontSize:12 }}>Shortcut: Enter selects Dining, Esc cancels.</div>
      </div>
    </Modal>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ incomeEntries, expenseEntries, pendingOrderAmount, onAddExpense, onBack }) {
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const today = todayKey();
  const todaysIncome = incomeEntries.filter(entry => entry.date === today);
  const todaysExpenses = expenseEntries.filter(entry => entry.date === today);
  const incomeTotal = todaysIncome.reduce((sum, entry) => sum + entry.amount, 0);
  const liveSalesTotal = incomeTotal + pendingOrderAmount;
  const expenseTotal = todaysExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const grossProfit = liveSalesTotal;
  const netProfit = grossProfit - expenseTotal;

  const submitExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseLabel.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAddExpense({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: expenseLabel.trim(),
      amount,
      date: today,
      createdAt: new Date().toISOString(),
    });
    setExpenseLabel("");
    setExpenseAmount("");
  };

  return (
    <div style={{ padding:24, height:"calc(100vh - 58px)", overflowY:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:G.gold }}>Admin Dashboard</div>
          <div style={{ color:G.muted, fontSize:13 }}>Track today&apos;s income, expenses, and net profit in one place.</div>
        </div>
        <button onClick={onBack} style={{
          padding:"10px 14px", borderRadius:10, border:`1px solid ${G.border}`,
          background:G.dark3, color:G.text, cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
        }}>
          Back to POS
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:14, marginBottom:18 }}>
        {[
          { label:"POS Sales (Live)", value: liveSalesTotal, accent: G.success },
          { label:"Today\'s Expenses", value: expenseTotal, accent: G.danger },
          { label:"Gross Profit", value: grossProfit, accent: G.gold },
        ].map(card => (
          <div key={card.label} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ color:G.muted, fontSize:12, marginBottom:8 }}>{card.label}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:card.accent }}>{fmt(card.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap:16 }}>
        <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:G.text }}>POS orders revenue</div>
              <div style={{ color:G.muted, fontSize:12 }}>
                {todaysIncome.length} payment{todaysIncome.length === 1 ? "" : "s"} recorded today
                {pendingOrderAmount > 0 ? " + in-progress order" : ""}
              </div>
            </div>
            <div style={{ color:G.gold, fontWeight:700 }}>{fmt(liveSalesTotal)}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {todaysIncome.length === 0 ? (
              <div style={{ color:G.muted, fontSize:13, padding:"16px 0" }}>No income recorded for today yet.</div>
            ) : todaysIncome.map(entry => (
              <div key={entry.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:"12px 14px" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{entry.method}</div>
                  <div style={{ fontSize:11, color:G.muted }}>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}</div>
                </div>
                <div style={{ color:G.success, fontWeight:700 }}>{fmt(entry.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Add expense</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input value={expenseLabel} onChange={e => setExpenseLabel(e.target.value)} placeholder="Expense label"
                style={{ width:"100%", padding:"11px 12px", background:G.card, border:`1px solid ${G.border}`, color:G.text, borderRadius:10, outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
              <input value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Amount"
                style={{ width:"100%", padding:"11px 12px", background:G.card, border:`1px solid ${G.border}`, color:G.text, borderRadius:10, outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
              <button onClick={submitExpense} style={{
                width:"100%", padding:"12px 14px", border:"none", borderRadius:10,
                background:"linear-gradient(135deg,#E05050,#B83A3A)", color:"#fff",
                fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
              }}>
                Record expense
              </button>
            </div>
          </div>

          <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Profit after expenses</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:10 }}>
              <span>Gross profit from POS</span>
              <span>{fmt(grossProfit)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:10 }}>
              <span>Total expenses</span>
              <span>-{fmt(expenseTotal)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700, color:G.text, paddingTop:10, borderTop:`1px solid ${G.border}` }}>
              <span>Net profit</span>
              <span style={{ color:G.gold }}>{fmt(netProfit)}</span>
            </div>
            <div style={{ fontSize:12, color:G.muted, marginTop:10 }}>Adding expenses updates the profit automatically.</div>
          </div>

          <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Today&apos;s expenses</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {todaysExpenses.length === 0 ? (
                <div style={{ color:G.muted, fontSize:13 }}>No expenses recorded for today yet.</div>
              ) : todaysExpenses.map(entry => (
                <div key={entry.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:"12px 14px" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{entry.label}</div>
                    <div style={{ fontSize:11, color:G.muted }}>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}</div>
                  </div>
                  <div style={{ color:G.danger, fontWeight:700 }}>-{fmt(entry.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HappyHourPOS() {
  const [order, setOrder] = useState([]);
  const [activeCat, setActiveCat] = useState("All");
  const [activeView, setActiveView] = useState("pos");
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("Dining");
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState("");
  const [modal, setModal] = useState(null); // 'bill' | 'card' | 'cash'
  const [pendingModalType, setPendingModalType] = useState(null);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [toast, setToast] = useState({ msg:"", warn:false });
  const [clock, setClock] = useState(new Date());
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPinChecking, setAdminPinChecking] = useState(false);
  const [cardCheckoutBusy, setCardCheckoutBusy] = useState(false);
  const [incomeEntries, setIncomeEntries] = useState(() => readLedger(LEDGER_KEYS.income));
  const [expenseEntries, setExpenseEntries] = useState(() => readLedger(LEDGER_KEYS.expenses));

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    writeLedger(LEDGER_KEYS.income, incomeEntries);
  }, [incomeEntries]);

  useEffect(() => {
    writeLedger(LEDGER_KEYS.expenses, expenseEntries);
  }, [expenseEntries]);

  const showToast = useCallback((msg, warn=false) => {
    setToast({ msg, warn });
    setTimeout(() => setToast({ msg:"", warn:false }), 2200);
  }, []);

  const addItem = (item) => {
    setOrder(prev => {
      const ex = prev.find(o => o.id === item.id);
      return ex ? prev.map(o => o.id===item.id ? {...o, qty:o.qty+1} : o)
                : [...prev, {...item, qty:1}];
    });
    showToast(`${item.emoji} ${item.name} added`);
  };

  const changeQty = (id, delta) => {
    setOrder(prev => {
      const updated = prev.map(o => o.id===id ? {...o, qty:o.qty+delta} : o);
      return updated.filter(o => o.qty > 0);
    });
  };

  const clearOrder = useCallback(() => {
    setOrder([]);
    setNote("");
    setDiscount("");
  }, []);

  const filtered = MENU.filter(i => {
    const catOk = activeCat === "All" || i.cat === activeCat;
    const searchOk = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const sub     = order.reduce((s,o) => s + o.price*o.qty, 0);
  const disc    = Math.min(100, Math.max(0, parseFloat(discount)||0));
  const discAmt = sub * disc / 100;
  const taxable = sub - discAmt;
  const tax     = taxable * 0.1;
  const total   = taxable + tax;
  const pendingOrderAmount = order.length > 0 && modal === null ? total : 0;

  const handlePaySuccess = useCallback(({ amount, method }) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      amount: Number(amount) || 0,
      method: method || "Payment",
      date: todayKey(),
      createdAt: new Date().toISOString(),
    };
    setIncomeEntries(prev => [entry, ...prev]);
    showToast(`✅ ${entry.method} payment recorded`);
  }, [showToast]);

  const handleCashPaySuccess = ({ amount, method }) => {
    handlePaySuccess({ amount, method });
    const didOpen = printReceipt({ order, discount, serviceType, note });
    if (!didOpen) {
      showToast("⚠️ Auto print blocked. Please allow popups.", true);
    }
  };

  const handlePayClose   = () => { setModal(null); clearOrder(); };

  const startCardCheckout = async (receiptEmail) => {
    if (total <= 0) {
      showToast("⚠️ No amount to charge", true);
      return;
    }

    try {
      setCardCheckoutBusy(true);
      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInCents: Math.round(total * 100),
          currency: "lkr",
          receiptEmail: receiptEmail || undefined,
          table: serviceType,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create checkout session");
      }

      const data = await response.json();
      if (!data?.url) {
        throw new Error("Checkout URL not received");
      }

      window.location.href = data.url;
    } catch {
      showToast("❌ Card checkout failed. Check payment server settings.", true);
      setCardCheckoutBusy(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const sessionId = params.get("session_id");

    if (paymentStatus !== "success" || !sessionId) return;

    const processedKey = `${LEDGER_KEYS.income}-processed-${sessionId}`;
    if (window.localStorage.getItem(processedKey)) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/checkout-session/${sessionId}`);
        if (!response.ok) {
          throw new Error("Unable to verify payment");
        }

        const session = await response.json();
        if (session.payment_status !== "paid") {
          throw new Error("Payment not completed");
        }

        handlePaySuccess({ amount: (session.amount_total || 0) / 100, method: "Card" });
        clearOrder();
        setModal(null);
        window.localStorage.setItem(processedKey, "1");
      } catch {
        showToast("❌ Could not verify card payment", true);
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    verifyPayment();
  }, [clearOrder, handlePaySuccess, showToast]);

  const handleAddExpense = (entry) => {
    setExpenseEntries(prev => [entry, ...prev]);
    showToast(`🧾 Expense recorded: ${entry.label}`);
  };

  const openModal = (type) => {
    if (order.length === 0) { showToast("⚠️ No items in order", true); return; }
    setPendingModalType(type);
    setShowOrderTypeModal(true);
  };

  const confirmOrderTypeAndContinue = (type) => {
    setServiceType(type);
    setShowOrderTypeModal(false);
    if (pendingModalType) {
      setModal(pendingModalType);
    }
    setPendingModalType(null);
  };

  useEffect(() => {
    if (!showOrderTypeModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmOrderTypeAndContinue("Dining");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowOrderTypeModal(false);
        setPendingModalType(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showOrderTypeModal, pendingModalType]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tagName = (e.target?.tagName || "").toLowerCase();
      const isEditable = tagName === "input" || tagName === "textarea" || tagName === "select" || e.target?.isContentEditable;

      if (showAdminPin) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowAdminPin(false);
        }
        return;
      }

      if (showOrderTypeModal) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowOrderTypeModal(false);
          setPendingModalType(null);
        }
        return;
      }

      if (modal) {
        if (e.key === "Escape") {
          e.preventDefault();
          handlePayClose();
        }
        return;
      }

      if (isEditable && !e.key.startsWith("F")) return;

      if (activeView === "pos") {
        if (e.key === "F2") {
          e.preventDefault();
          openModal("bill");
        }
        if (e.key === "F3") {
          e.preventDefault();
          openModal("card");
        }
        if (e.key === "F4") {
          e.preventDefault();
          openModal("cash");
        }
      }

      if (e.key === "F10") {
        e.preventDefault();
        requestAdminAccess("admin");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeView, modal, showAdminPin, showOrderTypeModal, handlePayClose]);

  const requestAdminAccess = (targetView) => {
    if (targetView !== "admin") {
      setActiveView(targetView);
      return;
    }
    setShowAdminPin(true);
  };

  const verifyAdminPin = (pin) => {
    setAdminPinChecking(true);
    const isValid = pin === ADMIN_PIN;
    if (isValid) {
      setShowAdminPin(false);
      setActiveView("admin");
      showToast("✅ Admin unlocked");
    }
    setAdminPinChecking(false);
    return isValid;
  };

  return (
    <>
      <style>{globalCss}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:G.dark, color:G.text,
        height:"100vh", overflow:"hidden",
        backgroundImage:`radial-gradient(ellipse at 20% 50%, rgba(212,160,23,0.04) 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 20%, rgba(212,160,23,0.03) 0%, transparent 50%)` }}>

        {/* HEADER */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px", height:58, background:G.dark2,
          borderBottom:`1px solid ${G.border}`, position:"relative", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:G.gold, borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🍹</div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
                color:G.gold, letterSpacing:0.5 }}>Happy Hour</div>
              <div style={{ fontSize:11, color:G.muted, letterSpacing:2, textTransform:"uppercase" }}>Point of Sale</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", background:G.dark3, border:`1px solid ${G.border}`, borderRadius:12, padding:4 }}>
              {[
                { id:"pos", label:"POS" },
                { id:"admin", label:"Admin" },
              ].map(view => (
                <button key={view.id} onClick={() => requestAdminAccess(view.id)} style={{
                  padding:"6px 12px", border:"none", borderRadius:8, cursor:"pointer",
                  background: activeView === view.id ? G.gold : "transparent",
                  color: activeView === view.id ? G.dark : G.muted,
                  fontWeight:700, fontFamily:"'DM Sans',sans-serif"
                }}>
                  {view.label}
                </button>
              ))}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:16, fontWeight:600, color:G.gold,
                fontFamily:"'Playfair Display',serif" }}>
                {clock.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
              </div>
              <div style={{ fontSize:11, color:G.muted }}>
                {clock.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
              </div>
            </div>
            <div style={{ background:G.dark3, border:`1px solid ${G.border}`, borderRadius:20,
              padding:"6px 14px", fontSize:12, color:G.muted }}>
              Cashier: <span style={{ color:G.text, fontWeight:500 }}>Manager</span>
            </div>
          </div>
        </header>

        {/* LAYOUT */}
        {activeView === "pos" ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", height:"calc(100vh - 58px)" }}>

          {/* LEFT PANEL */}
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* CATEGORIES */}
            <div style={{ display:"flex", gap:8, padding:"14px 20px", overflowX:"auto",
              background:G.panel, borderBottom:`1px solid ${G.border}`, scrollbarWidth:"none" }}>
              {CATEGORIES.map(c => (
                <button key={c} className="cat-btn" onClick={() => setActiveCat(c)}
                  style={{ flexShrink:0, padding:"8px 18px", borderRadius:20,
                    border:`1px solid ${activeCat===c ? G.gold : G.border}`,
                    background: activeCat===c ? G.gold : "transparent",
                    color: activeCat===c ? G.dark : G.muted,
                    fontSize:13, fontWeight: activeCat===c ? 600 : 500,
                    cursor:"pointer", transition:"all 0.2s",
                    fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
                  {c}
                </button>
              ))}
            </div>

            {/* SEARCH */}
            <div style={{ padding:"12px 20px", background:G.panel, borderBottom:`1px solid ${G.border}` }}>
              <input className="search-input" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search menu items…"
                style={{ width:"100%", padding:"9px 16px 9px 38px", borderRadius:8,
                  border:`1px solid ${G.border}`, background:G.card,
                  color:G.text, fontSize:13, fontFamily:"'DM Sans',sans-serif",
                  transition:"border 0.2s",
                  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239A8060' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
                  backgroundRepeat:"no-repeat", backgroundPosition:"12px center" }} />
            </div>

            {/* MENU GRID */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 20px",
              display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
              gap:12, alignContent:"start",
              scrollbarWidth:"thin", scrollbarColor:`${G.dark3} transparent` }}>
              {filtered.map(item => (
                <div key={item.id} className="menu-item" onClick={() => addItem(item)}
                  style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12,
                    padding:"14px 12px", cursor:"pointer", transition:"all 0.2s",
                    position:"relative", overflow:"hidden" }}>
                  {item.tag && (
                    <span style={{ position:"absolute", top:8, right:8, background:G.success,
                      color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px",
                      borderRadius:4, textTransform:"uppercase", letterSpacing:0.5 }}>{item.tag}</span>
                  )}
                  <span style={{ fontSize:28, marginBottom:8, display:"block" }}>{item.emoji}</span>
                  <div style={{ fontSize:13, fontWeight:500, color:G.text, lineHeight:1.3, marginBottom:4 }}>{item.name}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:G.gold }}>Rs. {item.price.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ background:G.dark2, borderLeft:`1px solid ${G.border}`,
            display:"flex", flexDirection:"column" }}>

            {/* ORDER HEADER */}
            <div style={{ padding:"16px 20px 12px", borderBottom:`1px solid ${G.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>Current Order</span>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ background:G.dark3, border:`1px solid ${G.border}`, color:G.text,
                  fontSize:12, padding:"5px 10px", borderRadius:6,
                  fontFamily:"'DM Sans',sans-serif" }}>
                  Type: {serviceType}
                </div>
                <button onClick={clearOrder}
                  style={{ background:"transparent", border:"1px solid rgba(224,80,80,0.3)",
                    color:G.danger, fontSize:11, padding:"4px 10px", borderRadius:6,
                    cursor:"pointer", transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif" }}>
                  Clear
                </button>
              </div>
            </div>

            {/* ORDER ITEMS */}
            <div style={{ flex:1, overflowY:"auto", padding:"12px 16px",
              scrollbarWidth:"thin", scrollbarColor:`${G.dark3} transparent` }}>
              {order.length === 0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", height:"100%", gap:10, color:G.muted }}>
                  <div style={{ fontSize:40, opacity:0.4 }}>🛒</div>
                  <div style={{ fontSize:13 }}>No items added yet</div>
                </div>
              ) : order.map(o => (
                <div key={o.id} className="order-item"
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                    background:G.card, border:`1px solid ${G.border}`, borderRadius:10,
                    marginBottom:8 }}>
                  <span style={{ fontSize:18 }}>{o.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{o.name}</div>
                    <div style={{ fontSize:12, color:G.muted }}>Rs. {(o.price*o.qty).toLocaleString()}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <button className="qty-btn" onClick={() => changeQty(o.id,-1)}
                      style={{ width:22, height:22, borderRadius:"50%", border:`1px solid ${G.border}`,
                        background:G.dark3, color:G.text, fontSize:14, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        transition:"all 0.15s", lineHeight:1 }}>−</button>
                    <span style={{ fontSize:13, fontWeight:600, minWidth:18, textAlign:"center" }}>{o.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(o.id,1)}
                      style={{ width:22, height:22, borderRadius:"50%", border:`1px solid ${G.border}`,
                        background:G.dark3, color:G.text, fontSize:14, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        transition:"all 0.15s", lineHeight:1 }}>+</button>
                  </div>
                  <button className="remove-btn" onClick={() => changeQty(o.id,-o.qty)}
                    style={{ background:"transparent", border:"none", color:G.muted,
                      cursor:"pointer", fontSize:16, padding:2, transition:"color 0.15s" }}>🗑</button>
                </div>
              ))}
            </div>

            {/* SUMMARY */}
            <div style={{ padding:"14px 16px", borderTop:`1px solid ${G.border}`, background:G.panel }}>
              {[["Subtotal", fmt(sub)], ["Tax (10%)", fmt(tax)],
                ["Discount", `-${fmt(discAmt)}`]].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                  marginBottom:6, fontSize:13, color:G.muted }}><span>{k}</span><span>{v}</span></div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:17,
                fontWeight:700, color:G.text, marginTop:8, paddingTop:8,
                borderTop:`1px solid ${G.border}` }}>
                <span>Total</span>
                <span style={{ color:G.gold, fontFamily:"'Playfair Display',serif" }}>{fmt(total)}</span>
              </div>
            </div>

            {/* NOTE + DISCOUNT */}
            <div style={{ display:"flex", gap:8, padding:"0 16px 12px" }}>
              <input value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Order note…"
                style={{ flex:1, background:G.card, border:`1px solid ${G.border}`,
                  color:G.text, fontSize:12, padding:"7px 10px", borderRadius:8,
                  outline:"none", fontFamily:"'DM Sans',sans-serif", transition:"border 0.2s" }} />
              <input value={discount} onChange={e=>setDiscount(e.target.value)}
                type="number" min="0" max="100" placeholder="Disc %"
                style={{ width:80, background:G.card, border:`1px solid ${G.border}`,
                  color:G.text, fontSize:12, padding:"7px 10px", borderRadius:8,
                  outline:"none", fontFamily:"'DM Sans',sans-serif", transition:"border 0.2s" }} />
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display:"flex", gap:10, padding:"0 16px 16px" }}>
              <button onClick={() => openModal("bill")}
                style={{ flex:1, padding:"13px 8px", borderRadius:10,
                  background:G.dark3, border:`1px solid ${G.border}`, color:G.muted,
                  fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s",
                  fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:6 }}>🖨️ Bill (F2)</button>
              <button onClick={() => openModal("card")}
                style={{ flex:1, padding:"13px 8px", borderRadius:10,
                  background:"linear-gradient(135deg,#2060C0,#1840A0)",
                  border:"none", color:"#fff", fontSize:13, fontWeight:600,
                  cursor:"pointer", transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>💳 Card (F3)</button>
              <button onClick={() => openModal("cash")}
                style={{ flex:1, padding:"13px 8px", borderRadius:10,
                  background:`linear-gradient(135deg,${G.gold},#B8880E)`,
                  border:"none", color:G.dark, fontSize:13, fontWeight:600,
                  cursor:"pointer", transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>💵 Cash (F4)</button>
            </div>
          </div>
        </div>
        ) : (
          <AdminDashboard
            incomeEntries={incomeEntries}
            expenseEntries={expenseEntries}
            pendingOrderAmount={pendingOrderAmount}
            onAddExpense={handleAddExpense}
            onBack={() => setActiveView("pos")}
          />
        )}

        {/* MODALS */}
        <BillModal open={modal==="bill"} onClose={() => setModal(null)}
          order={order} discount={discount} serviceType={serviceType} note={note} />
        <CardModal
          open={modal==="card"}
          total={total}
          onStartCheckout={startCardCheckout}
          onClose={handlePayClose}
          isProcessing={cardCheckoutBusy}
        />
        <CashModal open={modal==="cash"}
          total={total} onSuccess={handleCashPaySuccess}
          onClose={handlePayClose} />
        <OrderTypeModal
          open={showOrderTypeModal}
          onClose={() => { setShowOrderTypeModal(false); setPendingModalType(null); }}
          onConfirm={confirmOrderTypeAndContinue}
        />
        <AdminPinModal
          open={showAdminPin}
          onClose={() => setShowAdminPin(false)}
          onVerify={verifyAdminPin}
          isSubmitting={adminPinChecking}
        />

        {/* TOAST */}
        <Toast msg={toast.msg} warn={toast.warn} />
      </div>
    </>
  );
}