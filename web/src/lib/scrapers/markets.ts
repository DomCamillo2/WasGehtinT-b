import * as cheerio from "cheerio";
import { ExternalSourceFetchError, fetchSourceText } from "@/lib/scrapers/source-fetch";
import { TUEBINGEN_VENUE_COORDS } from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";
import {
  TUEBINGEN_FLEA_MARKETS_URL,
  TUEBINGEN_MARKETS_URL,
  buildBerlinIsoDate,
  extractDateRangeFromLabel,
  parseGermanMonthName,
  sanitizeMarketTitle,
  slugify,
} from "@/lib/scrapers/shared";

export async function fetchTuebingenMarketEvents(): Promise<PartyCard[]> {
  try {
    const html = await fetchSourceText("tuebingen-market", TUEBINGEN_MARKETS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const $ = cheerio.load(html);

    return $(".klappe a.kl")
      .toArray()
      .map((element) => {
        const rawLabel = $(element).text().trim();
        const parsedRange = extractDateRangeFromLabel(rawLabel);
        if (!rawLabel || !parsedRange) {
          return null;
        }

        const title = sanitizeMarketTitle(rawLabel) || "Markt in Tübingen";
        const relativeHref = $(element).attr("href")?.trim() ?? "";
        const externalLink = relativeHref
          ? new URL(relativeHref, TUEBINGEN_MARKETS_URL).toString()
          : TUEBINGEN_MARKETS_URL;

        return {
          id: `tuebingen-market-${slugify(rawLabel)}`,
          source: "tuebingen-market",
          title,
          description: "Offizieller Markttermin der Universitätsstadt Tübingen",
          starts_at: parsedRange.startsAt,
          ends_at: parsedRange.endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: TUEBINGEN_VENUE_COORDS.marktplatz.lat,
          public_lng: TUEBINGEN_VENUE_COORDS.marktplatz.lng,
          is_external: true,
          external_link: externalLink,
          vibe_label: "Markt",
          spots_left: 0,
          location_name: title.toLowerCase().includes("rathaus") ? "Rathaus, Tübingen" : "Tübingen",
          category_slug: "market",
          category_label: "Markt",
          event_scope: "daytime",
          is_all_day: true,
          audience_label: "Alle",
          price_info: null,
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch (error) {
    console.error("Error fetching Tuebingen market events:", error);
    if (error instanceof ExternalSourceFetchError) throw error;
    throw new ExternalSourceFetchError(
      "tuebingen-market",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

export async function fetchTuebingenFleaMarketEvents(): Promise<PartyCard[]> {
  try {
    const html = await fetchSourceText("tuebingen-flohmarkt", TUEBINGEN_FLEA_MARKETS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const $ = cheerio.load(html);
    const yearHeading = $("#content h4")
      .toArray()
      .find((element) => /Termine\s+fuer\s+\d{4}|Termine\s+für\s+\d{4}/i.test($(element).text()));

    if (!yearHeading) {
      return [];
    }

    const yearMatch = $(yearHeading).text().match(/(\d{4})/);
    const year = Number(yearMatch?.[1] ?? "0");
    if (!year) {
      return [];
    }

    const list = $(yearHeading).nextAll("ul").first();
    if (!list.length) {
      return [];
    }

    return list
      .find("li")
      .toArray()
      .map((element) => {
        const raw = $(element).text().replace(/\(.*?\)/g, "").trim();
        const match = raw.match(/^(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)/i);
        if (!match) {
          return null;
        }

        const day = Number(match[1]);
        const month = parseGermanMonthName(match[2]);
        if (!month) {
          return null;
        }

        const startsAt = buildBerlinIsoDate(year, month, day, 8, 0);
        const endsAt = buildBerlinIsoDate(year, month, day, 15, 0);
        if (!startsAt || !endsAt) {
          return null;
        }

        return {
          id: `tuebingen-flohmarkt-${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          source: "tuebingen-flohmarkt",
          title: "Städtischer Flohmarkt in der Uhlandstraße",
          description: "Offizieller Flohmarkttermin der Universitätsstadt Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: TUEBINGEN_VENUE_COORDS.uhlandstrasse.lat,
          public_lng: TUEBINGEN_VENUE_COORDS.uhlandstrasse.lng,
          is_external: true,
          external_link: TUEBINGEN_FLEA_MARKETS_URL,
          vibe_label: "Flohmarkt",
          spots_left: 0,
          location_name: "Uhlandstraße, Tübingen",
          category_slug: "flea-market",
          category_label: "Flohmarkt",
          event_scope: "daytime",
          is_all_day: false,
          audience_label: "Alle",
          price_info: null,
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch (error) {
    if (error instanceof ExternalSourceFetchError) throw error;
    console.error("Error fetching Tuebingen flea market events:", error);
    throw new ExternalSourceFetchError(
      "tuebingen-flohmarkt",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

