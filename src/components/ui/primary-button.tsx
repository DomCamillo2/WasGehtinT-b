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
          ? "bg-zinc-900 text-white hover:bg-zinc-700"
          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        className,
      )}
      {...props}
    />
  );
}
