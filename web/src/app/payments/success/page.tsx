import Link from "next/link";
import { confirmCheckoutBySession } from "@/app/actions/payments";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";

type SearchParams = Promise<{ session_id?: string }>;

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionId = params.session_id ?? "";

  if (sessionId) {
    await confirmCheckoutBySession(sessionId);
  }

  return (
    <AppShell theme="new">
      <ScreenHeader title="Zahlung" subtitle="Beitrag und Service-Gebühr" />
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Zahlung erfolgreich</h2>
        <p className="text-sm text-zinc-600">
          Deine Umlage wurde erfolgreich bestätigt. Du findest den aktualisierten Status in deinen
          Anfragen.
        </p>
        <Link
          href="/requests"
          className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white"
        >
          Zu meinen Anfragen
        </Link>
      </Card>
    </AppShell>
  );
}
