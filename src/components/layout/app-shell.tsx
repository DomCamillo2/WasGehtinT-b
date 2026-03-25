import { PropsWithChildren } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-zinc-50">
      <main className="relative flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
