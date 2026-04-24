import { appendOrderToGoogleSheet } from "../server/googleSheetsOrders.js";

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    const detail = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      error: "Failed to append order to Google Sheet",
      detail,
      hint: "Verify GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and share the sheet with the service account as Editor.",
    });
  }
}
