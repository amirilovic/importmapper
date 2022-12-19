import { readFileSync } from "fs";
import type { ConfigEnv, HtmlTagDescriptor, Plugin } from "vite";

type PluginOptions = {
  importMapPath?: string;
  preloadModules?: string[];
};

function plugin(options?: PluginOptions): Plugin[] {
  let env: ConfigEnv;

  const importMapPath = options?.importMapPath ?? "importmap.json";
  const importMap = JSON.parse(readFileSync(importMapPath, "utf-8"));
  const preloadModules = options?.preloadModules ?? [];

  return [
    {
      name: "importmapper:external",
      config(config, { mode }) {
        const external = Object.keys(importMap?.imports ?? {});

        if (!external.length) {
          return;
        }

        if (mode !== "development") {
          if (!config.build) {
            config.build = {};
          }

          let { rollupOptions } = config.build;
          if (!rollupOptions) {
            rollupOptions = { external: [] };
            config.build.rollupOptions = rollupOptions;
          }

          config.build!.rollupOptions!.external = external;
        }
      },
    },
    {
      name: "importmapper:post",
      enforce: "post",
      config(_, _env) {
        env = _env;

        if (!importMap?.imports) {
          return;
        }
      },
      transformIndexHtml: {
        // NODE_ENV is "production" in `vite build`
        enforce: process.env?.NODE_ENV === "production" ? "post" : "pre",
        async transform(html) {
          const tags: HtmlTagDescriptor[] = [
            {
              tag: "script",
              attrs: {
                type: "module",
                src: "https://ga.jspm.io/npm:es-module-shims@1.5.9/dist/es-module-shims.js",
                async: !(env.command === "serve"),
              },
              injectTo: "head-prepend",
            },
          ];

          tags.unshift({
            tag: "script",
            attrs: {
              type: "importmap",
            },
            children: JSON.stringify(importMap, null, 2),
            injectTo: "head-prepend",
          });

          for (const preloadModule of preloadModules) {
            if (!importMap.imports?.[preloadModule]) {
              continue;
            }

            tags.push({
              tag: "link",
              attrs: {
                rel: "modulepreload",
                href: importMap.imports[preloadModule],
              },
            });
          }

          return {
            html,
            tags,
          };
        },
      },
    },
  ];
}

export default plugin;
