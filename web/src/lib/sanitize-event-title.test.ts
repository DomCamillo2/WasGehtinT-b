import { describe, expect, it } from "vitest";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";

describe("sanitizeExternalEventTitle", () => {
  it("replaces URI-like Club Voltaire names with description lead", () => {
    expect(
      sanitizeExternalEventTitle("next://exit_open", {
        description: "Jam-Session für frei improvisierte Musik. Eintritt frei.",
        externalLink: "https://club-voltaire.net/event/next-exit_open",
        fallback: "Club Voltaire",
      }),
    ).toBe("Jam-Session für frei improvisierte Musik.");
  });

  it("keeps normal titles", () => {
    expect(
      sanitizeExternalEventTitle("Jazzclub Jam Session", {
        description: "Live jazz",
        fallback: "Event",
      }),
    ).toBe("Jazzclub Jam Session");
  });

  it("strips BOM and detects embedded scheme://", () => {
    expect(
      sanitizeExternalEventTitle("\ufeffnext://exit_open", {
        description: "Open improvisation night at the club",
        fallback: "Event",
      }),
    ).toMatch(/improvisation|Open/i);
  });

  it("uses non-URI remainder when long enough", () => {
    expect(
      sanitizeExternalEventTitle("next://exit_open – Free Improv Night", {
        description: "ignored because remainder is strong",
        fallback: "Event",
      }),
    ).toBe("Free Improv Night");
  });
});
