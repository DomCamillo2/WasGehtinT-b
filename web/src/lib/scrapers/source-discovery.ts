import * as cheerio from "cheerio";

const TUEBINGEN_EXTERNAL_CALENDAR_LINKS_URL = "https://www.tuebingen.de/108/683.html";

const SOURCE_KEYWORDS = [
  "event",
  "events",
  "veranstaltung",
  "veranstaltungen",
  "kalender",
  "kultur",
  "nightlife",
  "tickets",
];

function scoreSourceUrl(url: string): number {
  const normalized = url.toLowerCase();
  let score = 0;
  for (const keyword of SOURCE_KEYWORDS) {
    if (normalized.includes(keyword)) score += 2;
  }
  if (normalized.includes("tuebingen") || normalized.includes("tübingen")) score += 3;
  if (normalized.includes("reutlingen")) score += 1;
  if (normalized.includes("instagram.com") || normalized.includes("facebook.com")) score += 1;
  return score;
}

export async function discoverImportantEventSourceCandidates(): Promise<string[]> {
  try {
    const response = await fetch(TUEBINGEN_EXTERNAL_CALENDAR_LINKS_URL, {
      cache: "no-store",
      headers: { "User-Agent": "wasgehttueb-source-discovery/1.0" },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const candidates = new Set<string>();

    $("a[href]").each((_, node) => {
      const rawHref = ($(node).attr("href") ?? "").trim();
      if (!rawHref) return;
      if (!/^https?:\/\//i.test(rawHref)) return;
      if (/tuebingen\.de\/(?!108\/683\.html)/i.test(rawHref)) return;

      const score = scoreSourceUrl(rawHref);
      if (score >= 4) candidates.add(rawHref);
    });

    return [...candidates].sort();
  } catch {
    return [];
  }
}
