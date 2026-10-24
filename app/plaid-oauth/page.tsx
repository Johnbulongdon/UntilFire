import type { Metadata } from "next";

// Where banks that log in on their own site send people back after Plaid OAuth.
// On an iPhone with UntilFire installed the universal link opens the app and
// this page never shows; it only appears if the link opened in a browser.
export const metadata: Metadata = {
  title: "Back to UntilFire",
  robots: { index: false, follow: false },
};

export default function PlaidOAuthReturn() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--uf-ground)] text-[var(--uf-ink)]">
      <div className="max-w-sm text-center">
        <h1 className="uf-t-h2 mb-3">Almost done</h1>
        <p className="uf-t-body text-[var(--uf-ink-2)]">Open the UntilFire app to finish. You can close this page.</p>
      </div>
    </main>
  );
}
