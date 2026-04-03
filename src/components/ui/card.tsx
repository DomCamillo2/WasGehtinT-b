import clsx from "clsx";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ className?: string }>;

export function Card({ className, children }: Props) {
  return (
    <section
      className={clsx(
        "surface-card rounded-[24px] p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}
