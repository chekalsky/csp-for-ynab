import type { ReactNode } from "react";
import { isPlaceholderClientId } from "./config";
import type { AppConfig } from "./types";

const IWT_URL = "https://www.iwillteachyoutoberich.com/";
const CSP_ARTICLE =
  "https://www.iwillteachyoutoberich.com/conscious-spending-basics/";
const YNAB_URL = "https://www.ynab.com";

function ExtLink(props: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={props.href}
      className={props.className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {props.children}
    </a>
  );
}

export function CspName() {
  return <ExtLink href={CSP_ARTICLE}>Conscious Spending Plan</ExtLink>;
}

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
          <p className="eyebrow">
            Conscious Spending Plan for YNAB
          </p>
          <h1>See your plan as four buckets.</h1>
        </div>
        <WorksWithYnab />
      </div>
      <p className="lede">
        <ExtLink href={IWT_URL}>Ramit Sethi</ExtLink>’s <CspName /> is simple: fund the
        boring stuff, then spend the rest on purpose. This app maps your{" "}
        <ExtLink href={YNAB_URL}>YNAB</ExtLink> categories onto those four
        buckets and shows you the charts.
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
            <LockIcon />
            Connect to YNAB
          </a>
        )}
        <p className="fine">
          Read-only access. The token never leaves this tab.<br/>
          I do not track or
          collect your personal information. <a href="/privacy">Privacy</a>.
        </p>
      </div>
      <p className="fine byline">
        Created with <span className="heart" aria-label="love">♥</span> in
        Amsterdam by{" "}
        <a href="https://chekalsky.com">Ilya Chekalsky</a> ·{" "}
        <a href="https://github.com/chekalsky/csp-for-ynab">Source</a>
      </p>
      <Attribution />
    </main>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
    >
      <path d="M5 7V5a3 3 0 1 1 6 0v2h1.25c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25h-7.5C3.56 15 3 14.44 3 13.75v-5.5C3 7.56 3.56 7 4.25 7H5Zm1.25 0h3.5V5a1.75 1.75 0 1 0-3.5 0v2Z" />
    </svg>
  );
}

function WorksWithYnab() {
  return (
    <ExtLink className="ynab-badge" href="https://api.ynab.com/">
      <img
        src="https://api.ynab.com/papi/works_with_ynab.svg"
        alt="Works with YNAB"
        height={40}
      />
    </ExtLink>
  );
}

export function Attribution() {
  return (
    <div className="legal">
      <p>
        I am not affiliated, associated, or in any way officially connected with
        YNAB or any of its subsidiaries or affiliates. The official YNAB website
        can be found at <ExtLink href={YNAB_URL}>{YNAB_URL}</ExtLink>.
      </p>
      <p>
        The names YNAB and You Need A Budget, as well as related names,
        tradenames, marks, trademarks, emblems, and images are registered
        trademarks of YNAB.
      </p>
      <p>
        I am not affiliated, associated, or in any way officially connected with
        Ramit Sethi or I Will Teach You To Be Rich. The{" "}
        <CspName /> is described at{" "}
        <ExtLink href={IWT_URL}>iwillteachyoutoberich.com</ExtLink>.
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
        <CspName /> for YNAB maps a YNAB plan onto{" "}
        <ExtLink href={IWT_URL}>Ramit Sethi</ExtLink>’s four Conscious Spending buckets and
        shows you the resulting charts. That is the only purpose. We do not sell
        data, show ads, or run analytics.
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
        plan names, categories, and monthly totals, plus your bucket overrides
        and last date range, stays in <code>localStorage</code> on this device
        until you wipe it. None
        of that is encrypted beyond what the browser already does. We do not
        pass YNAB data to any other third party.
      </p>
      <h2>How to wipe it</h2>
      <p>
        Use <code>Log out</code> to sign out and delete the token, cache, and
        category overrides on this device. You can also revoke the app in YNAB → Account
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
