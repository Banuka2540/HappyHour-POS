import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import Stripe from "stripe";

dotenv.config();

const app = express();
const port = Number(process.env.PAYMENT_PORT || 4242);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY in .env");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/create-checkout-session", async (req, res) => {
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

app.listen(port, () => {
  console.log(`Payment server running on http://localhost:${port}`);
});
