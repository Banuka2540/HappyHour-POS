import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs/promises";
import path from "path";
import process from "process";
import Stripe from "stripe";
import xlsx from "xlsx";
import { fileURLToPath } from "url";
import { appendOrderToGoogleSheet } from "./googleSheetsOrders.js";

dotenv.config();

const app = express();
const port = Number(process.env.PAYMENT_PORT || 4242);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesWorkbookPath = process.env.SALES_WORKBOOK_PATH || path.join(__dirname, "data", "sales-ledger.xlsx");

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY is not set. Card payment endpoints are disabled.");
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const SALES_HEADERS = [
  "saleId",
  "saleDate",
  "timestamp",
  "paymentMethod",
  "orderType",
  "items",
  "subtotal",
  "discountPercent",
  "discountAmount",
  "tax",
  "total",
  "note",
  "source",
  "stripeSessionId",
  "paymentStatus",
  "receiptEmail",
];

const getSaleSheetName = (sale) => {
  const rawDate = sale.saleDate || sale.businessDate || sale.date || sale.timestamp || new Date().toISOString();
  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ensureSalesWorkbook = async () => {
  const workbookDir = path.dirname(salesWorkbookPath);
  await fs.mkdir(workbookDir, { recursive: true });

  try {
    await fs.access(salesWorkbookPath);
  } catch {
    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.json_to_sheet([], { header: SALES_HEADERS });
    xlsx.utils.book_append_sheet(workbook, sheet, "Sales");
    xlsx.writeFile(workbook, salesWorkbookPath);
  }
};

const appendSaleToWorkbook = async (sale) => {
  await ensureSalesWorkbook();

  const workbook = xlsx.readFile(salesWorkbookPath);
  const sheetName = getSaleSheetName(sale);
  const sheet = workbook.Sheets[sheetName] || xlsx.utils.json_to_sheet([], { header: SALES_HEADERS });
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  rows.unshift({
    saleId: sale.saleId || sale.id || "",
    saleDate: sheetName,
    timestamp: sale.timestamp || sale.createdAt || new Date().toISOString(),
    paymentMethod: sale.paymentMethod || sale.method || "Payment",
    orderType: sale.orderType || sale.serviceType || "Dining",
    items: sale.items || "",
    subtotal: Number(sale.subtotal || 0),
    discountPercent: Number(sale.discountPercent || 0),
    discountAmount: Number(sale.discountAmount || 0),
    tax: Number(sale.tax || 0),
    total: Number(sale.total || sale.amount || 0),
    note: sale.note || "",
    source: sale.source || "pos",
    stripeSessionId: sale.stripeSessionId || "",
    paymentStatus: sale.paymentStatus || "paid",
    receiptEmail: sale.receiptEmail || "",
  });

  const nextSheet = xlsx.utils.json_to_sheet(rows, { header: SALES_HEADERS });
  workbook.Sheets[sheetName] = nextSheet;
  if (!workbook.SheetNames.includes(sheetName)) {
    workbook.SheetNames.push(sheetName);
  }
  xlsx.writeFile(workbook, salesWorkbookPath);
};

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stripeEnabled: Boolean(stripe) });
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Card payments are not configured on the server" });
  }

  try {
    const { amountInCents, currency = "lkr", receiptEmail, table } = req.body || {};

    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      return res.status(400).json({ error: "Invalid amountInCents" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "Happy Hour POS Order",
              description: table ? `Order for ${table}` : "POS checkout",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      customer_email: receiptEmail || undefined,
      success_url: `${clientUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/?payment=cancelled`,
      metadata: {
        table: table || "Unknown",
      },
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("create-checkout-session failed", error);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

app.get("/api/checkout-session/:sessionId", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Card payments are not configured on the server" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    return res.json({
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    console.error("checkout-session lookup failed", error);
    return res.status(500).json({ error: "Failed to verify checkout session" });
  }
});

app.post("/api/sales/export", async (req, res) => {
  try {
    const sale = req.body || {};

    if (!sale.total && !sale.amount) {
      return res.status(400).json({ error: "Missing sale total" });
    }

    await appendSaleToWorkbook(sale);
    return res.json({ ok: true });
  } catch (error) {
    console.error("sales export failed", error);
    return res.status(500).json({ error: "Failed to write sales workbook" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body?.order && typeof req.body.order === "object" ? req.body.order : req.body;

    if (!order || typeof order !== "object") {
      return res.status(400).json({ error: "Missing order payload" });
    }

    const total = Number(order.total || order.amount || 0);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ error: "Missing order total" });
    }

    const result = await appendOrderToGoogleSheet(order);
    return res.status(201).json({
      ok: true,
      rowNumber: result.row.rowNumber,
      orderId: result.rowData.orderId,
    });
  } catch (error) {
    console.error("orders append failed", error);
    return res.status(500).json({ error: "Failed to append order to Google Sheet" });
  }
});

app.listen(port, () => {
  console.log(`Payment server running on http://localhost:${port}`);
});
