import dotenv from "dotenv";

dotenv.config();

const parseIntEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid value for env var ${key}: "${raw}" is not a valid integer`
    );
  }
  return parsed;
}

export const config = {
  port: parseIntEnv("PORT", 3000),

  toleranceAmount: parseIntEnv("TOLERANCE_AMOUNT", 500),

  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
