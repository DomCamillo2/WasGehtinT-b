import * as cheerio from "cheerio";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
import { ExternalSourceFetchError, fetchSourceText } from "@/lib/scrapers/source-fetch";
import { berlinDayKeyFromDate, berlinWallTimeToUtc } from "@/lib/timezone-berlin";
import { resolveTuebingenVenueCoordsFromText, TUEBINGEN_VENUE_COORDS } from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";
import { PARTYKEL_URL, generateEventId } from "@/lib/scrapers/shared";

export async function fetchPartykelEvents(): Promise<PartyCard[]> {
  try {
    const html = await fetchSourceText("partykel", PARTYKEL_URL, {
      headers: {
        "User-Agent": "wasgehttueb-events-bot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];
    const seen = new Set<string>();
    const nowMs = Date.now();

    $("a[href*='/events/view/id/']").each((_, node) => {
      const eventLink = $(node).attr("href") ?? "";
      const eventTitle = $(node).text().replace(/\s+/g, " ").trim();
      if (!eventTitle) return;

      const locationLink = $(node).closest("p,li,div,tr").find("a[href*='/locations/view/id/']").first();
      const locationName = locationLink.text().replace(/\s+/g, " ").trim() || "Tübingen";
      if (!/tuebingen|tübingen/i.test(locationName)) return;

      const dateMatch = eventLink.match(/\/date\/(\d{9,11})/);
      if (!dateMatch) return;
      const dayAnchorMs = Number(dateMatch[1]) * 1000;
      if (!Number.isFinite(dayAnchorMs)) return;

      const dayKey = berlinDayKeyFromDate(new Date(dayAnchorMs));
      if (!dayKey) return;
      const startsAt = berlinWallTimeToUtc(dayKey, 20, 0);
      if (Number.isNaN(startsAt.getTime())) return;
      if (startsAt.getTime() < nowMs - 24 * 60 * 60 * 1000) return;

      const absoluteLink = eventLink.startsWith("http")
        ? eventLink
        : `https://www.partykel.info${eventLink.startsWith("/") ? "" : "/"}${eventLink}`;

      const displayTitle = sanitizeExternalEventTitle(eventTitle, {
        description: `Event-Hinweis via Partykel (${locationName})`,
        externalLink: absoluteLink,
        fallback: "Partykel",
      }).slice(0, 140);

      const eventId = generateEventId("partykel", startsAt, displayTitle);
      if (seen.has(eventId)) return;
      seen.add(eventId);

      events.push({
        id: eventId,
        source: "partykel",
        title: displayTitle,
        description: `Event-Hinweis via Partykel (${locationName})`,
        starts_at: startsAt.toISOString(),
        ends_at: new Date(startsAt.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        max_guests: 0,
        contribution_cents: 0,
        public_lat: (resolveTuebingenVenueCoordsFromText(locationName)?.coords.lat ?? TUEBINGEN_VENUE_COORDS.tuebingenCenter.lat),
        public_lng: (resolveTuebingenVenueCoordsFromText(locationName)?.coords.lng ?? TUEBINGEN_VENUE_COORDS.tuebingenCenter.lng),
        is_external: true,
        external_link: absoluteLink,
        vibe_label: "Partykel",
        spots_left: 0,
        location_name: locationName,
        category_slug: "culture",
        category_label: "Kultur",
        event_scope: "mixed",
        is_all_day: false,
        audience_label: "Alle",
        price_info: null,
      } as PartyCard);
    });

    return events.slice(0, 40);
  } catch (error) {
    if (error instanceof ExternalSourceFetchError) throw error;
    console.error("Error fetching Partykel events:", error);
    throw new ExternalSourceFetchError(
      "partykel",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

