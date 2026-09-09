// @ts-nocheck
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function assetVersion(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return JSON.parse(readFileSync("package.json", "utf8")).version as string;
  }
}

function reactRefreshShim(): Plugin {
  return {
    name: "react-refresh-getRefreshReg",
    transform(code, id) {
      if (code.includes("function getRefreshReg")) return;
      if (!code.includes("export function injectIntoGlobalHook")) return;
      if (!code.includes("export function register(")) return;
      return `${code}
export function getRefreshReg(filename) {
  return (type, id) => register(type, filename + " " + id);
}
`;
    },
  };
}

function versionPublicAssets(): Plugin {
  const v = assetVersion();
  return {
    name: "version-public-assets",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let next = html.replaceAll("%ASSET_V%", v);
        if (next.includes("@vite/client") && !next.includes("var __SERVER_FORWARD_CONSOLE__")) {
          next = next.replace(
            /<script type="module" src="[^"]*@vite\/client"><\/script>/,
            '<script>var __SERVER_FORWARD_CONSOLE__ = globalThis.__SERVER_FORWARD_CONSOLE__ || function () {};</script>\n    $&',
          );
        }
        return next;
      },
    },
    writeBundle(output) {
      const dir = output.dir;
      if (!dir) return;
      const file = `${dir}/manifest.webmanifest`;
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      for (const icon of manifest.icons ?? []) {
        const src = icon.src.split("?")[0];
        icon.src = `${src}?v=${v}`;
      }
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  plugins: [react(), reactRefreshShim(), versionPublicAssets()],
  test: {
    setupFiles: ["./src/test-setup.ts"],
  },
});
