import { PropsWithChildren } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";

type Props = PropsWithChildren<{
  shellClassName?: string;
  mainClassName?: string;
  showBottomNav?: boolean;
  showFooter?: boolean;
}>;

export function AppShell({
  children,
  shellClassName,
  mainClassName,
  showBottomNav = true,
  showFooter = true,
}: Props) {
  return (
    <div
      className={`relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden lg:max-w-6xl xl:max-w-7xl ${
        shellClassName ?? ""
      }`}
    >
      <main
        className={`relative flex-1 px-4 ${showBottomNav ? "pb-32 lg:pb-20" : "pb-10"} pt-4 lg:px-6 lg:pt-6 xl:px-8 ${
          mainClassName ?? ""
        }`}
      >
        {children}
      </main>
      {showFooter ? <Footer /> : null}
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
