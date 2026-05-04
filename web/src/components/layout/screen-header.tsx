import Image from "next/image";
import Link from "next/link";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  return (
    <header
      className="surface-card mb-4 rounded-[24px] p-4"
      style={{
        background:
          "linear-gradient(160deg, color-mix(in srgb, var(--accent) 12%, var(--surface-card) 88%), var(--surface-card))",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Image
              src={SITE_LOGO_SRC}
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
              {"WasGehtT\u00fcb"}
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)]">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile"
            className="grid h-10 w-10 place-items-center rounded-2xl border text-xs font-bold text-[color:var(--foreground)] transition active:scale-[0.99]"
            style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-soft)" }}
            aria-label={"Profil \u00f6ffnen"}
          >
            P
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="h-10 rounded-2xl border px-3 text-xs font-semibold text-[color:var(--foreground)] transition active:scale-[0.99]"
              style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-soft)" }}
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
