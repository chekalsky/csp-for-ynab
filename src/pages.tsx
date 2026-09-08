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
      <p className="eyebrow">YNAB × Conscious Spending Plan</p>
      <h1>See your plan as four buckets.</h1>
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
      <p className="lede">
        Connect read-only. We guess buckets from category names and notes; you
        fix the rest. Your numbers stay in this browser. Nothing is written
        back to YNAB.
      </p>
      {props.error && <p className="banner err">{props.error}</p>}
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
        Read-only access. The token lasts about two hours, then you need to
        connect again. We do not track or collect personal information.{" "}
        <a href="/privacy">Privacy</a>
      </p>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <main className="doc">
      <p className="eyebrow">
        <a href="/">YNAB CSP</a>
      </p>
      <h1>Privacy</h1>
      <p>
        This app maps a YNAB plan onto Ramit Sethi’s four Conscious Spending
        buckets. It runs in your browser, data never leaves your computer.
      </p>
      <h2>What we ask YNAB for</h2>
      <p>
        Read-only access: the list of plans, category groups, category names and
        notes, and monthly Assigned (<code>budgeted</code>) and Activity (
        <code>activity</code>) amounts. We do not request write access. We do
        not read the transaction register.
      </p>
      <h2>Where data lives</h2>
      <p>
        It stores YNAB access token, a cache, and your bucket
        overrides in <code>localStorage</code> on this device. Money data never sent anywhere.
      </p>
      <h2>How to wipe it</h2>
      <p>
        Use Reset all to sign out and wipe the token, cache, and bucket
        overrides on this device. You can also clear this site’s data in your
        browser, or revoke the app in YNAB → Account Settings → Developer
        Settings.
      </p>
      <p className="fine">
        <a href="/">Back</a>
      </p>
    </main>
  );
}

export function BootError(props: { message: string }) {
  return (
    <main className="connect">
      <h1>Config missing</h1>
      <p className="lede">{props.message}</p>
      <p className="fine">
        <a href="/privacy">Privacy</a>
      </p>
    </main>
  );
}
