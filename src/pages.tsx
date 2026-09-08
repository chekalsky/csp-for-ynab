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
      <p className="eyebrow">YNAB · Conscious Spending Plan</p>
      <h1>See your plan as four buckets.</h1>
      <p className="lede">
        Fixed costs, investments, savings, guilt-free. Your numbers stay in this
        browser. Nothing is written back to YNAB.
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
        Read-only access. The token lasts about two hours, then you connect
        again. <a href="/privacy">Privacy</a>
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
        buckets. It is a static page. It does not operate a server that stores
        your budget.
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
        After you approve access, YNAB puts an access token in the URL fragment.
        This page stores that token, a cache of plan figures, and your bucket
        overrides in <code>localStorage</code> on this device. Your browser
        talks to <code>https://api.ynab.com/v1</code> directly. Money data is
        not sent to us.
      </p>
      <h2>How to wipe it</h2>
      <p>
        Use Reset to clear cached figures and bucket overrides on this device.
        Use Disconnect to sign out and wipe the token too. You can also clear
        this site’s data in your browser, or revoke the app in YNAB → Account
        Settings → Developer Settings.
      </p>
      <h2>Tokens</h2>
      <p>
        Implicit-grant tokens expire after about two hours. This app does not
        use refresh tokens or a Client Secret.
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
