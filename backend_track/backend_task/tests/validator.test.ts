import { validateReconcileRequest } from "../src/utils/validator";

describe("validateReconcileRequest", () => {
  it("should accept a valid request", () => {
    const body = {
      internal: [{ id: "TXN-001", amount: 10000, currency: "NGN", reference: "PAY-A" }],
      external: [{ id: "EXT-A", amount: 10000, currency: "NGN", reference: "PAY-A" }],
    };

    const result = validateReconcileRequest(body);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept empty arrays", () => {
    const result = validateReconcileRequest({ internal: [], external: [] });
    expect(result.valid).toBe(true);
  });

  it("should reject a non-object body", () => {
    const result = validateReconcileRequest("not an object");
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("body");
  });

  it("should reject null body", () => {
    const result = validateReconcileRequest(null);
    expect(result.valid).toBe(false);
  });

  it("should reject missing internal array", () => {
    const result = validateReconcileRequest({ external: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "internal", message: "must be an array" }),
      ])
    );
  });

  it("should reject missing external array", () => {
    const result = validateReconcileRequest({ internal: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "external", message: "must be an array" }),
      ])
    );
  });

  it("should reject a transaction with missing id", () => {
    const body = {
      internal: [{ amount: 100, currency: "NGN", reference: "PAY-A" }],
      external: [],
    };
    const result = validateReconcileRequest(body);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "internal[0].id" }),
      ])
    );
  });

  it("should reject a transaction with negative amount", () => {
    const body = {
      internal: [{ id: "TXN-001", amount: -100, currency: "NGN", reference: "PAY-A" }],
      external: [],
    };
    const result = validateReconcileRequest(body);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "internal[0].amount" }),
      ])
    );
  });

  it("should reject a transaction with non-string reference", () => {
    const body = {
      internal: [],
      external: [{ id: "EXT-A", amount: 100, currency: "NGN", reference: 123 }],
    };
    const result = validateReconcileRequest(body);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "external[0].reference" }),
      ])
    );
  });

  it("should collect multiple errors across transactions", () => {
    const body = {
      internal: [
        { id: "", amount: -1, currency: "", reference: "" },
      ],
      external: "not-an-array",
    };
    const result = validateReconcileRequest(body);
    expect(result.valid).toBe(false);
    // Should have errors for all four internal fields + external not being an array
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });
});
