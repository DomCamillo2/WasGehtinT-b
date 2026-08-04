import { AppShell } from "@/components/layout/app-shell";

export default function Loading() {
  return (
    <AppShell theme="new" showBottomNav={false} showFooter={false} mainFlush>
      <div className="discover-ui-v2 flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[color:var(--border-soft)] border-t-[#c4783a]"
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Lädt …</p>
        <span className="sr-only">Seite wird geladen</span>
      </div>
    </AppShell>
  );
}
