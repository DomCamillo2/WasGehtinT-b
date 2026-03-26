import { AppShell } from "@/components/layout/app-shell";

export default function Loading() {
  return (
    <AppShell>
      <div className="space-y-3 pt-2">
        <div className="h-7 w-36 animate-pulse rounded-xl bg-zinc-200" />
        <div className="h-20 animate-pulse rounded-2xl bg-zinc-200" />
        <div className="h-20 animate-pulse rounded-2xl bg-zinc-200" />
        <div className="h-20 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    </AppShell>
  );
}
