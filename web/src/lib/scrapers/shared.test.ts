import { describe, expect, it } from "vitest";
import { generateEventId } from "@/lib/scrapers/shared";
import { berlinWallTimeToUtc } from "@/lib/timezone-berlin";

describe("generateEventId", () => {
  it("keys events by Berlin day, not UTC ISO date", () => {
    const lateBerlin = berlinWallTimeToUtc("2026-08-02", 0, 30);
    const id = generateEventId("club-voltaire", lateBerlin, "Jam Session");
    expect(id.startsWith("club-voltaire-2026-08-02-")).toBe(true);
    expect(id.includes("2026-08-01")).toBe(false);
  });
});
