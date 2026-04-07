import type {
  Transaction,
  MatchedPair,
  NearMatchedPair,
  UnmatchedTransaction,
  ReconcileConfig,
} from "../types";

export interface MatchResult {
  matched: MatchedPair[];
  nearMatched: NearMatchedPair[];
  unmatchedInternal: UnmatchedTransaction[];
  unmatchedExternal: UnmatchedTransaction[];
}

export const matchTransactions = (
  internal: Transaction[],
  external: Transaction[],
  config: ReconcileConfig
): MatchResult => {
  const { toleranceAmount } = config;

  const matched: MatchedPair[] = [];
  const nearMatched: NearMatchedPair[] = [];

  const externalByRef = new Map<string, Transaction>();
  const duplicateRefs = new Set<string>();

  for (const ext of external) {
    if (externalByRef.has(ext.reference)) {
      duplicateRefs.add(ext.reference);
    } else {
      externalByRef.set(ext.reference, ext);
    }
  }

  const claimedExternalRefs = new Set<string>();

  const remainingInternal: Transaction[] = [];

  for (const int of internal) {
    const ext = externalByRef.get(int.reference);

    if (ext && !claimedExternalRefs.has(ext.reference) && int.amount === ext.amount) {
      matched.push({
        internal_id: int.id,
        external_id: ext.id,
        amount: int.amount,
        status: "exact",
      });
      claimedExternalRefs.add(ext.reference);
    } else {
      remainingInternal.push(int);
    }
  }

  const stillUnmatchedInternal: UnmatchedTransaction[] = [];

  for (const int of remainingInternal) {
    const ext = externalByRef.get(int.reference);

    if (ext && !claimedExternalRefs.has(ext.reference)) {
      const difference = Math.abs(int.amount - ext.amount);

      if (difference <= toleranceAmount) {
        nearMatched.push({
          internal_id: int.id,
          external_id: ext.id,
          internal_amount: int.amount,
          external_amount: ext.amount,
          difference,
          status: "tolerance_match",
        });
        claimedExternalRefs.add(ext.reference);
        continue;
      }
    }

    stillUnmatchedInternal.push({
      id: int.id,
      amount: int.amount,
      reference: int.reference,
    });
  }

  // Collect unmatched externals
  const unmatchedExternal: UnmatchedTransaction[] = external
    .filter((ext) => !claimedExternalRefs.has(ext.reference))
    .map((ext) => ({
      id: ext.id,
      amount: ext.amount,
      reference: ext.reference,
    }));

  return {
    matched,
    nearMatched,
    unmatchedInternal: stillUnmatchedInternal,
    unmatchedExternal: unmatchedExternal,
  };
}
