import { appConfig } from "@/config";
import winston from "winston";

const { level, format } = appConfig.logging;

const loggerFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  format === "json"
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, stack, ...meta }) => {
            const metaStr =
              Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} [${level}]: ${message}${
              stack ? `\n${stack}` : ""
            }${metaStr}`;
          }
        )
      )
);

const logger = winston.createLogger({
  level,
  format: loggerFormat,
  defaultMeta: { service: "beru-memorix" },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Add file transport in production
if (appConfig.server.environment === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );
}

export { logger };
