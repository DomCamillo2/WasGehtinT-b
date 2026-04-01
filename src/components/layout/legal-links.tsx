import Link from "next/link";
import clsx from "clsx";

type Props = {
  className?: string;
};

export function LegalLinks({ className }: Props) {
  return (
    <nav
      aria-label="Rechtliche Links"
      className={clsx("text-center text-xs text-zinc-500", className)}
    >
      <Link href="/impressum" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
        Impressum
      </Link>
      <span className="mx-2">•</span>
      <Link href="/nutzungsbedingungen" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
        AGB
      </Link>
      <span className="mx-2">•</span>
      <Link href="/datenschutz" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
        Datenschutz
      </Link>
      <span className="mx-2">â€¢</span>
      <Link href="/feedback" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
        Feedback
      </Link>
    </nav>
  );
}
