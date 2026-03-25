import clsx from "clsx";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ className?: string }>;

export function Card({ className, children }: Props) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/80 bg-white/95 p-4 shadow-md backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}
