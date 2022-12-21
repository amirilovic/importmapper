import { program } from "commander";
import path from "node:path";
import fs from "node:fs";
import type { PackageJson } from "types-package-json";
import createDebug from "debug";

const debug = createDebug("importmapper:cli");

interface ImportMap {
  imports: Record<string, string>;
  scopes: Record<string, Record<string, string>>;
}

function ensureImportMapFile({ filePath }: { filePath: string }) {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    return;
  }

  const scopeUrl = getScopeUrl();

  saveImportMap({
    filePath,
    importMap: { imports: {}, scopes: { [scopeUrl]: {} } },
  });
}

function loadImportMap({ filePath }: { filePath: string }) {
  const fullPath = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as ImportMap;
}

function saveImportMap({
  filePath,
  importMap,
}: {
  filePath: string;
  importMap: ImportMap;
}) {
  importMap.imports = sortKeys(importMap.imports);

  const scopeUrl = getScopeUrl();

  importMap.scopes = sortKeys(importMap.scopes);

  for (const key of Object.keys(importMap.scopes)) {
    importMap.scopes[key] = sortKeys(importMap.scopes[key]);
  }

  importMap.scopes[scopeUrl] = Object.entries(
    importMap.scopes[scopeUrl]
  ).reduce((acc, [key, value]) => {
    if (!importMap.imports[key]) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  importMap.scopes[scopeUrl] = sortKeys(importMap.scopes[scopeUrl]);

  const fullPath = path.resolve(filePath);
  fs.writeFileSync(fullPath, JSON.stringify(importMap, null, 2), "utf-8");
}

function getPackageJsonPath(packageName: string, currentPath: string): string {
  if (!path.isAbsolute(currentPath)) {
    throw new Error("Use absolute path");
  }

  if (currentPath === "/") {
    throw new Error(
      `Package "${packageName}" not found. Run "npm install ${packageName}" to install the package.`
    );
  }

  const packageJsonPath = path.join(
    currentPath,
    "node_modules",
    packageName,
    "package.json"
  );

  if (fs.existsSync(packageJsonPath)) {
    return packageJsonPath;
  }

  return getPackageJsonPath(
    packageName,
    path.resolve(path.join(currentPath, ".."))
  );
}

function getPackageJson(packageName: string, cwd = ".") {
  let absoluteCwd = cwd;
  if (!path.isAbsolute(cwd)) {
    absoluteCwd = path.resolve(cwd);
  }

  const packageJsonPath = getPackageJsonPath(packageName, absoluteCwd);

  try {
    const pkg = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    ) as PackageJson;
    return { pkg, pkgPath: packageJsonPath };
  } catch (err) {
    console.log(`Can't read ${packageJsonPath} as package.json.`);
    throw err;
  }
}

function filterOutDevDependencies(packageName: string) {
  return !packageName.match(
    "@types/*|csstype|browserslist|update-browserslist-db"
  );
}

function updateImportUrlExternals({ importMap }: { importMap: ImportMap }) {
  for (const packageName of Object.keys(importMap.imports)) {
    const importUrl = new URL(importMap.imports[packageName]);
    const { pkg } = getPackageJson(packageName);
    const dependencies = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ]
      .filter(filterOutDevDependencies)
      .filter((dep) => {
        return importMap.imports[dep];
      });

    for (const dependency of dependencies) {
      importUrl.searchParams.append("external", dependency);
    }

    importMap.imports[packageName] = importUrl.toString();
  }
}

function add({
  filePath,
  packageName,
}: {
  filePath: string;
  packageName: string;
}) {
  debug(`adding ${packageName} in ${filePath}...`);

  ensureImportMapFile({ filePath });
  const importMap = loadImportMap({ filePath });

  const {
    pkg: { version },
  } = getPackageJson(packageName);

  const importUrl = getImportUrl({
    packageName,
    version,
  });

  importMap.imports[packageName] = importUrl;
  importMap.imports[`${packageName}/`] = appendSlashToUrl(importUrl);

  const scopeUrl = getScopeUrl();
  importMap.scopes = { [scopeUrl]: {} };

  updateImportUrlExternals({ importMap });

  //   addScopes({ importMap, packageName });

  saveImportMap({ filePath, importMap });
}

function sync({ filePath }: { filePath: string }) {
  ensureImportMapFile({ filePath });
  const importMap = loadImportMap({ filePath });

  const scopeUrl = getScopeUrl();
  importMap.scopes = { [scopeUrl]: {} };

  //   for (const packageName of Object.keys(importMap.imports)) {
  //     addScopes({ importMap, packageName });
  //   }

  for (const packageName of Object.keys(importMap.imports).filter(
    (pkg) => !pkg.endsWith("/")
  )) {
    const {
      pkg: { version },
    } = getPackageJson(packageName);
    const importUrl = getImportUrl({
      packageName,
      version,
    });

    importMap.imports[packageName] = importUrl;
    importMap.imports[`${packageName}/`] = appendSlashToUrl(importUrl);

    // addScopes({ importMap, packageName });
  }

  updateImportUrlExternals({ importMap });

  saveImportMap({ filePath, importMap });
}

function appendSlashToUrl(urlString: string) {
  const url = new URL(urlString);
  url.pathname += "/";

  return url.toString();
}

function remove({
  filePath,
  packageName,
}: {
  filePath: string;
  packageName: string;
}) {
  ensureImportMapFile({ filePath });
  const importMap = loadImportMap({ filePath });

  delete importMap.imports[packageName];
  delete importMap.imports[`${packageName}/`];

  const scopeUrl = getScopeUrl();
  importMap.scopes = { [scopeUrl]: {} };

  //   for (const packageName of Object.keys(importMap.imports)) {
  //     addScopes({ importMap, packageName });
  //   }

  updateImportUrlExternals({ importMap });

  saveImportMap({ filePath, importMap });
}

function sortKeys<T>(obj: Record<string, T>) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Record<string, T>);
}

function getImportUrl({
  packageName,
  version,
}: {
  packageName: string;
  version: string;
}) {
  return `http://localhost:3000/npm/${packageName}@${version}`;
}

function getScopeUrl() {
  return "http://localhost:3000/npm/";
}

program
  .command("add")
  .option(
    "-f, --file <file>",
    "file path to the importmap.json",
    "./importmap.json"
  )
  .description("add installed package to importmap.")
  .argument("<packageName>", "package to add.")
  .action((packageName: string, options) => {
    add({ packageName, filePath: options.file });
  });

program
  .command("remove")
  .option(
    "-f, --file <file>",
    "file path to the importmap.json",
    "./importmap.json"
  )
  .description("removes package from the importmap.")
  .argument("<packageName>", "package to remove.")
  .action((packageName: string, options) => {
    remove({ packageName, filePath: options.file });
  });

program
  .command("sync")
  .option(
    "-f, --file <file>",
    "file path to the importmap.json",
    "./importmap.json"
  )
  .description("sync existing packages in importmap with installed packages.")
  .action((options) => {
    sync({ filePath: options.file });
  });

program.parse();
