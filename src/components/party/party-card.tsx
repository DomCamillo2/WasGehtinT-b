import { Card } from "@/components/ui/card";
import { RequestForm } from "@/components/party/request-form";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { BringProgress, PartyCard as PartyCardType } from "@/lib/types";

type Props = {
  party: PartyCardType;
  bringProgress: BringProgress[];
  bringItems: Array<{ id: string; item_name: string; quantity_needed: number }>;
};

const KUCKUCK_RED = "#b00000";
const CLUBHAUS_BLUE = "#1d4ed8";
const SCHLACHTHAUS_BROWN = "#7c2d12";

export function PartyCard({ party, bringProgress, bringItems }: Props) {
  const isExternal = party.is_external;
  const isKuckuck = party.vibe_label.toLowerCase().includes("kuckuck");
  const isClubhaus = party.vibe_label.toLowerCase().includes("clubhaus");
  const isSchlachthaus = party.vibe_label.toLowerCase().includes("schlachthaus");

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
            style={
              isKuckuck
                ? { color: KUCKUCK_RED }
                : isClubhaus
                  ? { color: CLUBHAUS_BLUE }
                  : isSchlachthaus
                    ? { color: SCHLACHTHAUS_BROWN }
                  : undefined
            }
          >
            {party.vibe_label}
          </p>
          <h3 className="text-lg font-semibold text-zinc-900">{party.title}</h3>
          <p className="text-sm text-zinc-500">{formatDateTime(party.starts_at)} Uhr</p>
        </div>
        {!isExternal ? (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            Beitrag {formatEuroFromCents(party.contribution_cents)}
          </span>
        ) : null}
      </div>

      {party.description ? <p className="text-sm text-zinc-700">{party.description}</p> : null}

      {!isExternal ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
          <p>Freie Plätze: {party.spots_left}</p>
          <p>Max Gäste: {party.max_guests}</p>
        </div>
      ) : null}

      {!isExternal && bringProgress.length ? (
        <div className="space-y-1 rounded-xl bg-zinc-50 p-2">
          <p className="text-xs font-medium text-zinc-600">Mitbring-Liste</p>
          {bringProgress.map((item) => (
            <p key={item.bring_item_id} className="text-xs text-zinc-700">
              {item.item_name}: offen {item.quantity_open} / benötigt {item.quantity_needed}
            </p>
          ))}
        </div>
      ) : null}

      {!isExternal ? (
        <RequestForm partyId={party.id} bringItems={bringItems} />
      ) : null}
    </Card>
  );
}
