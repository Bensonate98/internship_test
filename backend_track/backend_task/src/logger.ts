import pino from "pino";
import { config } from "./config";

export const logger = pino({
  level: "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
