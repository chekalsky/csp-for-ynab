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

Push to `main` runs GitHub Actions: build, then Wrangler uploads `dist/`.

Secrets (repo → Settings → Secrets and variables → Actions):

- `YNAB_CLIENT_ID` — public YNAB Client ID, baked into `/config.json`
- `CLOUDFLARE_API_TOKEN` — [Create token](https://dash.cloudflare.com/profile/api-tokens) with **Account / Cloudflare Pages / Edit**
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard URL or `wrangler whoami`

Local: `npm run deploy` (uses `public/config.json` on disk).

Production: `https://ynab-csp.chekalsky.com`.

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
