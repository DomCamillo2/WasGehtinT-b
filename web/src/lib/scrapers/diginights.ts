import * as cheerio from "cheerio";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
import { ExternalSourceFetchError, fetchSourceText } from "@/lib/scrapers/source-fetch";
import { parseSchemaOrgDateTime } from "@/lib/timezone-berlin";
import { resolveTuebingenVenueCoordsFromText } from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";
import {
  DIGINIGHTS_DISABLED,
  DIGINIGHTS_URL,
  collectLdJsonEventNodes,
  generateEventId,
  isTuebingenAreaEvent,
  ldJsonTypeMatches,
} from "@/lib/scrapers/shared";

export async function fetchDignightsEvents(): Promise<PartyCard[]> {
  if (DIGINIGHTS_DISABLED) {
    console.warn("Diginights scraper disabled via EXTERNAL_EVENTS_ENABLE_DIGINIGHTS=false.");
    return [];
  }

  try {
    const html = await fetchSourceText("diginights", DIGINIGHTS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];
    const seen = new Set<string>();
    const nowMs = Date.now();

    $("script[type=\"application/ld+json\"]").each((_, el) => {
      const raw = $(el).html();
      if (!raw) {
        return;
      }

      let data: unknown;
      try {
        data = JSON.parse(raw.trim());
      } catch {
        return;
      }

      const roots = Array.isArray(data) ? data : [data];
      for (const root of roots) {
        for (const node of collectLdJsonEventNodes(root)) {
          if (!node || typeof node !== "object") {
            continue;
          }

          const item = node as Record<string, unknown>;
          const typeField = item["@type"];
          if (!ldJsonTypeMatches(typeField, "Event") && !ldJsonTypeMatches(typeField, "MusicEvent")) {
            continue;
          }

          const name = String(item.name ?? "").trim();
          if (!name || name.length < 2) {
            continue;
          }

          const startRaw = item.startDate;
          const startStr = typeof startRaw === "string" ? startRaw : null;
          if (!startStr) {
            continue;
          }

          const startsAt = parseSchemaOrgDateTime(startStr);
          if (!startsAt) {
            continue;
          }

          let endsAt: Date;
          const endRaw = item.endDate;
          if (typeof endRaw === "string") {
            const parsedEnd = parseSchemaOrgDateTime(endRaw);
            endsAt = parsedEnd && parsedEnd.getTime() > startsAt.getTime()
              ? parsedEnd
              : new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);
          } else {
            endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);
          }

          if (endsAt.getTime() < nowMs) {
            continue;
          }

          const location = item.location;
          let locationName: string | null = null;
          let addressText = "";
          let lat: number | null = null;
          let lng: number | null = null;

          if (location && typeof location === "object") {
            const loc = location as Record<string, unknown>;
            const locName = loc.name;
            if (typeof locName === "string" && locName.trim()) {
              locationName = locName.trim();
            }

            const address = loc.address;
            if (typeof address === "string") {
              addressText = address;
            } else if (address && typeof address === "object") {
              const addr = address as Record<string, unknown>;
              addressText = [addr.addressLocality, addr.streetAddress, addr.postalCode, addr.addressRegion]
                .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
                .join(" ");
            }

            const geo = loc.geo;
            if (geo && typeof geo === "object") {
              const g = geo as Record<string, unknown>;
              const la = Number(g.latitude);
              const ln = Number(g.longitude);
              if (Number.isFinite(la) && Number.isFinite(ln)) {
                lat = la;
                lng = ln;
              }
            }
          }

          const desc = typeof item.description === "string" ? item.description.slice(0, 500) : null;
          // Diginights.com is national — keep Tübingen-area rows only.
          if (!isTuebingenAreaEvent({ locationName, addressText, lat, lng, title: name, description: desc })) {
            continue;
          }

          const urlField = item.url;
          const externalLink = typeof urlField === "string" && urlField.startsWith("http") ? urlField : DIGINIGHTS_URL;
          const displayTitle = sanitizeExternalEventTitle(name, {
            description: desc,
            externalLink,
            fallback: locationName || "Diginights",
          }).slice(0, 140);
          const eventId = generateEventId("diginights", startsAt, displayTitle);
          if (seen.has(eventId)) {
            continue;
          }

          seen.add(eventId);
          const resolved = resolveTuebingenVenueCoordsFromText(
            `${locationName ?? ""} ${addressText} ${name}`,
          );
          events.push({
            id: eventId,
            source: "diginights",
            title: displayTitle,
            description: desc,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            max_guests: 0,
            contribution_cents: 0,
            public_lat: lat ?? resolved?.coords.lat ?? null,
            public_lng: lng ?? resolved?.coords.lng ?? null,
            is_external: true,
            external_link: externalLink,
            vibe_label: "Diginights",
            spots_left: 0,
            location_name: locationName ?? "Tübingen",
            event_scope: "nightlife",
            category_slug: "party",
            category_label: "Party",
          } as PartyCard);
        }
      }
    });

    if (events.length === 0) {
      console.warn(
        "[diginights] No Event/MusicEvent nodes in JSON-LD — page structure may have changed.",
      );
    }

    return events.slice(0, 80);
  } catch (error) {
    if (error instanceof ExternalSourceFetchError) throw error;
    console.error("Error fetching Diginights source:", error);
    throw new ExternalSourceFetchError(
      "diginights",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

