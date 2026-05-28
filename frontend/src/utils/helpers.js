import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Receipt } from "../components/Receipt";
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

const buildReceiptHtml = (receiptData) => {
  const receiptMarkup = renderToStaticMarkup(createElement(Receipt, receiptData));

  return `<html><head><title>Happy Hour Receipt</title>
    <style>
      @page{margin:0 4mm}
      html,body{margin:0;padding:0;background:#fff}
      body{font-family:'Courier New',monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .print-shell{width:72.1mm;margin:0;padding:0;box-sizing:border-box}
      @media print{html,body{margin:0;padding:0} body{margin:0}}
    </style></head><body>
    <div class="print-shell">${receiptMarkup}</div>
    </body></html>`;
};

export const printReceipt = (receiptData) => {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(buildReceiptHtml(receiptData));
  w.document.close();
  w.focus();

  const waitForAssets = async () => {
    const images = Array.from(w.document.images || []);
    const imagePromises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    });

    const fontPromise = w.document.fonts?.ready ?? Promise.resolve();
    await Promise.all([fontPromise, ...imagePromises]);
  };

  void waitForAssets().then(() => {
    setTimeout(() => {
      w.print();
      w.close();
    }, 75);
  }).catch(() => {
    setTimeout(() => {
      w.print();
      w.close();
    }, 75);
  });
  return true;
};

export const createSaleSnapshot = ({ order = [], discount = "", serviceType = "Dining", note = "", amount = 0, method = "Payment", source = "pos", receiptEmail = "", stripeSessionId = "", paymentStatus = "paid" }) => {
  const subtotal = order.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountPercent = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discountAmount = subtotal * discountPercent / 100;
  const taxable = subtotal - discountAmount;
  const total = Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : taxable;
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
