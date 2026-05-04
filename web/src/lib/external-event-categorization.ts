"use server";

import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PartyCard } from "@/lib/types";

type CategoryFields = Pick<
  PartyCard,
  "category_slug" | "category_label" | "event_scope" | "is_all_day" | "audience_label" | "price_info"
>;

type GeminiCategoryRow = {
  id: string;
  event_scope: "nightlife" | "daytime" | "mixed";
  category_slug: string;
  category_label: string;
  is_all_day: boolean;
};

const GEMINI_CATEGORY_MODEL = "gemini-2.0-flash-lite";
const GEMINI_BATCH_SIZE = 8;

const EPPLEHAUS_POLITICS_PATTERN =
  /\b(politik|politisch|diskussion|gespraech|gespräch|kundgebung|demo|solidar|soli|antifa|antirass|queer|feminis|infoabend|infoveranstaltung|austausch|plenum|vortrag|lesung)\b/i;
const EPPLEHAUS_CULTURE_PATTERN =
  /\b(workshop|skillshare|film|kino|doku|vernissage|ausstellung|theater|poetry|zine|flohmarkt|brunch|cafe|café|kaffee|kuefa|küfa)\b/i;
const EPPLEHAUS_NIGHTLIFE_PATTERN =
  /\b(konzert|concert|show|party|rave|dj|club|tresen|barabend|aftershow|dance|tanzen|live(\s+musik|\s+show)?|punk|ska|metal|hip[\s-]?hop|techno)\b/i;

function trimText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function isMissingCategoryColumnError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && (
    normalized.includes("category_slug") ||
    normalized.includes("category_label") ||
    normalized.includes("event_scope") ||
    normalized.includes("is_all_day") ||
    normalized.includes("audience_label") ||
    normalized.includes("price_info")
  );
}

function isEpplehausEvent(event: PartyCard) {
  const venueText = `${trimText(event.location_name)} ${trimText(event.vibe_label)}`.toLowerCase();
  return venueText.includes("epplehaus");
}

function hasKnownCategory(event: PartyCard) {
  return Boolean(event.category_slug || event.category_label || event.event_scope);
}

function applyCategoryFields(event: PartyCard, fields: CategoryFields | null | undefined): PartyCard {
  if (!fields) {
    return event;
  }

  return {
    ...event,
    category_slug: fields.category_slug ?? event.category_slug ?? null,
    category_label: fields.category_label ?? event.category_label ?? null,
    event_scope: fields.event_scope ?? event.event_scope ?? null,
    is_all_day: fields.is_all_day ?? event.is_all_day ?? false,
    audience_label: fields.audience_label ?? event.audience_label ?? null,
    price_info: fields.price_info ?? event.price_info ?? null,
  };
}

function inferEpplehausCategory(event: PartyCard): CategoryFields | null {
  if (!isEpplehausEvent(event)) {
    return null;
  }

  const text = `${trimText(event.title)} ${trimText(event.description)} ${trimText(event.location_name)}`;

  if (EPPLEHAUS_POLITICS_PATTERN.test(text)) {
    return {
      category_slug: "politics",
      category_label: "Politik",
      event_scope: "daytime",
      is_all_day: false,
      audience_label: "Alle",
      price_info: event.price_info ?? null,
    };
  }

  if (EPPLEHAUS_CULTURE_PATTERN.test(text)) {
    return {
      category_slug: text.match(/\b(workshop|skillshare)\b/i) ? "workshop" : text.match(/\b(film|kino|doku)\b/i) ? "film" : "culture",
      category_label: text.match(/\b(workshop|skillshare)\b/i)
        ? "Workshop"
        : text.match(/\b(film|kino|doku)\b/i)
          ? "Film"
          : "Kultur",
      event_scope: "daytime",
      is_all_day: false,
      audience_label: "Alle",
      price_info: event.price_info ?? null,
    };
  }

  if (EPPLEHAUS_NIGHTLIFE_PATTERN.test(text)) {
    return {
      category_slug: text.match(/\b(konzert|concert|live)\b/i) ? "concert" : "party",
      category_label: text.match(/\b(konzert|concert|live)\b/i) ? "Konzert" : "Party",
      event_scope: "nightlife",
      is_all_day: false,
      audience_label: "Alle",
      price_info: event.price_info ?? null,
    };
  }

  const startsAt = new Date(event.starts_at);
  if (!Number.isNaN(startsAt.getTime()) && startsAt.getUTCHours() < 18) {
    return {
      category_slug: "community",
      category_label: "Community",
      event_scope: "daytime",
      is_all_day: false,
      audience_label: "Alle",
      price_info: event.price_info ?? null,
    };
  }

  return null;
}

async function loadCachedCategories(eventIds: string[]): Promise<Map<string, CategoryFields>> {
  if (!eventIds.length) {
    return new Map();
  }

  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("external_events_cache")
    .select("id, category_slug, category_label, event_scope, is_all_day, audience_label, price_info")
    .in("id", eventIds);

  if (result.error) {
    if (!isMissingCategoryColumnError(result.error.message)) {
      console.warn("[external-event-categorization] Failed to load cached categories:", result.error.message);
    }
    return new Map();
  }

  return new Map(
    ((result.data ?? []) as Array<{
      id: string;
      category_slug: string | null;
      category_label: string | null;
      event_scope: "nightlife" | "daytime" | "mixed" | null;
      is_all_day: boolean | null;
      audience_label: string | null;
      price_info: string | null;
    }>).map((row) => [
      row.id,
      {
        category_slug: row.category_slug,
        category_label: row.category_label,
        event_scope: row.event_scope,
        is_all_day: row.is_all_day === true,
        audience_label: row.audience_label,
        price_info: row.price_info,
      },
    ]),
  );
}

function buildGeminiPrompt(events: PartyCard[]) {
  const payload = events.map((event) => ({
    id: event.id,
    title: trimText(event.title),
    description: trimText(event.description),
    starts_at: event.starts_at,
    location_name: trimText(event.location_name),
    vibe_label: trimText(event.vibe_label),
  }));

  return [
    "Classify these public city events for a German events app. Return JSON array only.",
    "For each input object, return: {id,event_scope,category_slug,category_label,is_all_day}.",
    "Allowed event_scope values: nightlife, daytime, mixed.",
    "Allowed category_slug values: politics, workshop, culture, film, concert, party, community, other.",
    "Allowed category_label values: Politik, Workshop, Kultur, Film, Konzert, Party, Community, Sonstiges.",
    "Use daytime for talks, political events, workshops, readings, exhibitions, film screenings, info events, and community-focused events.",
    "Use nightlife for parties, concerts, DJ nights, club nights, live music, and late-night social events.",
    "For Epplehaus specifically, prefer daytime for political and cultural public events even if they start in the evening.",
    "Set is_all_day true only for explicit all-day events. Otherwise false.",
    "",
    JSON.stringify(payload),
  ].join("\n");
}

function parseGeminiCategories(raw: string): Map<string, CategoryFields> {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini categorization did not return a JSON array.");
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini categorization response is not an array.");
  }

  const categoryMap = new Map<string, CategoryFields>();

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const row = entry as Partial<GeminiCategoryRow> & Record<string, unknown>;
    if (typeof row.id !== "string" || row.id.trim().length === 0) {
      continue;
    }

    const scope =
      row.event_scope === "daytime" || row.event_scope === "nightlife" || row.event_scope === "mixed"
        ? row.event_scope
        : null;
    const slug = typeof row.category_slug === "string" && row.category_slug.trim().length > 0
      ? row.category_slug.trim()
      : null;
    const label = typeof row.category_label === "string" && row.category_label.trim().length > 0
      ? row.category_label.trim()
      : null;

    if (!scope && !slug && !label) {
      continue;
    }

    categoryMap.set(row.id, {
      category_slug: slug,
      category_label: label,
      event_scope: scope,
      is_all_day: row.is_all_day === true,
      audience_label: "Alle",
      price_info: null,
    });
  }

  return categoryMap;
}

async function classifyWithGemini(batch: PartyCard[]): Promise<Map<string, CategoryFields>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey || batch.length === 0) {
    return new Map();
  }

  try {
    const gemini = new GoogleGenAI({ apiKey });
    const response = await gemini.models.generateContent({
      model: GEMINI_CATEGORY_MODEL,
      contents: buildGeminiPrompt(batch),
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 1200,
      },
    });

    const text = typeof response.text === "string" ? response.text : "";
    if (!text.trim()) {
      return new Map();
    }

    return parseGeminiCategories(text);
  } catch (error) {
    console.warn("[external-event-categorization] Gemini categorization skipped:", error);
    return new Map();
  }
}

export async function enrichExternalEventCategories(events: PartyCard[]): Promise<PartyCard[]> {
  if (!events.length) {
    return events;
  }

  const cachedCategories = await loadCachedCategories(events.map((event) => event.id));
  const withCachedAndHeuristics = events.map((event) => {
    const cached = cachedCategories.get(event.id);
    if (cached) {
      return applyCategoryFields(event, cached);
    }

    if (hasKnownCategory(event)) {
      return event;
    }

    return applyCategoryFields(event, inferEpplehausCategory(event));
  });

  const needsGemini = withCachedAndHeuristics.filter(
    (event) => isEpplehausEvent(event) && !hasKnownCategory(event),
  );

  if (!needsGemini.length) {
    return withCachedAndHeuristics;
  }

  const geminiCategories = new Map<string, CategoryFields>();

  for (let index = 0; index < needsGemini.length; index += GEMINI_BATCH_SIZE) {
    const batch = needsGemini.slice(index, index + GEMINI_BATCH_SIZE);
    const batchCategories = await classifyWithGemini(batch);
    for (const [eventId, fields] of batchCategories.entries()) {
      geminiCategories.set(eventId, fields);
    }
  }

  return withCachedAndHeuristics.map((event) => applyCategoryFields(event, geminiCategories.get(event.id)));
}
