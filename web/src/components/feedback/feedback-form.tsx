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
        <label htmlFor="type" className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Kategorie
        </label>
        <select
          id="type"
          name="type"
          defaultValue="feedback"
          className="field-surface h-12 w-full rounded-2xl px-3 text-sm outline-none focus:border-indigo-400"
        >
          <option value="feedback">Feedback</option>
          <option value="feature_request">Feature Request</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="title" className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Titel
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={4}
          maxLength={120}
          placeholder="Kurz zusammengefasst: was ist dein Punkt?"
          className="field-surface h-12 w-full rounded-2xl px-3 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Nachricht
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder="Was läuft gut, was stört dich oder welches Feature wünschst du dir?"
          className="field-surface w-full rounded-2xl px-3 py-3 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="contactEmail" className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Kontakt-E-Mail (optional)
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          maxLength={160}
          placeholder="Falls wir Rückfragen haben"
          className="field-surface h-12 w-full rounded-2xl px-3 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      {state.error ? <p className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? (
        <p className="rounded-2xl px-3 py-2 text-sm text-emerald-300" style={{ backgroundColor: "var(--success-soft)" }}>
          {state.success}
        </p>
      ) : null}

      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Wird gesendet..." : "Absenden"}
      </PrimaryButton>
    </form>
  );
}
