import { isPlaceholderClientId } from "./config";
import type { AppConfig } from "./types";

export function ConnectPage(props: {
  config: AppConfig;
  authorizeUrl: string;
  error: string | null;
}) {
  const placeholder = isPlaceholderClientId(props.config.ynabClientId);
  return (
    <main className="connect">
      <div className="masthead">
        <div>
          <p className="eyebrow">Conscious Spending Plan for YNAB</p>
          <h1>See your plan as four buckets.</h1>
        </div>
        <WorksWithYnab />
      </div>
      <p className="lede">
        Ramit Sethi’s Conscious Spending Plan is simple: fund the boring stuff,
        then spend the rest on purpose. This app maps your YNAB categories onto
        those four buckets and shows you the charts.
      </p>
      <ul className="pitch">
        <li>
          <i style={{ background: "var(--fixed)" }} aria-hidden />
          <div>
            <strong>Fixed costs</strong>
            <span>Housing, bills, subscriptions — the non-negotiables.</span>
          </div>
        </li>
        <li>
          <i style={{ background: "var(--investments)" }} aria-hidden />
          <div>
            <strong>Investments</strong>
            <span>Money meant to grow, not sit in a sinking fund.</span>
          </div>
        </li>
        <li>
          <i style={{ background: "var(--savings)" }} aria-hidden />
          <div>
            <strong>Savings</strong>
            <span>Named goals and sinking funds: travel, taxes, a new laptop.</span>
          </div>
        </li>
        <li>
          <i style={{ background: "var(--guilt)" }} aria-hidden />
          <div>
            <strong>Guilt-free spending</strong>
            <span>The fun you already decided to have.</span>
          </div>
        </li>
      </ul>
      {props.error && <p className="banner err">{props.error}</p>}
      <div className="cta-block">
        {placeholder ? (
          <div className="callout">
            <strong>Add your public Client ID</strong>
            <p>
              Copy <code>public/config.example.json</code> to{" "}
              <code>public/config.json</code>. Paste the Client ID from YNAB →
              Account Settings → Developer Settings. Never put a Client Secret in
              this app.
            </p>
          </div>
        ) : (
          <a className="cta" href={props.authorizeUrl}>
            Connect to YNAB
          </a>
        )}
        <p className="fine">
          Read-only access. The token stays in this tab. We do not track or
          collect personal information. <a href="/privacy">Privacy</a>.
        </p>
      </div>
      <p className="fine byline">
        Created with <span className="heart" aria-label="love">♥</span> in
        Amsterdam by{" "}
        <a href="https://chekalsky.com">Ilya Chekalsky</a>
      </p>
      <Attribution />
    </main>
  );
}

function WorksWithYnab() {
  return (
    <a className="ynab-badge" href="https://api.ynab.com/">
      <img
        src="https://api.ynab.com/papi/works_with_ynab.svg"
        alt="Works with YNAB"
        height={40}
      />
    </a>
  );
}

function Attribution() {
  return (
    <div className="legal">
      <p>
        We are not affiliated, associated, or in any way officially connected
        with YNAB or any of its subsidiaries or affiliates. The official YNAB
        website can be found at{" "}
        <a href="https://www.ynab.com">https://www.ynab.com</a>.
      </p>
      <p>
        The names YNAB and You Need A Budget, as well as related names,
        tradenames, marks, trademarks, emblems, and images are registered
        trademarks of YNAB.
      </p>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <main className="doc">
      <div className="masthead">
        <div>
          <p className="eyebrow">
            <a href="/">Conscious Spending Plan for YNAB</a>
          </p>
          <h1>Privacy</h1>
        </div>
        <WorksWithYnab />
      </div>
      <p>
        Conscious Spending Plan for YNAB maps a YNAB plan onto Ramit Sethi’s
        four Conscious Spending buckets and shows you the resulting charts. That is the only
        purpose. We do not sell data, show ads, or run analytics.
      </p>
      <h2>What we ask YNAB for</h2>
      <p>
        Read-only OAuth access: the list of plans, category groups, category
        names and notes, and monthly Assigned and Activity amounts. We do not
        request write access. We do not read the transaction register. Your
        browser talks to <code>https://api.ynab.com</code> directly.
      </p>
      <h2>Where data lives</h2>
      <p>
        Nothing is uploaded to this app’s host. Cloudflare Pages only serves the
        static files. YNAB money data never goes there.
      </p>
      <p>
        The access token stays in <code>sessionStorage</code> in this browser
        tab until it expires (about two hours) or you close the tab. A cache of
        plan names, categories, and monthly totals, plus your bucket overrides,
        stays in <code>localStorage</code> on this device until you wipe it. None
        of that is encrypted beyond what the browser already does. We do not
        pass YNAB data to any other third party.
      </p>
      <h2>How to wipe it</h2>
      <p>
        Use <code>Reset all</code> to sign out and delete the token, cache, and
        overrides on this device. You can also revoke the app in YNAB → Account
        Settings → Authorized Applications. Questions:{" "}
        <a href="https://chekalsky.com">chekalsky.com</a>.
      </p>
      <p className="fine">Last updated 8 September 2026.</p>
      <p className="fine">
        <a href="/">Back</a>
      </p>
      <Attribution />
    </main>
  );
}

export function BootError(props: { message: string }) {
  return (
    <main className="connect">
      <div className="masthead">
        <h1>Config missing</h1>
        <WorksWithYnab />
      </div>
      <p className="lede">{props.message}</p>
      <p className="fine">
        <a href="/privacy">Privacy</a>
      </p>
    </main>
  );
}
