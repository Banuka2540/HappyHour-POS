import { SALE_DRAFT_KEY } from "./constants";

export const fmt = (n) => `Rs. ${Number(n).toLocaleString("en", { minimumFractionDigits: 2 })}`;

export const todayKey = (value = new Date()) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const readLedger = (key) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const writeLedger = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in unsupported environments.
  }
};

export const buildReceiptHtml = ({ order, discount, serviceType, note }) => {
  const sub = order.reduce((s, o) => s + o.price * o.qty, 0);
  const disc = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discAmt = sub * disc / 100;
  const taxable = sub - discAmt;
  const total = taxable * 1.1;

  return `<html><head><title>Happy Hour Receipt</title>
    <style>
      body{font-family:'Courier New',monospace;font-size:12px;width:72.1mm;margin:0;padding:0}
      .receipt{width:72.1mm;margin:0;padding:0 4px 6px;box-sizing:border-box;font-weight:700;color:#000000}
      h2{color:#000000;font-size:18px;margin:0;padding-top:0}
      .r{display:flex;justify-content:space-between;margin:3px 0;color:#000000}
      hr{border:none;border-top:1px dashed #000000;margin:6px 0}
      .total{font-weight:700;font-size:15px}
      .center{text-align:center;color:#000000}
      @media print{body{margin:0} .receipt{font-weight:700}}
    </style></head><body>
    <div class="receipt">
      <div class="center"><h2>🍹 Happy Hour</h2>
        <div>Restaurant &amp; Cafe</div>
        <div>417, Peradeniya Road, Kandy</div>
        <div>0774451516</div>
      </div>
      <hr>
    ${order.map(o=>`<div class="r"><span>${o.name} x${o.qty}</span><span>Rs.${(o.price*o.qty).toLocaleString()}</span></div>`).join("")}
    <hr>
    ${disc>0?`<div class="r"><span>Discount(${disc}%)</span><span>-Rs.${discAmt.toLocaleString("en",{minimumFractionDigits:2})}</span></div>`:``}
    <div class="r"><span>Tax(10%)</span><span>Rs.${(taxable*0.1).toLocaleString("en",{minimumFractionDigits:2})}</span></div>
    <div class="r total"><span>TOTAL</span><span>Rs.${total.toLocaleString("en",{minimumFractionDigits:2})}</span></div>
    ${note ? `<div class="r"><span>Note</span><span>${note}</span></div>` : ""}
    <div class="r"><span>Order Type</span><span>${serviceType}</span></div>
    <hr><div class="center" style="font-size:10px">Thank you! Please come again 🍹</div>

    <!-- QR Code -->
    <div class="center" style="margin-top:8px">
      <img src="/1.png" alt="QR" style="width:90px;height:90px;display:block;margin:0 auto" />
      <div style="margin-top:6px;font-size:11px;font-weight:700;color:#000000">Visit our website</div>
    </div>

    </body></html>`;
};

export const printReceipt = (receiptData) => {
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

export const createSaleSnapshot = ({ order = [], discount = "", serviceType = "Dining", note = "", amount = 0, method = "Payment", source = "pos", receiptEmail = "", stripeSessionId = "", paymentStatus = "paid" }) => {
  const subtotal = order.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountPercent = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discountAmount = subtotal * discountPercent / 100;
  const taxable = subtotal - discountAmount;
  const tax = taxable * 0.1;
  const total = Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : taxable + tax;
  const saleDate = todayKey();

  return {
    saleId: `sale-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    saleDate,
    timestamp: new Date().toISOString(),
    paymentMethod: method || "Payment",
    orderType: serviceType || "Dining",
    items: order.map(item => `${item.name} x${item.qty}`).join(" | "),
    itemsJson: order,
    subtotal,
    discountPercent,
    discountAmount,
    tax,
    total,
    note: note || "",
    source,
    stripeSessionId,
    paymentStatus,
    receiptEmail,
  };
};

export const readSaleDraft = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SALE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeSaleDraft = (sale) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SALE_DRAFT_KEY, JSON.stringify(sale));
  } catch {
    // Ignore storage failures in unsupported environments.
  }
};

export const clearSaleDraft = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SALE_DRAFT_KEY);
  } catch {
    // Ignore storage failures in unsupported environments.
  }
};
