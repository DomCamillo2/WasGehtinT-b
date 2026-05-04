import type { DiscoverEvent } from "@/services/discover/discover-view-model";

export type DiscoverFilterKey = "all" | "top" | "community" | "clubs" | "daytime";

const BERLIN_HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  hour12: false,
});

function localBerlinHour(iso: string): number | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const hour = Number(BERLIN_HOUR.format(parsed));
  return Number.isFinite(hour) ? hour : null;
}

function isCommunityDiscoverEvent(party: DiscoverEvent): boolean {
  if (party.isCommunity) return true;
  const badge = (party.sourceBadge ?? "").trim().toLowerCase();
  return badge === "community";
}

function isLikelyDaytimeEvent(party: DiscoverEvent): boolean {
  if (party.eventScope === "daytime") return true;
  if (party.eventScope === "nightlife") return false;

  const categorySlug = (party.categorySlug ?? "").toLowerCase();
  if (categorySlug === "market" || categorySlug === "flea-market" || categorySlug === "workshop") {
    return true;
  }
  if (categorySlug === "party" || categorySlug === "concert") {
    return false;
  }

  const text = `${party.title} ${party.description ?? ""} ${party.vibeLabel} ${party.locationName ?? ""}`.toLowerCase();
  if (/\b(markt|flohmarkt|messe|basar|brunch|workshop|ausstellung|vortrag|kinder|familie)\b/.test(text)) {
    return true;
  }
  if (/\b(club|party|rave|dj|nachts?|night|aftershow|techno|house|drum\s*&?\s*bass)\b/.test(text)) {
    return false;
  }

  // Last-resort fallback for uncategorized items.
  const hour = localBerlinHour(party.startsAt);
  return hour !== null ? hour >= 6 && hour < 18 : false;
}

export function isClubEvent(party: DiscoverEvent): boolean {
  if (isCommunityDiscoverEvent(party)) return false;
  if (isLikelyDaytimeEvent(party)) return false;

  const categorySlug = (party.categorySlug ?? "").toLowerCase();
  if (categorySlug === "party" || categorySlug === "concert" || categorySlug === "club") {
    return true;
  }

  const text = `${party.title} ${party.description ?? ""} ${party.vibeLabel} ${party.locationName ?? ""}`.toLowerCase();
  if (/\b(club|party|rave|dj|aftershow|night|nachts?|techno|house|concert|konzert)\b/.test(text)) {
    return true;
  }

  // Keep external nightlife items visible even with sparse metadata.
  return party.isExternal;
}

export function filterDiscoverEvents(parties: DiscoverEvent[], filter: DiscoverFilterKey): DiscoverEvent[] {
  return parties.filter((party) => {
    if (filter === "top") return true;
    if (filter === "clubs" && !isClubEvent(party)) return false;
    if (filter === "daytime" && !isLikelyDaytimeEvent(party)) return false;
    if (filter === "community" && !isCommunityDiscoverEvent(party)) return false;
    return true;
  });
}

export function sortDiscoverByUpvotesDesc(
  parties: DiscoverEvent[],
  upvoteCounts: Record<string, number>,
): DiscoverEvent[] {
  return [...parties].sort((left, right) => {
    const leftScore = upvoteCounts[left.id] ?? left.upvoteCount ?? 0;
    const rightScore = upvoteCounts[right.id] ?? right.upvoteCount ?? 0;
    if (rightScore !== leftScore) return rightScore - leftScore;
    const leftDate = new Date(left.startsAt).getTime();
    const rightDate = new Date(right.startsAt).getTime();
    if (leftDate !== rightDate) return leftDate - rightDate;
    return left.title.localeCompare(right.title, "de");
  });
}

export function sortDiscoverByUpvotesThenDate(
  parties: DiscoverEvent[],
  upvoteCounts: Record<string, number>,
): DiscoverEvent[] {
  return [...parties].sort((left, right) => {
    const leftDate = new Date(left.startsAt).getTime();
    const rightDate = new Date(right.startsAt).getTime();
    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }
    const leftScore = upvoteCounts[left.id] ?? left.upvoteCount ?? 0;
    const rightScore = upvoteCounts[right.id] ?? right.upvoteCount ?? 0;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return left.title.localeCompare(right.title, "de");
  });
}
