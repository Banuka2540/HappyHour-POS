import { useState, useEffect, useCallback } from "react";

import { MENU, CATEGORIES } from "./data/menu";
import { G, globalCss, API_BASE_URL, ORDER_API_BASE_URL, ADMIN_PIN, LEDGER_KEYS } from "./utils/constants";
import { fmt, todayKey, readLedger, writeLedger, createSaleSnapshot, readSaleDraft, writeSaleDraft, clearSaleDraft, printReceipt } from "./utils/helpers";

import { Toast } from "./components/Toast";
import { AdminPinModal, CardModal, CashModal, BillModal, OrderTypeModal } from "./components/Modals";
import { AdminDashboard } from "./components/AdminDashboard";

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

  // UI sizing: make menu items larger when viewing the full "All" section
  const itemMin = activeCat === "All" ? 220 : 140;
  const itemNameSize = activeCat === "All" ? 16 : 13;
  const itemPriceSize = activeCat === "All" ? 16 : 14;
  const itemEmojiSize = activeCat === "All" ? 36 : 28;

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

  const submitSaleToGoogleSheet = useCallback(async (sale) => {
    try {
      const response = await fetch(`${ORDER_API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorBody = await response.json();
          detail = errorBody?.detail || errorBody?.error || "";
        } catch {
          // Ignore JSON parsing errors from non-JSON error responses.
        }
        throw new Error(detail || "Unable to submit order");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Sheet sync failed";
      console.error("Google Sheet sync failed:", message);
      showToast("⚠️ Payment saved, but Google Sheet sync failed", true);
    }
  }, [showToast]);

  const handlePaySuccess = useCallback(({ amount, method, saleDetails }) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      amount: Number(amount) || 0,
      method: method || "Payment",
      date: todayKey(),
      createdAt: new Date().toISOString(),
    };
    setIncomeEntries(prev => [entry, ...prev]);
    void submitSaleToGoogleSheet({
      ...(saleDetails || {}),
      saleId: saleDetails?.saleId || entry.id,
      saleDate: saleDetails?.saleDate || todayKey(),
      timestamp: saleDetails?.timestamp || entry.createdAt,
      paymentMethod: method || saleDetails?.paymentMethod || "Payment",
      total: Number(amount) || saleDetails?.total || 0,
    });
    showToast(`✅ ${entry.method} payment recorded`);
  }, [submitSaleToGoogleSheet, showToast]);

  const handleCashPaySuccess = ({ amount, method }) => {
    const saleDetails = createSaleSnapshot({
      order,
      discount,
      serviceType,
      note,
      amount,
      method,
      source: "cash",
    });
    handlePaySuccess({ amount, method, saleDetails });
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

      writeSaleDraft(createSaleSnapshot({
        order,
        discount,
        serviceType,
        note,
        amount: total,
        method: "Card",
        source: "card",
        receiptEmail: receiptEmail || "",
      }));

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

        const draft = readSaleDraft();
        const amount = (session.amount_total || 0) / 100;
        const saleDetails = draft || createSaleSnapshot({
          amount,
          method: "Card",
          source: "card",
          serviceType,
        });

        clearSaleDraft();
        handlePaySuccess({ amount, method: "Card", saleDetails: {
          ...saleDetails,
          amount,
          total: amount,
          paymentStatus: session.payment_status,
          stripeSessionId: session.id,
        } });
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
  }, [clearOrder, handlePaySuccess, serviceType, showToast]);

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
        <div style={{ display:"grid", gridTemplateColumns:"200px 1fr 360px", height:"calc(100vh - 58px)" }}>

          {/* SECTIONS / LEFT COLUMN */}
          <div style={{ display:"flex", flexDirection:"column", overflowY:"auto", background:G.panel, borderRight:`1px solid ${G.border}`, padding:"12px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:G.muted, marginBottom:8 }}>Sections</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {CATEGORIES.map(c => (
                <button key={c} className="cat-btn" onClick={() => setActiveCat(c)}
                  style={{ textAlign:"left", padding:"10px 12px", borderRadius:8,
                    border:`1px solid ${activeCat===c ? G.gold : G.border}`,
                    background: activeCat===c ? G.gold : "transparent",
                    color: activeCat===c ? G.dark : G.muted,
                    fontSize:13, fontWeight: activeCat===c ? 700 : 500,
                    cursor:"pointer", transition:"all 0.2s",
                    fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN MENU COLUMN */}
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

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
              display:"grid", gridTemplateColumns:`repeat(auto-fill,minmax(${itemMin}px,1fr))`,
              gap:16, alignContent:"start",
              scrollbarWidth:"thin", scrollbarColor:`${G.dark3} transparent` }}>
              {filtered.map(item => (
                <div key={item.id} className="menu-item" onClick={() => addItem(item)}
                  style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12,
                    padding: activeCat === "All" ? "18px 16px" : "14px 12px", cursor:"pointer", transition:"all 0.2s",
                    position:"relative", overflow:"hidden" }}>
                  {item.tag && (
                    <span style={{ position:"absolute", top:8, right:8, background:G.success,
                      color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px",
                      borderRadius:4, textTransform:"uppercase", letterSpacing:0.5 }}>{item.tag}</span>
                  )}
                  <span style={{ fontSize:itemEmojiSize, marginBottom:8, display:"block" }}>{item.emoji}</span>
                  <div style={{ fontSize:itemNameSize, fontWeight:500, color:G.text, lineHeight:1.3, marginBottom:6 }}>{item.name}</div>
                  <div style={{ fontSize:itemPriceSize, fontWeight:700, color:G.gold }}>Rs. {item.price.toLocaleString()}</div>
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