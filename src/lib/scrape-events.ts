import "server-only";

import { ApifyClient } from "apify-client";
import { GoogleGenAI } from "@google/genai";

const APIFY_ACTOR_ID = "apify/instagram-profile-scraper";
const MAX_POSTS = 3;

export type ScrapedEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
};

function getRequiredValue(value: string | undefined, missingName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${missingName}`);
  }

  return normalized;
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeCaption(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractCaptionFromPost(post: unknown): string | null {
  const postObj = toObjectRecord(post);
  if (!postObj) {
    return null;
  }

  const directFields = ["caption", "text", "description"] as const;
  for (const field of directFields) {
    const direct = normalizeCaption(postObj[field]);
    if (direct) {
      return direct;
    }
  }

  const edge = toObjectRecord(postObj.edge_media_to_caption);
  const edges = Array.isArray(edge?.edges) ? edge.edges : [];
  for (const edgeItem of edges) {
    const node = toObjectRecord(toObjectRecord(edgeItem)?.node);
    const text = normalizeCaption(node?.text);
    if (text) {
      return text;
    }
  }

  return null;
}

function extractCaptionsFromItem(item: unknown): string[] {
  const itemObj = toObjectRecord(item);
  if (!itemObj) {
    return [];
  }

  const captions: string[] = [];
  const directCaption = normalizeCaption(itemObj.caption);
  if (directCaption) {
    captions.push(directCaption);
  }

  const latestPosts = Array.isArray(itemObj.latestPosts) ? itemObj.latestPosts : [];
  for (const post of latestPosts) {
    const caption = extractCaptionFromPost(post);
    if (caption) {
      captions.push(caption);
    }
  }

  const timelinePosts = Array.isArray(itemObj.latestIgtvVideos) ? itemObj.latestIgtvVideos : [];
  for (const post of timelinePosts) {
    const caption = extractCaptionFromPost(post);
    if (caption) {
      captions.push(caption);
    }
  }

  return captions;
}

function buildGeminiPrompt(captions: string[]): string {
  return [
    "You extract real-world upcoming event data from Instagram captions.",
    "Use only the given captions. Do not invent events or fields.",
    "If no upcoming event is present, return an empty JSON array.",
    "Output must be valid JSON only, with no markdown, no prose, no comments.",
    "Return a JSON array where each object has exactly these keys:",
    "title, date, time, location, description",
    "Rules:",
    "- date must be in YYYY-MM-DD format.",
    "- If exact date is unknown, omit that event.",
    "- Keep time as found in text (e.g., '21:00', 'ab 20 Uhr').",
    "- Keep location as found in text.",
    "- description should be concise and factual.",
    "- Deduplicate overlapping events.",
    "",
    "Captions:",
    JSON.stringify(captions, null, 2),
  ].join("\n");
}

function parseGeminiJsonArray(raw: string): ScrapedEvent[] {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini did not return a JSON array.");
  }

  const jsonSlice = trimmed.slice(start, end + 1);
  const parsed: unknown = JSON.parse(jsonSlice);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not an array.");
  }

  const events: ScrapedEvent[] = [];
  for (const item of parsed) {
    const obj = toObjectRecord(item);
    if (!obj) {
      continue;
    }

    const title = normalizeCaption(obj.title);
    const date = normalizeCaption(obj.date);
    const time = normalizeCaption(obj.time);
    const location = normalizeCaption(obj.location);
    const description = normalizeCaption(obj.description);

    const hasAllFields = Boolean(title && date && time && location && description);
    const hasValidDate = Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));
    if (!hasAllFields || !hasValidDate) {
      continue;
    }

    events.push({ title, date, time, location, description });
  }

  return events;
}

export async function scrapeInstagramEvents(username: string): Promise<ScrapedEvent[]> {
  const normalizedUsername = username.trim().replace(/^@/, "");
  if (!normalizedUsername) {
    throw new Error("Instagram username is required.");
  }

  const apifyApiToken = getRequiredValue(
    process.env.APIFY_API_TOKEN ??
      process.env.APIFY_API_KEY ??
      process.env.Apify_API_KEY ??
      process.env.apify_api_key ??
      process.env.APIFY_TOKEN,
    "APIFY_API_TOKEN",
  );
  const geminiApiKey = getRequiredValue(
    process.env.GEMINI_API_KEY ?? process.env.gemini_api_key ?? process.env.GOOGLE_API_KEY,
    "GEMINI_API_KEY",
  );

  const apify = new ApifyClient({ token: apifyApiToken });
  const run = await apify.actor(APIFY_ACTOR_ID).call({
    usernames: [normalizedUsername],
    resultsLimit: MAX_POSTS,
    maxItems: MAX_POSTS,
  });

  if (!run.defaultDatasetId) {
    return [];
  }

  const datasetItems = await apify.dataset(run.defaultDatasetId).listItems({
    limit: MAX_POSTS,
    clean: true,
  });

  const captions = datasetItems.items
    .flatMap(item => extractCaptionsFromItem(item))
    .filter((caption, index, arr) => arr.indexOf(caption) === index)
    .slice(0, MAX_POSTS);

  if (captions.length === 0) {
    return [];
  }

  const gemini = new GoogleGenAI({ apiKey: geminiApiKey });
  const prompt = buildGeminiPrompt(captions);

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const rawText = typeof response.text === "string" ? response.text : "";
  if (!rawText) {
    return [];
  }

  return parseGeminiJsonArray(rawText);
}