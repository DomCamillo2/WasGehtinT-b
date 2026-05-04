import { Suspense, type ReactNode } from "react";
import { DiscoverUiNewRootClass } from "@/components/discover/discover-ui-new-root-class";

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DiscoverUiNewRootClass />
      </Suspense>
      {children}
    </>
  );
}
