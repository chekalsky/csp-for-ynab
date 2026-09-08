import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const dest = "public/config.json";
if (!existsSync(dest)) {
  copyFileSync("public/config.example.json", dest);
}
const id = process.env.YNAB_CLIENT_ID?.trim();
if (id) {
  const cfg = JSON.parse(readFileSync(dest, "utf8"));
  cfg.ynabClientId = id;
  writeFileSync(dest, `${JSON.stringify(cfg, null, 2)}\n`);
}
