"use client";

import { useActionState } from "react";
import { submitFeedbackAction, type FeedbackActionState } from "@/app/actions/feedback";
import { PrimaryButton } from "@/components/ui/primary-button";

const initialState: FeedbackActionState = {};

export function FeedbackForm() {
  const [state, action, pending] = useActionState(submitFeedbackAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="type" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Kategorie
        </label>
        <select
          id="type"
          name="type"
          defaultValue="feedback"
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
        >
          <option value="feedback">Feedback</option>
          <option value="feature_request">Feature Request</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="title" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Titel
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={4}
          maxLength={120}
          placeholder="Kurz zusammengefasst: was ist dein Punkt?"
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Nachricht
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder="Was laeuft gut, was stoert dich oder welches Feature wuenschst du dir?"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="contactEmail" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Kontakt-E-Mail (optional)
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          maxLength={160}
          placeholder="Falls wir Rueckfragen haben"
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      {state.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
      {state.success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      ) : null}

      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gesendet..." : "Absenden"}
      </PrimaryButton>
    </form>
  );
}
