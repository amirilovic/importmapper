import express from "express";
import { logger } from "./logger";
import cors from "cors";
import helmet from "helmet";
import { bundle } from "./bundle";
import fs from "fs/promises";
import { BadRequestError, NotFoundError } from "./errors";
import { parse } from "parse-package-name";
import { getLatestPkgVersion } from "./get-latest-pkg-version";
import { install } from "./install";
import compression from "compression";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json());
app.use(cors());
app.use(compression());

app.get(
  "/npm/:pkg(*)",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const packageInfo = parse(req.params.pkg);

      if (packageInfo.version === "latest") {
        const latestVersion = await getLatestPkgVersion(packageInfo.name);
        res.redirect(
          `/npm/${packageInfo.name}@${latestVersion}${packageInfo.path}`
        );
        return;
      }

      logger.info({ ...packageInfo }, "Serving module");

      const pkg = `${packageInfo.name}@${packageInfo.version}`;
      const modulePath =
        packageInfo.path.length > 1
          ? packageInfo.path.substring(1)
          : packageInfo.path;

      let external: string[] = [];
      if (Array.isArray(req.query.external)) {
        external = req.query.external.map((item) => item.toString());
      } else if (req.query.external) {
        external = [req.query.external.toString()];
      }

      external = Array.from(new Set(external));

      const pkgPath = await install(pkg);
      const esmModulePath = await bundle(pkg, pkgPath, modulePath, external);
      const esmModule = await fs.readFile(esmModulePath);
      res.contentType("application/javascript; charset=utf-8").send(esmModule);
    } catch (err) {
      next(err);
    }
  }
);

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).send({ message: "NotFound" });
});

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    if (error instanceof BadRequestError) {
      logger.info({ err: error });
      return res.status(400).send({
        message: error.message,
        details: error.details,
      });
    }

    if (error instanceof NotFoundError) {
      logger.info({ err: error });
      return res.status(404).send({
        message: error.message,
        details: error.details,
      });
    }

    logger.error({ err: error }, "Internal Server Error");
    res.status(500).send({ message: "InternalServerError" });
  }
);

export { app };
