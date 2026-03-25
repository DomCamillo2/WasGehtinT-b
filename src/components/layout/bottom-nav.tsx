"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Compass, House, Inbox, MessageCircle, Zap } from "lucide-react";

const NAV = [
  { href: "/discover", label: "Entdecken", icon: Compass },
  { href: "/spontan", label: "Spontan", icon: Zap },
  { href: "/host", label: "Host", icon: House },
  { href: "/requests", label: "Anfragen", icon: Inbox },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2">
      <ul className="mx-auto grid max-w-md grid-cols-5 rounded-2xl bg-white p-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition",
                    active ? "text-indigo-600" : "text-zinc-400",
                  )}
                >
                  <Icon size={18} strokeWidth={2.1} />
                  <span className="mt-1">{item.label}</span>
                </Link>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
