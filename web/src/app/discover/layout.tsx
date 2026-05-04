import type { ReactNode } from "react";
import { NewUiRootClass } from "@/components/layout/new-ui-root-class";

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NewUiRootClass enabled />
      {children}
    </>
  );
}
