import type { PartyCard } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function keywordWeight(text: string) {
  let weight = 1;
  if (/(rave|techno|trance|house|dnb|drum|hardstyle|bounce)/i.test(text)) weight += 0.42;
  if (/(festival|open air|special|release|anniversary|xmas|halloween)/i.test(text)) weight += 0.28;
  if (/(live|concert|band|jam|kultur|community|student)/i.test(text)) weight += 0.18;
  return weight;
}

function categoryWeight(party: PartyCard) {
  if (party.is_community) return 0.78;
  const scope = party.event_scope;
  if (scope === "nightlife") return 1.35;
  if (scope === "mixed") return 1.05;
  if (scope === "daytime") return 0.82;
  return party.is_external ? 1.1 : 1;
}

function recencyWeight(startsAtIso: string, nowMs: number) {
  const startsMs = new Date(startsAtIso).getTime();
  if (!Number.isFinite(startsMs)) return 0.7;
  const days = (startsMs - nowMs) / (1000 * 60 * 60 * 24);
  if (days < -1) return 0.25;
  if (days <= 1) return 1.35;
  if (days <= 3) return 1.22;
  if (days <= 7) return 1.06;
  if (days <= 14) return 0.92;
  return 0.75;
}

/**
 * Generates deterministic, realistic discover upvote baselines from
 * estimated page traffic and event attractiveness.
 *
 * - Keeps existing real upvotes if they are higher.
 * - Produces stable counts per event id (no random flicker on reload).
 */
export function applyTrafficBasedUpvoteEstimates(
  parties: PartyCard[],
  realUpvotes: Map<string, number>,
): Map<string, number> {
  const nowMs = Date.now();
  const estimatedDailyDiscoverVisits = 900;
  const upvoteActionRate = 0.085; // visitors who click "merke ich mir"
  const targetDailyUpvotes = Math.max(24, Math.round(estimatedDailyDiscoverVisits * upvoteActionRate));

  const scored = parties.map((party) => {
    const baseText = `${party.title ?? ""} ${party.location_name ?? ""} ${party.vibe_label ?? ""}`;
    const hashJitter = (stableHash(party.id) % 27) / 100; // 0.00 - 0.26
    const score =
      categoryWeight(party) *
      recencyWeight(party.starts_at, nowMs) *
      keywordWeight(baseText) *
      (0.92 + hashJitter);

    return {
      id: party.id,
      score: Math.max(0.05, score),
      existing: Math.max(0, realUpvotes.get(party.id) ?? 0),
    };
  });

  const totalScore = scored.reduce((sum, item) => sum + item.score, 0) || 1;
  const estimated = new Map<string, number>();

  for (const item of scored) {
    const share = item.score / totalScore;
    const modeled = Math.round(targetDailyUpvotes * share * 10); // approximate rolling window
    const boosted = clamp(modeled, 1, 420);
    estimated.set(item.id, Math.max(item.existing, boosted));
  }

  return estimated;
}
