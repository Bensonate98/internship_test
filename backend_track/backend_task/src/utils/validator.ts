import type { Transaction, ReconcileRequest } from "../types";

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function validateTransaction(
  txn: unknown,
  index: number,
  source: "internal" | "external"
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `${source}[${index}]`;

  if (typeof txn !== "object" || txn === null) {
    return [{ field: prefix, message: "must be an object" }];
  }

  const record = txn as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.trim() === "") {
    errors.push({ field: `${prefix}.id`, message: "must be a non-empty string" });
  }

  if (typeof record.amount !== "number" || !Number.isFinite(record.amount) || record.amount < 0) {
    errors.push({
      field: `${prefix}.amount`,
      message: "must be a non-negative finite number",
    });
  }

  if (typeof record.currency !== "string" || record.currency.trim() === "") {
    errors.push({
      field: `${prefix}.currency`,
      message: "must be a non-empty string",
    });
  }

  if (typeof record.reference !== "string" || record.reference.trim() === "") {
    errors.push({
      field: `${prefix}.reference`,
      message: "must be a non-empty string",
    });
  }

  return errors;
}

// Validates the full reconciliation request body.
// Returns a structured result with all field-level errors.
export function validateReconcileRequest(body: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof body !== "object" || body === null) {
    return {
      valid: false,
      errors: [{ field: "body", message: "request body must be a JSON object" }],
    };
  }

  const record = body as Record<string, unknown>;

  // Validate `internal` array
  if (!Array.isArray(record.internal)) {
    errors.push({ field: "internal", message: "must be an array" });
  } else {
    (record.internal as unknown[]).forEach((txn, i) => {
      errors.push(...validateTransaction(txn, i, "internal"));
    });
  }

  // Validate `external` array
  if (!Array.isArray(record.external)) {
    errors.push({ field: "external", message: "must be an array" });
  } else {
    (record.external as unknown[]).forEach((txn, i) => {
      errors.push(...validateTransaction(txn, i, "external"));
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function asReconcileRequest(body: unknown): ReconcileRequest {
  const record = body as Record<string, unknown>;
  return {
    internal: record.internal as Transaction[],
    external: record.external as Transaction[],
  };
}
