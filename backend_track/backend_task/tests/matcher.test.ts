import { matchTransactions, MatchResult } from "../src/utils/matcher";
import type { Transaction, ReconcileConfig } from "../src/types";

const DEFAULT_CONFIG: ReconcileConfig = { toleranceAmount: 500 };

const makeInternal = (overrides: Partial<Transaction> & { id: string }): Transaction => {
  return {
    amount: 10000,
    currency: "NGN",
    reference: "PAY-A",
    ...overrides,
  };
}

const makeExternal = (overrides: Partial<Transaction> & { id: string }): Transaction => {
  return {
    amount: 10000,
    currency: "NGN",
    reference: "PAY-A",
    ...overrides,
  };
}

describe("matchTransactions", () => {

  describe("exact matches", () => {
    it("should match transactions with the same reference and amount", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 10000 })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0]).toEqual({
        internal_id: "TXN-001",
        external_id: "EXT-A",
        amount: 10000,
        status: "exact",
      });
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(0);
      expect(result.unmatchedExternal).toHaveLength(0);
    });

    it("should match multiple exact pairs", () => {
      const internal = [
        makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 }),
        makeInternal({ id: "TXN-002", reference: "PAY-B", amount: 20000 }),
      ];
      const external = [
        makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 10000 }),
        makeExternal({ id: "EXT-B", reference: "PAY-B", amount: 20000 }),
      ];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(2);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(0);
      expect(result.unmatchedExternal).toHaveLength(0);
    });
  });

  describe("tolerance matches", () => {
    it("should near-match when amount difference is within tolerance", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 20000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 20300 })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(1);
      expect(result.nearMatched[0]).toEqual({
        internal_id: "TXN-001",
        external_id: "EXT-A",
        internal_amount: 20000,
        external_amount: 20300,
        difference: 300,
        status: "tolerance_match",
      });
    });

    it("should near-match at exactly the tolerance boundary (inclusive)", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 10500 })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.nearMatched).toHaveLength(1);
      expect(result.nearMatched[0].difference).toBe(500);
    });

    it("should NOT match when difference exceeds tolerance", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 10501 })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(1);
      expect(result.unmatchedExternal).toHaveLength(1);
    });

    it("should use a custom tolerance value from config", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 11000 })];

      // Default tolerance (500) → should NOT match
      const result1 = matchTransactions(internal, external, { toleranceAmount: 500 });
      expect(result1.nearMatched).toHaveLength(0);

      // Custom tolerance (1000) → should match
      const result2 = matchTransactions(internal, external, { toleranceAmount: 1000 });
      expect(result2.nearMatched).toHaveLength(1);
    });

    it("should report absolute difference regardless of which side is larger", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 20500 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 20000 })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.nearMatched).toHaveLength(1);
      expect(result.nearMatched[0].difference).toBe(500);
    });
  });

  describe("unmatched transactions", () => {
    it("should report internal transactions with no matching reference", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-X" })];
      const external = [makeExternal({ id: "EXT-001", reference: "PAY-Z" })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(1);
      expect(result.unmatchedInternal[0]).toEqual({
        id: "TXN-001",
        amount: 10000,
        reference: "PAY-X",
      });
      expect(result.unmatchedExternal).toHaveLength(1);
      expect(result.unmatchedExternal[0]).toEqual({
        id: "EXT-001",
        amount: 10000,
        reference: "PAY-Z",
      });
    });
  });

  describe("matching priority", () => {
    it("should prefer exact match over tolerance match for a given reference", () => {

      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 10000 })];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].status).toBe("exact");
      expect(result.nearMatched).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty arrays", () => {
      const result = matchTransactions([], [], DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(0);
      expect(result.unmatchedExternal).toHaveLength(0);
    });

    it("should handle empty internal with non-empty external", () => {
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A" })];

      const result = matchTransactions([], external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.unmatchedExternal).toHaveLength(1);
    });

    it("should handle non-empty internal with empty external", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A" })];

      const result = matchTransactions(internal, [], DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(1);
    });

    it("should handle zero tolerance (only exact matches allowed)", () => {
      const internal = [makeInternal({ id: "TXN-001", reference: "PAY-A", amount: 10000 })];
      const external = [makeExternal({ id: "EXT-A", reference: "PAY-A", amount: 10001 })];

      const result = matchTransactions(internal, external, { toleranceAmount: 0 });

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(1);
      expect(result.unmatchedExternal).toHaveLength(1);
    });
  });

  describe("full scenario from spec", () => {
    it("should produce the exact output from the assessment example", () => {
      const internal: Transaction[] = [
        { id: "TXN-001", amount: 10000, currency: "NGN", reference: "PAY-A" },
        { id: "TXN-002", amount: 20000, currency: "NGN", reference: "PAY-B" },
        { id: "TXN-003", amount: 5000, currency: "NGN", reference: "PAY-C" },
      ];
      const external: Transaction[] = [
        { id: "EXT-A", amount: 10000, currency: "NGN", reference: "PAY-A" },
        { id: "EXT-B", amount: 20500, currency: "NGN", reference: "PAY-B" },
        { id: "EXT-D", amount: 7500, currency: "NGN", reference: "PAY-D" },
      ];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toEqual([
        {
          internal_id: "TXN-001",
          external_id: "EXT-A",
          amount: 10000,
          status: "exact",
        },
      ]);

      expect(result.nearMatched).toEqual([
        {
          internal_id: "TXN-002",
          external_id: "EXT-B",
          internal_amount: 20000,
          external_amount: 20500,
          difference: 500,
          status: "tolerance_match",
        },
      ]);

      expect(result.unmatchedInternal).toEqual([
        { id: "TXN-003", amount: 5000, reference: "PAY-C" },
      ]);
      expect(result.unmatchedExternal).toEqual([
        { id: "EXT-D", amount: 7500, reference: "PAY-D" },
      ]);
    });
  });

  describe("sample_payloads.json test cases", () => {
    it("Happy path — exact matches only", () => {
      const internal: Transaction[] = [
        { id: "TXN-001", amount: 10000, currency: "NGN", reference: "PAY-A" },
        { id: "TXN-002", amount: 20000, currency: "NGN", reference: "PAY-B" },
      ];
      const external: Transaction[] = [
        { id: "EXT-A", amount: 10000, currency: "NGN", reference: "PAY-A" },
        { id: "EXT-B", amount: 20000, currency: "NGN", reference: "PAY-B" },
      ];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(2);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(0);
      expect(result.unmatchedExternal).toHaveLength(0);
    });

    it("Mixed — exact, tolerance, and unmatched", () => {
      const internal: Transaction[] = [
        { id: "TXN-001", amount: 10000, currency: "NGN", reference: "PAY-A" },
        { id: "TXN-002", amount: 20000, currency: "NGN", reference: "PAY-B" },
        { id: "TXN-003", amount: 5000, currency: "NGN", reference: "PAY-C" },
      ];
      const external: Transaction[] = [
        { id: "EXT-A", amount: 10000, currency: "NGN", reference: "PAY-A" },
        { id: "EXT-B", amount: 20300, currency: "NGN", reference: "PAY-B" },
        { id: "EXT-D", amount: 7500, currency: "NGN", reference: "PAY-D" },
      ];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(1);
      expect(result.nearMatched).toHaveLength(1);
      expect(result.unmatchedInternal).toHaveLength(1);
      expect(result.unmatchedExternal).toHaveLength(1);
    });

    it("Edge case — empty arrays", () => {
      const result = matchTransactions([], [], DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(0);
      expect(result.unmatchedExternal).toHaveLength(0);
    });

    it("Edge case — all unmatched", () => {
      const internal: Transaction[] = [
        { id: "TXN-001", amount: 10000, currency: "NGN", reference: "PAY-X" },
      ];
      const external: Transaction[] = [
        { id: "EXT-001", amount: 10000, currency: "NGN", reference: "PAY-Z" },
      ];

      const result = matchTransactions(internal, external, DEFAULT_CONFIG);

      expect(result.matched).toHaveLength(0);
      expect(result.nearMatched).toHaveLength(0);
      expect(result.unmatchedInternal).toHaveLength(1);
      expect(result.unmatchedExternal).toHaveLength(1);
    });
  });
});
