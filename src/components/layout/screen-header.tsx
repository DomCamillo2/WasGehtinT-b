import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  return (
    <header
      className="mb-4 rounded-2xl border p-3 shadow-sm backdrop-blur"
      style={{
        borderColor: "var(--nav-border)",
        backgroundColor: "color-mix(in srgb, var(--surface-elevated) 80%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">WasGehtTüb</p>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)]">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="grid h-9 w-9 place-items-center rounded-xl border bg-[color:var(--surface-elevated)] text-xs font-bold text-[color:var(--foreground)] transition active:scale-[0.99]"
            style={{ borderColor: "var(--nav-border)" }}
            aria-label="Profil öffnen"
          >
            P
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="h-9 rounded-xl border bg-[color:var(--surface-elevated)] px-3 text-xs font-semibold text-[color:var(--foreground)] transition active:scale-[0.99]"
              style={{ borderColor: "var(--nav-border)" }}
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
