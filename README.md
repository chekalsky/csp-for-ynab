# YNAB × CSP

Dashboard that maps your YNAB budget onto Ramit Sethi’s four Conscious Spending buckets: **Fixed Costs**, **Investments**, **Savings**, and **Guilt-free spending**.

Your financial data never leaves your browser.

## Run locally

```bash
npm install
cp public/config.example.json public/config.json
# paste your public YNAB Client ID
npm run dev
```

Open http://localhost:5173/

## Create YNAB Developer app

1. YNAB → **Account Settings** → **Developer Settings** → **New Application**.
2. Register `http://localhost:5173` as a Redirect URI.
3. Enable **Default plan selection** on the OAuth app.
5. Copy the **Client ID** only. Never put a Client Secret in this repo or in `config.json`.
6. This app uses **Implicit Grant**, `response_type=token`, `scope=read-only`. Tokens last about two hours. There is no automatic toker refresh.

## Deploy to Cloudflare Pages

1. Build command: `npm run build`
2. Output directory: `dist`
3. Add environment variable `YNAB_CLIENT_ID` (your public Client ID). `public/config.json` is gitignored; the build copies the example and injects that ID.
4. Custom domain: `ynab-csp.chekalsky.com`. After the first deploy, set that origin (and the Pages `*.pages.dev` URL if you use it) as Redirect URIs on the YNAB app.
5. Do not enable Functions or a worker that proxies YNAB. The browser should keep calling `https://api.ynab.com/v1` itself.

`public/_redirects` sends `/privacy` and other paths to the SPA. `/config.json` is `Cache-Control: no-store`.

## How mapping works

`config.json` holds some heuristics to auto-map categories. Mark a category with certain text in its name or note and it will be auto-mapped to a CSP bucket. First match wins; category name and note beat the group name.

| Bucket | Matches |
| --- | --- |
| Ignore | `[CSP-Ignore]` |
| Fixed Costs | Mark with `[F]` or name your category Fixed expenses or Fixed Costs |
| Guilt-free spending | `[GF]` or Guilt-free, Wants |
| Investments | 📈 or Investments |
| Savings | `[S]`, 💰 or Savings |

Hidden and internal categories default to Ignore. Unmatched categories show as **Needs a bucket**. Any changes saved in your browser only. This app does not write tags back to YNAB.

Change `config.json` for your own custom mappings.
