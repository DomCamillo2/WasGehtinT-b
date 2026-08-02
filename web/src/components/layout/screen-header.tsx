import Image from "next/image";
import Link from "next/link";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  return (
    <header className="mb-4 border-b border-[color:var(--border-soft)] pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/discover"
              className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              aria-label="Zu Discover"
            >
              <Image
                src={SITE_LOGO_SRC}
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
              />
              <p className="font-wordmark text-lg tracking-tight text-[color:var(--foreground)]">
                WasGehtTüb
              </p>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)]">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{subtitle}</p>
          ) : null}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
