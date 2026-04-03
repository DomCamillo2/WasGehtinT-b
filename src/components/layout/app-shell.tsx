import { PropsWithChildren } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

type Props = PropsWithChildren<{
  shellClassName?: string;
  mainClassName?: string;
}>;

export function AppShell({ children, shellClassName, mainClassName }: Props) {
  return (
    <div
      className={`relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden ${
        shellClassName ?? ""
      }`}
    >
      <main className={`relative flex-1 px-4 pb-32 pt-4 ${mainClassName ?? ""}`}>{children}</main>
      <BottomNav />
    </div>
  );
}
