"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

type PrimaryButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
  withArrow?: boolean;
};

export function PrimaryButton({
  children,
  className = "",
  withArrow = true,
  ...props
}: PrimaryButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={[
        "group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-lg px-5",
        "text-sm font-semibold text-[var(--accent-dark-text,#2e1f1a)] shadow-cta",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "bg-[var(--accent)] hover:opacity-90",
        className,
      ].join(" ")}
      {...props}
    >
      <span className="relative inline-flex items-center gap-2">
        {children}
        {withArrow ? (
          <ArrowRight size={16} aria-hidden="true" />
        ) : null}
      </span>
    </motion.button>
  );
}

export default PrimaryButton;
