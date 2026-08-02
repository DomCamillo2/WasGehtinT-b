import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function NotFound() {
  return (
    <AppShell theme="new" showBottomNav={false} showFooter={false}>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="font-wordmark text-3xl tracking-tight text-[color:var(--foreground)]">
          WasGehtTüb
        </p>
        <h1 className="mt-4 text-xl font-semibold text-[color:var(--foreground)]">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
          Der Link ist tot oder das Event ist vorbei. Zurück zum Radar.
        </p>
        <Link
          href="/discover"
          className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[color:var(--accent)] px-5 text-sm font-semibold text-[color:var(--accent-dark-text)]"
        >
          Entdecken
        </Link>
      </div>
    </AppShell>
  );
}
