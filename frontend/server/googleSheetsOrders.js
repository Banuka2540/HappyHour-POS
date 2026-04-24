import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
import process from "node:process";

const ORDER_SHEET_TITLE = "Orders";
const ORDER_HEADERS = [
  "orderId",
  "saleId",
  "saleDate",
  "timestamp",
  "paymentMethod",
  "orderType",
  "items",
  "itemsJson",
  "subtotal",
  "discountPercent",
  "discountAmount",
  "tax",
  "total",
  "note",
  "source",
  "paymentStatus",
  "receiptEmail",
  "stripeSessionId",
];

const normalizePrivateKey = (value) => (value || "").replace(/\\n/g, "\n").replace(/^"|"$/g, "");

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

const buildSpreadsheet = () => {
  const sheetId = getRequiredEnv("GOOGLE_SHEET_ID");
  const serviceAccountEmail = getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = normalizePrivateKey(getRequiredEnv("GOOGLE_PRIVATE_KEY"));

  const auth = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return new GoogleSpreadsheet(sheetId, auth);
};

const formatItems = (items) => {
  if (typeof items === "string") {
    return items;
  }

  if (Array.isArray(items)) {
    return items
      .map((item) => {
        if (!item || typeof item !== "object") {
          return String(item);
        }
        const name = item.name || item.label || "Item";
        const qty = Number(item.qty || item.quantity || 1);
        return `${name} x${qty}`;
      })
      .join(" | ");
  }

  return "";
};

const formatItemsJson = (items) => {
  if (typeof items === "string") {
    return items;
  }

  try {
    return JSON.stringify(items || []);
  } catch {
    return "[]";
  }
};

const ensureOrderSheet = async (spreadsheet) => {
  await spreadsheet.loadInfo();

  let sheet = spreadsheet.sheetsByTitle[ORDER_SHEET_TITLE];
  if (!sheet) {
    sheet = await spreadsheet.addSheet({ title: ORDER_SHEET_TITLE, headerValues: ORDER_HEADERS });
    return sheet;
  }

  await sheet.loadHeaderRow().catch(() => null);
  if (!sheet.headerValues || sheet.headerValues.length === 0) {
    await sheet.setHeaderRow(ORDER_HEADERS);
  }

  return sheet;
};

const toOrderRow = (order = {}) => {
  const timestamp = order.timestamp || order.createdAt || new Date().toISOString();
  const saleDate = order.saleDate || timestamp.slice(0, 10);
  const saleId = order.saleId || order.orderId || order.id || `order-${Date.now()}`;

  return {
    orderId: saleId,
    saleId,
    saleDate,
    timestamp,
    paymentMethod: order.paymentMethod || order.method || "Payment",
    orderType: order.orderType || order.serviceType || "Dining",
    items: formatItems(order.items),
    itemsJson: formatItemsJson(order.itemsJson ?? order.items),
    subtotal: Number(order.subtotal || 0),
    discountPercent: Number(order.discountPercent || 0),
    discountAmount: Number(order.discountAmount || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || order.amount || 0),
    note: order.note || "",
    source: order.source || "pos",
    paymentStatus: order.paymentStatus || "paid",
    receiptEmail: order.receiptEmail || "",
    stripeSessionId: order.stripeSessionId || "",
  };
};

export const appendOrderToGoogleSheet = async (order) => {
  const spreadsheet = buildSpreadsheet();
  const sheet = await ensureOrderSheet(spreadsheet);
  const row = toOrderRow(order);
  const insertedRow = await sheet.addRow(row);

  return {
    row: insertedRow,
    rowData: row,
  };
};
