import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "solid" | "ghost";
};

export function PrimaryButton({ className, tone = "solid", ...props }: Props) {
  return (
    <button
      className={clsx(
        "h-11 rounded-lg px-4 text-sm font-semibold transition-opacity disabled:opacity-50",
        tone === "solid"
          ? "bg-[var(--accent)] text-[var(--accent-dark-text,#2e1f1a)] shadow-[0_2px_8px_rgba(201,111,46,0.28)] hover:opacity-90"
          : "bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}
