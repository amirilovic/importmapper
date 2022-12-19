import pino from "pino";

const logLevel = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level: logLevel,
  timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  messageKey: "message",
});
