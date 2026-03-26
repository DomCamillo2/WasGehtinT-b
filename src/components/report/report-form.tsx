"use client";

import { useActionState } from "react";
import { submitContentReportAction, type ReportActionState } from "@/app/actions/reports";

type Props = {
  targetType: string;
  targetId: string;
};

const initialState: ReportActionState = {};

export function ReportForm({ targetType, targetId }: Props) {
  const [state, action, pending] = useActionState(submitContentReportAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="type" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />

      <div className="space-y-1">
        <label htmlFor="reason" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Grund
        </label>
        <select
          id="reason"
          name="reason"
          required
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
          defaultValue=""
        >
          <option value="" disabled>
            Bitte auswählen
          </option>
          <option value="Beleidigung/Hassrede">Beleidigung/Hassrede</option>
          <option value="Gewaltandrohung oder strafbarer Inhalt">Gewaltandrohung oder strafbarer Inhalt</option>
          <option value="Sexuelle Belästigung">Sexuelle Belästigung</option>
          <option value="Spam/Fake">Spam/Fake</option>
          <option value="Sonstiger Verstoß">Sonstiger Verstoß</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="details" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Details (optional)
        </label>
        <textarea
          id="details"
          name="details"
          maxLength={2000}
          rows={4}
          placeholder="Kurze Beschreibung, warum der Inhalt gemeldet wird"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      {state.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sende..." : "Meldung absenden"}
      </button>
    </form>
  );
}
