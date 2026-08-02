import * as cheerio from "cheerio";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
import { ExternalSourceFetchError, fetchSourceText } from "@/lib/scrapers/source-fetch";
import { parseSchemaOrgDateTime } from "@/lib/timezone-berlin";
import {
  resolveTuebingenVenueCoordsFromText,
} from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";
import {
  CLUB_VOLTAIRE_URL,
  DAI_URL,
  SUDHAUS_URL,
  UNI_EVENTS_URL,
  collectLdJsonEventNodes,
  generateEventId,
  ldJsonTypeMatches,
  parseDateTimeFromText,
} from "@/lib/scrapers/shared";

async function fetchGenericCalendarEvents(config: {
  source: string;
  url: string;
  vibeLabel: string;
  locationName: string;
  categoryLabel: string;
  categorySlug: string;
  scope?: "daytime" | "nightlife" | "mixed";
  selectors?: string[];
  publicLat?: number | null;
  publicLng?: number | null;
}): Promise<PartyCard[]> {
  const resolved =
    Number.isFinite(config.publicLat) && Number.isFinite(config.publicLng)
      ? { lat: Number(config.publicLat), lng: Number(config.publicLng) }
      : resolveTuebingenVenueCoordsFromText(`${config.locationName} ${config.vibeLabel}`)?.coords ??
        null;
  const publicLat = resolved?.lat ?? null;
  const publicLng = resolved?.lng ?? null;
  try {
    const html = await fetchSourceText(config.source, config.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const $ = cheerio.load(html);
    const now = Date.now();
    const events: PartyCard[] = [];
    const seenIds = new Set<string>();

    // Prefer structured Event JSON-LD when present (Club Voltaire calendar, etc.).
    $("script[type=\"application/ld+json\"]").each((_, el) => {
      const raw = $(el).html();
      if (!raw) return;

      let data: unknown;
      try {
        data = JSON.parse(raw.trim());
      } catch {
        return;
      }

      const roots = Array.isArray(data) ? data : [data];
      for (const root of roots) {
        for (const node of collectLdJsonEventNodes(root)) {
          if (!node || typeof node !== "object") continue;
          const item = node as Record<string, unknown>;
          const typeField = item["@type"];
          if (!ldJsonTypeMatches(typeField, "Event") && !ldJsonTypeMatches(typeField, "MusicEvent")) {
            continue;
          }

          const name = String(item.name ?? "").trim();
          if (!name || name.length < 2) continue;

          const startRaw = item.startDate;
          const startStr = typeof startRaw === "string" ? startRaw : null;
          if (!startStr) continue;
          const startsAtDate = parseSchemaOrgDateTime(startStr);
          if (!startsAtDate) continue;
          if (startsAtDate.getTime() < now - 24 * 60 * 60 * 1000) continue;
          if (startsAtDate.getTime() > now + 160 * 24 * 60 * 60 * 1000) continue;

          let endsAtMs = startsAtDate.getTime() + 2 * 60 * 60 * 1000;
          if (typeof item.endDate === "string") {
            const parsedEnd = parseSchemaOrgDateTime(item.endDate);
            if (parsedEnd && parsedEnd.getTime() > startsAtDate.getTime()) {
              endsAtMs = parsedEnd.getTime();
            }
          }

          const urlField = item.url;
          const externalLink =
            typeof urlField === "string" && urlField.startsWith("http") ? urlField : config.url;

          const fallbackDescription = `${config.locationName} – ${config.categoryLabel}`;
          const rawDescription =
            typeof item.description === "string" && item.description.trim().length > 0
              ? item.description
              : fallbackDescription;
          const plainDescription = String(rawDescription)
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-z#0-9]+;/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 280);

          const displayTitle = sanitizeExternalEventTitle(name, {
            description: plainDescription || fallbackDescription,
            externalLink,
            fallback: config.vibeLabel,
          }).slice(0, 140);

          const eventId = generateEventId(config.source, startsAtDate, displayTitle);
          if (seenIds.has(eventId)) continue;
          seenIds.add(eventId);

          events.push({
            id: eventId,
            source: config.source,
            title: displayTitle,
            description: plainDescription || fallbackDescription,
            starts_at: startsAtDate.toISOString(),
            ends_at: new Date(endsAtMs).toISOString(),
            max_guests: 0,
            contribution_cents: 0,
            public_lat: publicLat,
            public_lng: publicLng,
            is_external: true,
            external_link: externalLink,
            vibe_label: config.vibeLabel,
            spots_left: 0,
            location_name: config.locationName,
            category_slug: config.categorySlug,
            category_label: config.categoryLabel,
            event_scope: config.scope ?? "daytime",
            is_all_day: false,
            audience_label: "Alle",
            price_info: null,
          } as PartyCard);
        }
      }
    });

    if (events.length > 0) {
      return events
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 40);
    }

    const selectors = config.selectors ?? [
      "article",
      ".event",
      ".veranstaltung",
      ".calendar-entry",
      "li",
    ];

    const candidates = new Set<string>();
    for (const selector of selectors) {
      $(selector)
        .toArray()
        .forEach((node) => {
          const text = $(node).text().replace(/\s+/g, " ").trim();
          if (text.length >= 24 && text.length <= 400) {
            candidates.add(text);
          }
        });
    }

    for (const candidate of Array.from(candidates).slice(0, 120)) {
      const startsAtDate = parseDateTimeFromText(candidate);
      if (!startsAtDate) continue;
      if (startsAtDate.getTime() < now - 24 * 60 * 60 * 1000) continue;
      if (startsAtDate.getTime() > now + 160 * 24 * 60 * 60 * 1000) continue;

      const rawTitle = candidate
        .replace(/^\d{1,2}\.\d{1,2}\.(\d{2,4})?\s*[|:-]?\s*/g, "")
        .replace(/\b\d{1,2}[:.]\d{2}\b/g, "")
        .trim()
        .slice(0, 120);
      if (!rawTitle || rawTitle.length < 4) continue;

      const title = sanitizeExternalEventTitle(rawTitle, {
        description: `${config.locationName} – ${config.categoryLabel}`,
        externalLink: config.url,
        fallback: config.vibeLabel,
      }).slice(0, 140);

      const eventId = generateEventId(config.source, startsAtDate, title);
      if (seenIds.has(eventId)) continue;
      seenIds.add(eventId);

      events.push({
        id: eventId,
        source: config.source,
        title,
        description: `${config.locationName} – ${config.categoryLabel}`,
        starts_at: startsAtDate.toISOString(),
        ends_at: new Date(startsAtDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        max_guests: 0,
        contribution_cents: 0,
        public_lat: publicLat,
        public_lng: publicLng,
        is_external: true,
        external_link: config.url,
        vibe_label: config.vibeLabel,
        spots_left: 0,
        location_name: config.locationName,
        category_slug: config.categorySlug,
        category_label: config.categoryLabel,
        event_scope: config.scope ?? "daytime",
        is_all_day: false,
        audience_label: "Alle",
        price_info: null,
      } as PartyCard);
    }

    return events.slice(0, 40);
  } catch (error) {
    if (error instanceof ExternalSourceFetchError) {
      throw error;
    }
    console.error(`Error fetching ${config.source} events:`, error);
    throw new ExternalSourceFetchError(
      config.source,
      `Parse/fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}


export async function fetchUniCalendarEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "uni-tuebingen",
    url: UNI_EVENTS_URL,
    vibeLabel: "Uni Tübingen",
    locationName: "Universität Tübingen",
    categoryLabel: "Workshop",
    categorySlug: "workshop",
    scope: "daytime",
  });
}

export async function fetchSudhausEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "sudhaus",
    url: SUDHAUS_URL,
    vibeLabel: "Sudhaus",
    locationName: "Sudhaus Tübingen",
    categoryLabel: "Kultur",
    categorySlug: "culture",
    scope: "daytime",
  });
}

export async function fetchClubVoltaireEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "club-voltaire",
    url: CLUB_VOLTAIRE_URL,
    vibeLabel: "Club Voltaire",
    locationName: "Club Voltaire Tübingen",
    categoryLabel: "Party",
    categorySlug: "party",
    scope: "nightlife",
  });
}

export async function fetchDaiEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "dai",
    url: DAI_URL,
    vibeLabel: "d.a.i.",
    locationName: "d.a.i. Tübingen",
    categoryLabel: "Kultur",
    categorySlug: "culture",
    scope: "daytime",
  });
}

