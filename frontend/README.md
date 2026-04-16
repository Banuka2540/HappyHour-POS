# Happy Hour POS

This project now includes real card checkout via Stripe Checkout.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example:

```bash
copy .env.example .env
```

3. Update `.env` with your Stripe key:

- `STRIPE_SECRET_KEY` should be your Stripe secret key (`sk_test_...` for testing).
- Keep `VITE_API_BASE_URL` and `CLIENT_URL` aligned with your local ports.

## Run Locally

Run these in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev
```

Frontend runs on `http://localhost:5173` and payment server runs on `http://localhost:4242`.

## Card Payment Flow

1. Add items in POS and click `Card`.
2. Click pay to open Stripe Checkout.
3. Complete payment and return to app.
4. Admin dashboard POS Sales updates after payment verification.

For Stripe test payments, use Stripe test card numbers from Stripe docs (for example `4242 4242 4242 4242`).
