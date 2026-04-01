import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { Card } from "@/components/ui/card";

export default function FeedbackPage() {
  return (
    <AppShell>
      <ScreenHeader
        title="Feedback"
        subtitle="Schick uns Bugs, Lob oder neue Feature-Ideen direkt ins Admin-Panel."
      />

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900">Was wir gern lesen</p>
        <p className="text-sm text-zinc-600">
          Konkrete Beobachtungen helfen am meisten: Was fehlt dir, was ist unklar oder was sollte anders laufen?
        </p>
      </Card>

      <Card className="mt-3">
        <FeedbackForm />
      </Card>
    </AppShell>
  );
}
