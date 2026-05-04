import type { DiscoverEvent } from "@/services/discover/discover-view-model";

export type DiscoverFilterKey = "all" | "top" | "community" | "clubs" | "daytime";

export function isClubEvent(party: DiscoverEvent): boolean {
  if (!party.isExternal) {
    return false;
  }

  if (party.eventScope === "daytime") {
    return false;
  }

  const categorySlug = (party.categorySlug ?? "").toLowerCase();
  if (categorySlug === "market" || categorySlug === "flea-market") {
    return false;
  }

  const text = `${party.title} ${party.description ?? ""} ${party.vibeLabel}`.toLowerCase();
  if (/markt|flohmarkt|messe|basar|rathaus|regionalmarkt|georgimarkt/.test(text)) {
    return false;
  }

  return true;
}

function isCommunityDiscoverEvent(party: DiscoverEvent): boolean {
  if (party.isCommunity) return true;
  const badge = (party.sourceBadge ?? "").trim().toLowerCase();
  return badge === "community";
}

export function filterDiscoverEvents(parties: DiscoverEvent[], filter: DiscoverFilterKey): DiscoverEvent[] {
  return parties.filter((party) => {
    if (filter === "top") return true;
    if (filter === "clubs" && !isClubEvent(party)) return false;
    if (filter === "daytime" && party.eventScope !== "daytime") return false;
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
