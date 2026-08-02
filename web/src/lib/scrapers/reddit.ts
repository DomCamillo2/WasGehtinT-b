import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
import { fetchSourceText } from "@/lib/scrapers/source-fetch";
import { TUEBINGEN_VENUE_COORDS, resolveTuebingenVenueCoordsFromText } from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";
import {
  REDDIT_SUBREDDITS,
  generateEventId,
  isLikelyRedditEvent,
  parseRedditEventDate,
} from "@/lib/scrapers/shared";

export type SourceScrapeResult = {
  source: string;
  ok: boolean;
  events: PartyCard[];
  error?: string;
};

export async function fetchRedditEvents(): Promise<PartyCard[]> {
  const batches = await fetchRedditEventBatches();
  return batches.flatMap((batch) => batch.events).slice(0, 30);
}

export async function fetchRedditEventBatches(): Promise<SourceScrapeResult[]> {
  const now = Date.now();
  const maxPostAgeMs = 30 * 24 * 60 * 60 * 1000;
  const seenIds = new Set<string>();
  const batches: SourceScrapeResult[] = [];

  for (const subreddit of REDDIT_SUBREDDITS) {
    const source = `reddit-${subreddit}`;
    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=60`;
    try {
      const htmlOrJson = await fetchSourceText(source, url, {
        headers: {
          "User-Agent": "wasgehttueb-events-bot/1.0",
          Accept: "application/json",
        },
      });

      const payload = JSON.parse(htmlOrJson) as {
        data?: { children?: Array<{ data?: Record<string, unknown> }> };
      };
      const children = payload.data?.children ?? [];
      const events: PartyCard[] = [];

      for (const child of children) {
        const post = child.data ?? {};
        const title = String(post.title ?? "").trim();
        const selftext = String(post.selftext ?? "").trim();
        const permalink = String(post.permalink ?? "").trim();
        const createdUtc = Number(post.created_utc ?? 0);
        const isSelf = Boolean(post.is_self ?? false);
        const over18 = Boolean(post.over_18 ?? false);
        const removed = String(post.removed_by_category ?? "").trim().length > 0;

        if (!isSelf || over18 || removed || !title || !createdUtc) {
          continue;
        }

        const postedAtMs = createdUtc * 1000;
        if (!Number.isFinite(postedAtMs) || now - postedAtMs > maxPostAgeMs) {
          continue;
        }

        const haystack = `${title}\n${selftext}`.slice(0, 2000);
        if (!isLikelyRedditEvent(haystack)) {
          continue;
        }

        const startsAtDate = parseRedditEventDate(haystack, createdUtc);
        if (!startsAtDate || startsAtDate.getTime() < now - 24 * 60 * 60 * 1000) {
          continue;
        }

        const eventId = generateEventId(source, startsAtDate, title);
        if (seenIds.has(eventId)) {
          continue;
        }
        seenIds.add(eventId);

        const coords =
          resolveTuebingenVenueCoordsFromText(haystack)?.coords ??
          TUEBINGEN_VENUE_COORDS.tuebingenCenter;

        events.push({
          id: eventId,
          source,
          title: sanitizeExternalEventTitle(title, {
            description: selftext,
            externalLink: permalink ? `https://www.reddit.com${permalink}` : null,
            fallback: `Reddit r/${subreddit}`,
          }).slice(0, 140),
          description: selftext.slice(0, 320) || `Event-Hinweis aus r/${subreddit}`,
          starts_at: startsAtDate.toISOString(),
          ends_at: new Date(startsAtDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          max_guests: 0,
          contribution_cents: 0,
          public_lat: coords.lat,
          public_lng: coords.lng,
          is_external: true,
          external_link: permalink ? `https://www.reddit.com${permalink}` : `https://www.reddit.com/r/${subreddit}/new/`,
          vibe_label: `Reddit r/${subreddit}`,
          spots_left: 0,
          location_name: "Tübingen",
          category_slug: "community",
          category_label: "Community",
          event_scope: "daytime",
          is_all_day: false,
          audience_label: "Alle",
          price_info: null,
        } as PartyCard);
      }

      batches.push({ source, ok: true, events });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching reddit events from r/${subreddit}:`, error);
      batches.push({ source, ok: false, events: [], error: message });
    }
  }

  return batches;
}
