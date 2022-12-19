import path from "node:path";
import { mkdir } from "node:fs/promises";
import { $ } from "zx";
import { config } from "./config";
import createDebug from "debug";
import { existsSync, rmdirSync } from "node:fs";
import { NotFoundError } from "./errors";
import { logger } from "./logger";

const debug = createDebug("importmapper:install");

async function install(pkg: string): Promise<string> {
  const destinationPath = path.join(config.tempDirPath, pkg);

  if (existsSync(destinationPath)) {
    debug(`Package ${pkg}} already exists, skipping...`);
    return destinationPath;
  }

  debug(`Installing ${pkg} to ${destinationPath}...`);

  await mkdir(destinationPath, { recursive: true });

  const cachePath = path.join(config.tempDirPath, ".cache");

  try {
    await $`npm --prefix=${destinationPath} install --no-package-lock --ignore-scripts --no-audit --cache=${cachePath} ${pkg}`;

    return destinationPath;
  } catch (err) {
    rmdirSync(destinationPath);
    logger.error({ err }, "Install error");
    throw new NotFoundError("Package not found", { package: pkg });
  }
}

export { install };
