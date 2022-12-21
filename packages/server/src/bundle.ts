import path from "node:path";
import fs from "node:fs";
import { build, BuildOptions } from "esbuild";
import { config } from "./config";
import { logger } from "./logger";
import crypto from "crypto";
import { getModuleExports } from "./module-exports";
import type { PackageJson as PackageJsonType } from "types-package-json";

type PackageJson = PackageJsonType & {
  type?: "module";
};

function getDependencies(packageJson: PackageJson) {
  const dependencies = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ];

  return Array.from(new Set(dependencies)).sort((a, b) => a.localeCompare(b));
}

function generateHash(external: string[]) {
  if (!external.length) {
    return "";
  }

  const shasum = crypto.createHash("sha1");

  const text = JSON.stringify(external.sort((a, b) => a.localeCompare(b)));

  shasum.update(text);
  return shasum.digest("hex");
}

function getPackageName(pkg: string) {
  return pkg.substring(0, pkg.lastIndexOf("@"));
}

function generateInputModule({
  buildPath,
  importPath,
  exports,
}: {
  buildPath: string;
  importPath: string;
  exports: string[];
}) {
  const sb: string[] = [];

  sb.push(`import * as __module from "${importPath}";`);

  const moduleExports: string[] = [];

  for (const exp of exports) {
    if (exp === "__esModule") {
      sb.push("export const __esModule = true;");
    } else {
      moduleExports.push(exp);
    }
  }

  if (moduleExports.length) {
    sb.push(`export const { ${moduleExports.join(",")} } = __module`);
  }

  sb.push("const { default: __default, ...__rest } = __module;");
  sb.push("export default (__default !== undefined ? __default : __rest);");

  const modulePath = path.resolve(buildPath, "mod.js");

  fs.writeFileSync(modulePath, sb.join("\n"), "utf-8");

  return modulePath;
}

function insertAtBegining(file: string, content: string) {
  const data = fs.readFileSync(file); //read existing contents into data
  const fd = fs.openSync(file, "w+");
  const buffer = Buffer.from(content);

  fs.writeSync(fd, buffer, 0, buffer.length, 0); //write new data
  fs.writeSync(fd, data, 0, data.length, buffer.length); //append old data
  fs.close(fd);
}

function getPackageJson(pkg: string, pkgPath: string) {
  const packageName = getPackageName(pkg);
  const packageJsonPath = path.resolve(
    "./",
    pkgPath,
    "node_modules",
    packageName,
    "package.json"
  );

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8")
  ) as PackageJson;

  return packageJson;
}

function addExternalImports(external: string[], outputFile: string) {
  if (!external.length) {
    return;
  }
  const sb: string[] = [];

  for (let i = 0; i < external.length; i++) {
    const dependency = external.at(i);
    sb.push(`import import${i} from '${dependency}'`);
  }

  sb.push("const requireCache = {");

  const cacheItems: string[] = [];
  for (let i = 0; i < external.length; i++) {
    const dependency = external.at(i);
    cacheItems.push(`'${dependency}': import${i}`);
  }

  sb.push(cacheItems.join(",\n"));

  sb.push("}");

  sb.push(`
function require(pkg) {
  if(!requireCache[pkg]) {
    throw new Error("Package" + pkg + "is not defined.");
  }

  return requireCache[pkg]
}

`);

  insertAtBegining(outputFile, sb.join("\n"));
}

export async function bundle(
  pkg: string,
  pkgPath: string,
  modulePath = "",
  external: string[] = []
): Promise<string> {
  logger.info({ pkg, modulePath }, "Bundling...");

  const packageJson = getPackageJson(pkg, pkgPath);

  const packageDependecies = getDependencies(packageJson);
  const filteredExternal = packageDependecies.filter((dependency) =>
    external.includes(dependency)
  );

  const contentHash = generateHash(filteredExternal);

  let outputFile = path.resolve(
    "./",
    config.outputDirPath,
    pkg,
    contentHash,
    modulePath === "" ? "index.js" : modulePath
  );

  if (path.extname(outputFile) === "") {
    outputFile += ".js";
  }

  if (fs.existsSync(outputFile)) {
    logger.info({ outputFile }, "Already exists, skipping...");
    return outputFile;
  }

  const start = new Date().getTime();

  let entryPoint = path.resolve(
    "./",
    pkgPath,
    "node_modules",
    packageJson.name,
    modulePath
  );

  if (packageJson.type !== "module") {
    const buildPath = path.resolve("./", pkgPath);
    const { exports } = getModuleExports(entryPoint, "production");

    entryPoint = generateInputModule({
      buildPath,
      importPath: entryPoint,
      exports,
    });
  }

  logger.info({ entryPoint, outputFile }, "Bundle info");

  const buildConfig: BuildOptions = {
    bundle: true,
    platform: "node",
    mainFields: ["module", "main"],
    entryPoints: [entryPoint],
    outfile: outputFile,
    external: filteredExternal,
    minify: false,
    define: {
      "process.env.NODE_ENV": `'production'`,
    },
  };

  await build({
    ...buildConfig,
    format: "esm",
  });

  addExternalImports(filteredExternal, outputFile);

  const end = new Date().getTime();

  logger.info({ pkg, modulePath, duration: end - start }, "Bundle duration");

  return outputFile;
}
