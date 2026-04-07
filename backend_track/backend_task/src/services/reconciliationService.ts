import type {
  Transaction,
  ReconcileResponse,
  ReconcileConfig,
} from "../types";
import { matchTransactions } from "../utils/matcher";

export const reconcile = (
  internal: Transaction[],
  external: Transaction[],
  config: ReconcileConfig
): ReconcileResponse => {
  const result = matchTransactions(internal, external, config);

  return {
    matched: result.matched,
    near_matched: result.nearMatched,
    unmatched_internal: result.unmatchedInternal,
    unmatched_external: result.unmatchedExternal,
    summary: {
      total_internal: internal.length,
      total_external: external.length,
      matched: result.matched.length,
      near_matched: result.nearMatched.length,
      unmatched_internal: result.unmatchedInternal.length,
      unmatched_external: result.unmatchedExternal.length,
    },
  };
}
