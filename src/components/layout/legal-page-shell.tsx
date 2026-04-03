import Link from "next/link";
import { PropsWithChildren, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type LegalSectionProps = PropsWithChildren<{
  title: string;
  className?: string;
}>;

type LegalPageShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export function LegalPageShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}: LegalPageShellProps) {
  return (
    <AppShell mainClassName="px-4 pb-28 pt-5">
      <div className="surface-card relative overflow-hidden rounded-[28px] px-5 py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-80"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, #38bdf8 10%, transparent))",
          }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-[2rem] font-black leading-tight tracking-tight text-[color:var(--foreground)]">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">
                {description}
              </p>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href="/discover"
              className="inline-flex items-center rounded-full px-3 py-1.5"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-strong)",
              }}
            >
              Zur Discover-Seite
            </Link>
            <Link
              href="/feedback"
              className="inline-flex items-center rounded-full px-3 py-1.5"
              style={{
                backgroundColor: "var(--surface-soft)",
                color: "var(--foreground)",
              }}
            >
              Feedback senden
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">{children}</div>

      {footer ? (
        <div className="mt-5 text-sm leading-6 text-[color:var(--muted-foreground)]">{footer}</div>
      ) : null}
    </AppShell>
  );
}

export function LegalSection({ title, className, children }: LegalSectionProps) {
  return (
    <section className={`surface-card rounded-[24px] px-4 py-4 ${className ?? ""}`.trim()}>
      <h2 className="text-base font-semibold text-[color:var(--foreground)]">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
        {children}
      </div>
    </section>
  );
}
