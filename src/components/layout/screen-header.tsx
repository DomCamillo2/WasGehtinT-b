import { signOutAction } from "@/app/actions/auth";

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  return (
    <header className="mb-4 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">WasGehtTüb</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition active:scale-[0.99]"
          >
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}
