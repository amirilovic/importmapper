import { app } from "./app";
import { logger } from "./logger";
import { config } from "./config";
import fs from "node:fs";

async function start() {
  // TODO: remove
  fs.rmSync(config.outputDirPath, { recursive: true, force: true });

  app.listen(config.server.port, () => {
    logger.info(`Server listening on port ${config.server.port}`);
  });
}

process.on("SIGINT", () => {
  logger.info("Interrupted");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException");
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  throw error;
});

start();
