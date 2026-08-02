/**
 * Clean scraped / partner event titles for UI display.
 * Some sources (e.g. Club Voltaire JSON-LD) publish URI-stylized names like `next://exit_open`.
 */

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    });
}

function stripTags(value: string): string {
  return decodeBasicEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeUriTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  // scheme://path  (next://exit_open, https://…, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return true;
  // bare protocol fragments / file-like junk
  if (/^(https?:|mailto:|tel:|next:)/i.test(t)) return true;
  if (/^(undefined|null|n\/a|untitled)$/i.test(t)) return true;
  return false;
}

function humanizeSlug(raw: string): string | null {
  const cleaned = raw
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3) return null;
  return cleaned
    .split(" ")
    .map((part) => {
      if (part.length <= 2) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function titleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    return humanizeSlug(slug);
  } catch {
    return null;
  }
}

function titleFromDescription(description: string | null | undefined): string | null {
  if (!description) return null;
  const plain = stripTags(description);
  if (!plain) return null;

  // Prefer a short lead clause before trailing venue/copy fluff.
  let lead = plain.split(/(?<=[.!?])\s+/)[0]?.trim() ?? plain;
  lead = lead.replace(/\s+Eintritt:.*/i, "").trim();
  const tuebCut = lead.search(/\s+Tübingen/i);
  if (tuebCut > 20) {
    lead = lead.slice(0, tuebCut).trim();
  }
  if (lead.length > 72) {
    const soft = lead.slice(0, 72);
    const cut = Math.max(soft.lastIndexOf(" "), soft.lastIndexOf("–"), soft.lastIndexOf("-"));
    lead = (cut > 24 ? soft.slice(0, cut) : soft).trim();
  }
  if (lead.length < 8) return null;
  // Avoid using venue boilerplate as title
  if (/club\s*voltaire|–\s*(party|kultur|workshop)/i.test(lead) && lead.length < 28) {
    return null;
  }
  return lead;
}

function humanizeUriTitle(title: string): string {
  return (
    humanizeSlug(
      title
        .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
        .replace(/[/:]+/g, " "),
    ) ?? title
  );
}

export function sanitizeExternalEventTitle(
  title: string,
  options?: { description?: string | null; externalLink?: string | null; fallback?: string },
): string {
  const raw = String(title ?? "").trim();
  if (!looksLikeUriTitle(raw)) {
    return raw.slice(0, 140);
  }

  const fromDescription = titleFromDescription(options?.description);
  if (fromDescription) return fromDescription.slice(0, 140);

  const fromLink = titleFromUrl(options?.externalLink ?? undefined);
  if (fromLink) return fromLink.slice(0, 140);

  const humanized = humanizeUriTitle(raw);
  if (humanized && !looksLikeUriTitle(humanized)) return humanized.slice(0, 140);

  return (options?.fallback ?? "Event").slice(0, 140);
}
