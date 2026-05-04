import { PropsWithChildren } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { NewUiRootClass } from "@/components/layout/new-ui-root-class";

type Props = PropsWithChildren<{
  shellClassName?: string;
  mainClassName?: string;
  /** No horizontal/top padding on &lt;main&gt; — use for full-bleed pages (e.g. Discover v2 cards). */
  mainFlush?: boolean;
  showBottomNav?: boolean;
  showFooter?: boolean;
  theme?: "default" | "new";
}>;

export function AppShell({
  children,
  shellClassName,
  mainClassName,
  mainFlush = false,
  showBottomNav = true,
  showFooter = true,
  theme = "default",
}: Props) {
  const mainPad = mainFlush
    ? ""
    : `px-4 pt-4 lg:px-6 lg:pt-6 xl:px-8 xl:pt-8`;
  const isNewUi = theme === "new";

  return (
    <div
      className={`relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden lg:max-w-6xl xl:max-w-7xl ${
        isNewUi ? "discover-ui-v2" : ""
      } ${
        shellClassName ?? ""
      }`}
    >
      <NewUiRootClass enabled={isNewUi} />
      <main
        className={`relative flex-1 ${mainPad} ${showBottomNav ? "pb-32 lg:pb-20" : "pb-10"} ${mainClassName ?? ""}`}
      >
        {children}
      </main>
      {showFooter ? <Footer /> : null}
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
