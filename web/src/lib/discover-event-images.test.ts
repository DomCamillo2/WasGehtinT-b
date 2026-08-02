import { describe, expect, it } from "vitest";
import {
  assignDiscoverHeroUrlsForParties,
  classifyDiscoverVisualCategory,
  heroImageIdentity,
} from "@/lib/discover-event-images";
import type { PartyCard } from "@/lib/types";

function party(partial: Partial<PartyCard> & { id: string; title: string }): PartyCard {
  return {
    description: null,
    starts_at: "2026-09-05T18:00:00.000Z",
    ends_at: "2026-09-05T22:00:00.000Z",
    max_guests: 0,
    contribution_cents: 0,
    public_lat: null,
    public_lng: null,
    is_external: true,
    external_link: null,
    vibe_label: "Club Voltaire",
    spots_left: 0,
    location_name: "Club Voltaire Tübingen",
    hero_image_url: null,
    ...partial,
  } as PartyCard;
}

describe("assignDiscoverHeroUrlsForParties", () => {
  it("gives unique images to same-category events in one batch", () => {
    const parties = Array.from({ length: 6 }, (_, i) =>
      party({
        id: `live-${i}`,
        title: `Jazz Night ${i}`,
        music_genre: "Jazz",
        category_slug: "culture",
        event_scope: "nightlife",
      }),
    );

    const heroes = assignDiscoverHeroUrlsForParties(parties);
    const identities = parties.map((p) => heroImageIdentity(heroes[p.id]!));
    expect(new Set(identities).size).toBe(identities.length);
  });

  it("keeps market images for flea markets", () => {
    const flea = party({
      id: "flea-1",
      title: "Städtischer Flohmarkt in der Uhlandstraße",
      category_slug: "market",
      location_name: "Uhlandstraße, Tübingen",
    });
    expect(classifyDiscoverVisualCategory(flea)).toBe("market");
    const heroes = assignDiscoverHeroUrlsForParties([flea]);
    expect(heroes[flea.id]).toContain("images.unsplash.com");
  });

  it("does not reuse a colliding pre-set hero on a later card", () => {
    const shared =
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80";
    const a = party({ id: "a", title: "Party A", hero_image_url: shared, event_scope: "nightlife" });
    const b = party({ id: "b", title: "Party B", hero_image_url: shared, event_scope: "nightlife" });
    const heroes = assignDiscoverHeroUrlsForParties([a, b]);
    expect(heroImageIdentity(heroes.a!)).not.toBe(heroImageIdentity(heroes.b!));
  });
});
