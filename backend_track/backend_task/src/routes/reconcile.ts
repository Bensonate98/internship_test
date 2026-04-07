import { Router, Request, Response } from "express";
import { reconcile } from "../services/reconciliationService";
import { validateReconcileRequest, asReconcileRequest } from "../utils/validator";
import { config } from "../config";
import { logger } from "../logger";

const router = Router();

router.post("/", (req: Request, res: Response): void => {
  const startTime = Date.now();

  const validation = validateReconcileRequest(req.body);

  if (!validation.valid) {
    logger.warn({ errors: validation.errors }, "Reconcile request failed validation");
    res.status(400).json({
      error: "Invalid request body",
      details: validation.errors,
    });
    return;
  }

  const { internal, external } = asReconcileRequest(req.body);

  const result = reconcile(internal, external, {
    toleranceAmount: config.toleranceAmount,
  });

  const durationMs = Date.now() - startTime;

  logger.info(
    {
      internalCount: internal.length,
      externalCount: external.length,
      matched: result.summary.matched,
      nearMatched: result.summary.near_matched,
      unmatchedInternal: result.summary.unmatched_internal,
      unmatchedExternal: result.summary.unmatched_external,
      durationMs,
    },
    "Reconciliation complete"
  );

  res.status(200).json(result);
});

export default router;
