import { createRequire } from "module";

const require = createRequire(import.meta.url);

// eslint-disable-next-line no-useless-escape
const identRegexp = /^[a-zA-Z_\$][a-zA-Z0-9_\$]*$/;

const reservedWords = new Set([
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "volatile",
  "while",
  "with",
  "yield",
]);

function isObject(v: unknown) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function verifyExports(names: string[]) {
  const exportDefault = names.includes("default");
  const exports = Array.from(
    new Set(
      names.filter((name) => identRegexp.test(name) && !reservedWords.has(name))
    )
  );
  return {
    exportDefault,
    exports,
  };
}

export function getModuleExports(entry: string, nodeEnv: string) {
  process.env.NODE_ENV = nodeEnv;
  const exports = [];

  const mod = require(entry);

  if (isObject(mod) || typeof mod === "function") {
    for (const key of Object.keys(mod)) {
      if (typeof key === "string" && key !== "") {
        exports.push(key);
      }
    }
  }
  return verifyExports(exports);
}
