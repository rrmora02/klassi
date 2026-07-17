import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = isDev
  ? pino({
      level: process.env.LOG_LEVEL || "info",
      base: {
        env: process.env.NODE_ENV,
      },
    })
  : pino({
      level: process.env.LOG_LEVEL || "info",
      base: {
        env: process.env.NODE_ENV,
      },
    });

export const childLogger = (context: string) =>
  logger.child({ context });
