import { useState, useEffect } from "react";
import { G } from "../utils/constants";
import { fmt, printReceipt } from "../utils/helpers";
import { Receipt } from "./Receipt";

export function Modal({ open, onClose, title, children }) {
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

export function AdminPinModal({ open, onClose, onVerify, isSubmitting }) {
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

export function CardModal({ open, onClose, total, onStartCheckout, isProcessing }) {
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

export function CashModal({ open, onClose, total, onSuccess }) {
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

export function BillModal({ open, onClose, order, discount, serviceType, note }) {
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

export function OrderTypeModal({ open, onClose, onConfirm }) {
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
