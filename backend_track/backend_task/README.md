# Transaction Reconciliation Service

This is a simple microservice designed to match transaction records from two different sources: internal bank records and external payment data. It identifies perfect matches, near-matches (within a set tolerance), and those that don't match at all.

---

## 1. How it Works

### Matching Logic
I used a **two-pass** strategy to make sure exact matches always take priority over close ones:

1.  **Index by Reference**: First, I index all external transactions into a Map using their reference ID. This makes looking them up extremely fast.
2.  **Pass 1 (Exact)**: I go through the internal records. If a reference ID matches an external record AND the amount is identical, they are paired up and removed from the pool.
3.  **Pass 2 (Tolerance)**: I go through the remaining records. If the reference IDs match, I check if the amount difference is within the `TOLERANCE_AMOUNT` (default is 500 units). If it is, they are matched as a "tolerance match."
4.  **Final Cleanup**: Anything left over on either side is reported as unmatched.

### Project Structure
```
src/
├── types/index.ts           ← All my TypeScript interfaces
├── utils/
│   ├── matcher.ts           ← Core matching logic (pure function)
│   └── validator.ts         ← Simple request validation
├── services/
│   └── reconciliationService.ts  ← Orchestrates the matching and formatting
├── routes/reconcile.ts      ← API routes and error handling
├── config.ts                ← Environment variable handling
├── logger.ts                ← Structured logging with Pino
└── index.ts                 ← Server entry point
```

---

## 2. Assumptions & Decisions

-   **Duplicates**: If multiple external records have the same reference ID, I only match against the first one. The others are marked as unmatched since duplicate references usually mean something is wrong with the data.
-   **Currency**: The data includes a currency field, but per the requirements, I only match based on reference and amount.
-   **Tolerance**: The 500-unit limit is inclusive. So a difference of exactly 500 still counts as a match.
-   **Absolute Difference**: When reporting a difference for a near-match, I always use the absolute value. It doesn't matter which side was higher; the discrepancy is what matters.

---

## 3. Trade-offs

-   **Manual Validation**: I wrote a custom validator to keep dependencies to zero. In a larger production app, I'd probably use **Joi** for this.
-   **No Database**: Since this is a test task, I kept it stateless. Results are calculated on the fly and not stored anywhere.
-   **Synchronous Processing**: This is fine for typical internal reconciliation. If we were matching millions of rows, I'd move this to a background worker or stream the results.

---

## 4. How to Run It

### Setup
1.  **Install dependencies**: `npm install`
2.  **Configure Environment**: Copy the example env file: `cp .env.example .env`
3.  **Start the server**: `npm run dev`

The server runs on **localhost:3000** by default.

### Running Tests
To run the full test suite with Jest:
```bash
npm test
```

### Quick Test (CURL)
You can test the reconciliation endpoint with this command:

```bash
curl -X POST http://localhost:3000/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "internal": [
      { "id": "TXN-001", "amount": 10000, "currency": "NGN", "reference": "PAY-A" },
      { "id": "TXN-002", "amount": 20000, "currency": "NGN", "reference": "PAY-B" }
    ],
    "external": [
      { "id": "EXT-A", "amount": 10000, "currency": "NGN", "reference": "PAY-A" },
      { "id": "EXT-B", "amount": 20500, "currency": "NGN", "reference": "PAY-B" }
    ]
  }'
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | What port the server listens on |
| `NODE_ENV` | `development` | The environment the app is running in |
| `TOLERANCE_AMOUNT` | `500` | Max allowed difference for a "near-match" |
