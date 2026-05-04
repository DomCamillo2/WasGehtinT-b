import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "solid" | "ghost";
};

export function PrimaryButton({ className, tone = "solid", ...props }: Props) {
  return (
    <button
      className={clsx(
        "h-11 rounded-xl px-4 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50",
        tone === "solid"
          ? "brand-gradient text-white shadow-[0_10px_22px_rgba(127,44,226,0.34)] hover:brightness-110"
          : "bg-violet-100 text-violet-900 hover:bg-violet-200",
        className,
      )}
      {...props}
    />
  );
}
