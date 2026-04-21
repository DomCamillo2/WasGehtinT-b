import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { loadPartyAddressPageData } from "@/services/parties/party-address-service";

export default async function PartyAddressPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;

  const data = await loadPartyAddressPageData(partyId);
  if (!data) {
    notFound();
  }

  return (
    <AppShell>
      <ScreenHeader title="Adresse" subtitle="Nur nach erfolgreichem Match sichtbar" />
      <Card className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">{data.partyTitle}</h2>
        {data.location ? (
          <>
            <p className="text-sm text-zinc-700">
              {data.location.street} {data.location.houseNumber}
            </p>
            <p className="text-sm text-zinc-700">
              {data.location.postalCode} {data.location.city}
            </p>
            {data.location.addressNote ? (
              <p className="text-sm text-zinc-500">Hinweis: {data.location.addressNote}</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-500">Adresse wurde noch nicht hinterlegt.</p>
        )}
      </Card>
      <Link href="/requests" className="mt-3 text-sm font-semibold text-zinc-700">
        ← Zurück zu meinen Anfragen
      </Link>
    </AppShell>
  );
}
