import { describe, expect, it } from "vitest";
import {
  berlinDayKeyFromDate,
  berlinWallTimeToUtc,
  parseSchemaOrgDateTime,
} from "@/lib/timezone-berlin";

describe("parseSchemaOrgDateTime", () => {
  it("treats offset-less datetimes as Europe/Berlin wall clock", () => {
    const parsed = parseSchemaOrgDateTime("2026-08-02T20:00:00");
    expect(parsed).not.toBeNull();
    // CEST = UTC+2 in August
    expect(parsed!.toISOString()).toBe("2026-08-02T18:00:00.000Z");
    expect(berlinDayKeyFromDate(parsed!)).toBe("2026-08-02");
  });

  it("respects explicit Zulu timestamps", () => {
    const parsed = parseSchemaOrgDateTime("2026-08-02T20:00:00Z");
    expect(parsed!.toISOString()).toBe("2026-08-02T20:00:00.000Z");
  });

  it("parses date-only as Berlin noon", () => {
    const parsed = parseSchemaOrgDateTime("2026-08-02");
    expect(parsed).not.toBeNull();
    expect(berlinDayKeyFromDate(parsed!)).toBe("2026-08-02");
    expect(berlinWallTimeToUtc("2026-08-02", 12, 0).toISOString()).toBe(parsed!.toISOString());
  });
});

describe("berlinDayKeyFromDate", () => {
  it("uses Berlin calendar day near UTC midnight", () => {
    // 2026-08-02 00:30 Berlin = 2026-08-01 22:30Z
    const utc = berlinWallTimeToUtc("2026-08-02", 0, 30);
    expect(berlinDayKeyFromDate(utc)).toBe("2026-08-02");
    expect(utc.toISOString().slice(0, 10)).toBe("2026-08-01");
  });
});
