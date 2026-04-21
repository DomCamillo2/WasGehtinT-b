import { getExternalEventById } from "@/lib/data";

export type ExternalEventPageModel = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  publicLat: number | null;
  publicLng: number | null;
  externalLink: string | null;
  vibeLabel: string;
  locationName: string | null;
  musicGenre: string | null;
};

export async function loadExternalEventPageData(eventId: string): Promise<ExternalEventPageModel | null> {
  const event = await getExternalEventById(eventId);

  if (!event) {
    return null;
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description ?? null,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    publicLat: event.public_lat ?? null,
    publicLng: event.public_lng ?? null,
    externalLink: event.external_link ?? null,
    vibeLabel: event.vibe_label,
    locationName: event.location_name ?? null,
    musicGenre: event.music_genre ?? null,
  };
}
