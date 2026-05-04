const BLOCKED_TERMS = [
  "drogenhandel",
  "kokainverkauf",
  "waffenverkauf",
  "bombe bauen",
  "terror anschlag",
  "hakenkreuz",
  "volksverhetzung",
  "kinderpornografie",
  "vergewaltigung",
  "menschenhandel",
] as const;

const CENSOR_TERMS = [
  "scheiße",
  "idiot",
  "arsch",
  "spast",
  "fresse",
  "depp",
  "dummkopf",
  "wichser",
  "hurensohn",
  "bastard",
] as const;

export type ModerationResult = {
  isBlocked: boolean;
  message?: string;
  sanitizedText: string;
  wasSanitized: boolean;
};

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

export function moderateContent(text: string): ModerationResult {
  const normalized = normalize(text);

  for (const term of BLOCKED_TERMS) {
    if (normalized.includes(term)) {
      return {
        isBlocked: true,
        message: "Dein Beitrag verstößt gegen unsere Richtlinien.",
        sanitizedText: text,
        wasSanitized: false,
      };
    }
  }

  let sanitizedText = text;
  let wasSanitized = false;

  for (const term of CENSOR_TERMS) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "giu");
    if (regex.test(sanitizedText)) {
      wasSanitized = true;
      sanitizedText = sanitizedText.replace(regex, "***");
    }
  }

  return {
    isBlocked: false,
    sanitizedText,
    wasSanitized,
  };
}
