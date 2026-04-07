export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  reference: string;
}

export interface ReconcileRequest {
  internal: Transaction[];
  external: Transaction[];
}

export type MatchStatus = "exact" | "tolerance_match";

export interface MatchedPair {
  internal_id: string;
  external_id: string;
  amount: number;
  status: "exact";
}

export interface NearMatchedPair {
  internal_id: string;
  external_id: string;
  internal_amount: number;
  external_amount: number;
  difference: number;
  status: "tolerance_match";
}

export interface UnmatchedTransaction {
  id: string;
  amount: number;
  reference: string;
}

export interface ReconcileSummary {
  total_internal: number;
  total_external: number;
  matched: number;
  near_matched: number;
  unmatched_internal: number;
  unmatched_external: number;
}

export interface ReconcileResponse {
  matched: MatchedPair[];
  near_matched: NearMatchedPair[];
  unmatched_internal: UnmatchedTransaction[];
  unmatched_external: UnmatchedTransaction[];
  summary: ReconcileSummary;
}

export interface ReconcileConfig {
  toleranceAmount: number;
}
