"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";
import { CirclePlus, Compass, Inbox, MessageCircle, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV = [
  { href: "/discover", label: "Entdecken", icon: Compass },
  { href: "/spontan", label: "Spontan", icon: Zap },
  { href: "/host", label: "Plus", icon: CirclePlus },
  { href: "/requests", label: "Anfragen", icon: Inbox },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of NAV) {
      if (!pathname.startsWith(item.href)) {
        router.prefetch(item.href);
      }
    }
  }, [pathname, router]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto max-w-md">
        <div className="mb-2 flex justify-end pr-1">
          <ThemeToggle />
        </div>
        <ul
          className="grid grid-cols-5 rounded-2xl border p-1 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur-md"
          style={{
            borderColor: "var(--nav-border)",
            backgroundColor: "var(--nav-bg)",
          }}
        >
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  href={item.href}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.href)}
                  onTouchStart={() => router.prefetch(item.href)}
                  onFocus={() => router.prefetch(item.href)}
                  className={clsx(
                    "flex h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition",
                    active
                      ? "scale-[1.04] bg-gradient-to-b from-fuchsia-100 to-violet-100 text-fuchsia-700 shadow-[0_8px_18px_rgba(217,70,239,0.25)]"
                      : "text-[color:var(--muted-foreground)]",
                  )}
                >
                  <Icon size={active ? 20 : 18} strokeWidth={2.2} />
                  <span className="mt-1">{item.label}</span>
                </Link>
              </motion.div>
            </li>
          );
        })}
        </ul>
      </div>
    </nav>
  );
}
