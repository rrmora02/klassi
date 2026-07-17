import pinoHttp from "pino-http";
import { logger } from "@/lib/logger";

export const pinoHttpMiddleware = pinoHttp({
  logger,
  quietReqLogger: false,
  level: process.env.LOG_LEVEL || "info",
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
