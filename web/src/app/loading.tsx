import { AppShell } from "@/components/layout/app-shell";

export default function Loading() {
  return (
    <AppShell theme="new" showBottomNav={false} showFooter={false} mainFlush>
      <div className="discover-ui-v2 flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className="h-9 w-9 rounded-full border-2 border-[#2a221d] border-t-[#ff7a18] animate-spin"
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-[#8c8178]">Lädt …</p>
        <span className="sr-only">Seite wird geladen</span>
      </div>
    </AppShell>
  );
}
