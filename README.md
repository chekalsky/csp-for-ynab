# Conscious Spending Plan for YNAB

See a [YNAB](https://www.ynab.com/) plan as [Ramit Sethi’s](https://www.iwillteachyoutoberich.com/conscious-spending-basics/) four Conscious Spending buckets: **Fixed Costs**, **Investments**, **Savings**, and **Guilt-free spending**.

Your financial data never leaves your browser.

[![Works with YNAB](https://api.ynab.com/papi/works_with_ynab.svg)](https://api.ynab.com/)

## Try Live With No Setup

[csp-for-ynab.chekalsky.com](https://csp-for-ynab.chekalsky.com/) · [Privacy](https://csp-for-ynab.chekalsky.com/privacy)

Connect with YNAB (read-only), map categories to the four buckets, and enjy the charts. Nothing is written back to YNAB.

## Run locally

```bash
npm install
cp public/config.example.json public/config.json
# paste your public YNAB Client ID
npm run dev
```

Open http://localhost:5173/

## Create a YNAB OAuth app

OAuth is how YNAB shares access without you handing over a password. Every app needs its own OAuth credentials.

1. Log in to YNAB, open [Developer Settings](https://app.ynab.com/settings/developer), and [New Application](https://app.ynab.com/oauth/applications/new).
2. Set **Redirect URI(s)** (trailing slash required). Register every origin you will use:
   - `http://localhost:5173/`
   - `https://csp-for-ynab.chekalsky.com/`
3. Enable **Default plan selection** so the authorize screen picks the plan this app opens.
4. Copy the **Client ID** only. This app uses the [Implicit Grant](https://api.ynab.com/#oauth-implicit-grant) (`response_type=token`, `scope=read-only`). Tokens last about two hours. There is no refresh token and no Client Secret.

New apps start in [Restricted Mode](https://api.ynab.com/#oauth-restricted-mode): you can connect unlimited times; other people share a pool of 25 authentications until YNAB reviews the app.

## Deploy

Push to `main` runs GitHub Actions: build, then Wrangler uploads `dist/` to Cloudflare Pages.

Secrets (repo → Settings → Secrets and variables → Actions):

- `YNAB_CLIENT_ID` — public YNAB Client ID, baked into `/config.json` at build time
- `CLOUDFLARE_API_TOKEN` — [Create token](https://dash.cloudflare.com/profile/api-tokens) with **Account / Cloudflare Pages / Edit**
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard URL or `wrangler whoami`

Local deploy: `npm run deploy` (uses `public/config.json` on disk).

## How mapping works

`config.json` holds heuristics to auto-map categories. Mark a category with certain text in its name or note and it will be auto-mapped to a CSP bucket. First match wins; category name and note beat the group name.

| Bucket | Matches |
| --- | --- |
| Ignore | `[CSP-Ignore]` |
| Fixed Costs | `[CSP-Fixed]`, Fixed Expenses, Fixed Costs |
| Guilt-free spending | `[CSP-GuiltFree]`, Guilt-Free |
| Investments | `[CSP-Investments]`, Investments, 📈 |
| Savings | `[CSP-Savings]`, Savings, 💰 |

Hidden and internal categories default to Ignore. Unmatched categories show as **Needs a bucket**. Any changes are saved in your browser only. This app does not write tags back to YNAB.

Change `config.json` for your own mappings.

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0). Personal and other non-commercial use only. Commercial use needs [permission](https://chekalsky.com). Pull requests welcome; by opening a PR you license your changes under these same terms.
