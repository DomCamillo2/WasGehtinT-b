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
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={[
        "group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl-plus px-5",
        "text-sm font-semibold text-white shadow-cta",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "brand-gradient",
        className,
      ].join(" ")}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.28),transparent_52%)]"
        aria-hidden="true"
      />

      <span className="relative inline-flex items-center gap-2">
        {children}
        {withArrow ? (
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        ) : null}
      </span>
    </motion.button>
  );
}

export default PrimaryButton;
