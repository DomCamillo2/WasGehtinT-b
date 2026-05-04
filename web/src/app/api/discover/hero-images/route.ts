import type { PartyCard } from "@/lib/types";
import {
  MAX_DISCOVER_HERO_LOOKUPS_DEFAULT,
  resolveDiscoverHeroImagesForParties,
} from "@/lib/discover-event-images";

export const dynamic = "force-dynamic";

const MAX_BODY_PARTIES = 48;

type HeroImagesBody = {
  parties?: unknown;
};

function isPartyCardLite(value: unknown): value is PartyCard {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.title === "string" &&
    o.title.length > 0 &&
    typeof o.vibe_label === "string"
  );
}

export async function POST(request: Request) {
  let body: HeroImagesBody;
  try {
    body = (await request.json()) as HeroImagesBody;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const raw = body.parties;
  if (!Array.isArray(raw) || raw.length === 0) {
    return Response.json({ ok: false, error: "parties_required" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_PARTIES) {
    return Response.json({ ok: false, error: "too_many_parties" }, { status: 400 });
  }

  const parties: PartyCard[] = [];
  for (const item of raw) {
    if (!isPartyCardLite(item)) continue;
    parties.push(item);
  }
  if (!parties.length) {
    return Response.json({ ok: false, error: "no_valid_parties" }, { status: 400 });
  }

  const heroes = await resolveDiscoverHeroImagesForParties(parties, MAX_DISCOVER_HERO_LOOKUPS_DEFAULT);
  const slim: Record<string, string> = {};
  for (const [id, url] of Object.entries(heroes)) {
    if (typeof url === "string" && url.length > 0) slim[id] = url;
  }

  return Response.json({ ok: true, heroes: slim });
}
