import * as Sentry from "@sentry/nextjs";
import { childLogger } from "./logger";

export class LoggingService {
  private context: string;
  private logger: ReturnType<typeof childLogger>;

  constructor(context: string) {
    this.context = context;
    this.logger = childLogger(context);
  }

  info(message: string, data?: unknown) {
    this.logger.info(data, message);
  }

  warn(message: string, data?: unknown) {
    this.logger.warn(data, message);
  }

  error(message: string, error?: Error | unknown, data?: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.logger.error({ err: errorObj, ...(typeof data === "object" ? data : {}) }, message);
    Sentry.captureException(errorObj, {
      contexts: { logging: { context: this.context, message } },
      extra: typeof data === "object" ? (data as Record<string, unknown>) : {},
    });
  }

  debug(message: string, data?: unknown) {
    this.logger.debug(data, message);
  }
}

export const createLogger = (context: string) => new LoggingService(context);
