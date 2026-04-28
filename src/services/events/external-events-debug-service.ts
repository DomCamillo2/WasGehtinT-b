import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export type ExternalEventDebugItem = {
  id: string;
  title: string;
  startsAt: string;
  vibeLabel: string;
  berlinDateKey: string;
  berlinDateTime: string;
};

export type ExternalEventsDebugPageData = {
  selectedDate: string;
  selectedVibe: string;
  totalCount: number;
  schlachthausCount: number;
  filteredCount: number;
  quickDate: string;
  openDiscoverHref: string;
  availableVibes: string[];
  items: ExternalEventDebugItem[];
};

function toBerlinDateKey(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

function toBerlinDateTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
}

export async function loadExternalEventsDebugItems(): Promise<ExternalEventDebugItem[]> {
  const events = await fetchExternalEvents();

  return events
    .map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      vibeLabel: event.vibe_label,
      berlinDateKey: toBerlinDateKey(event.starts_at),
      berlinDateTime: toBerlinDateTimeLabel(event.starts_at),
    }))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

export async function loadExternalEventsDebugPageData(params: {
  date?: string;
  vibe?: string;
}): Promise<ExternalEventsDebugPageData> {
  const selectedDate = String(params.date ?? "all").trim();
  const selectedVibe = String(params.vibe ?? "all").trim().toLowerCase();
  const items = await loadExternalEventsDebugItems();

  const availableVibes = Array.from(
    new Set(
      items
        .map((event) => event.vibeLabel.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const filteredItems = items.filter((event) => {
    if (selectedDate !== "all" && event.berlinDateKey !== selectedDate) {
      return false;
    }

    if (selectedVibe !== "all") {
      return event.vibeLabel.toLowerCase().includes(selectedVibe);
    }

    return true;
  });

  const quickDate = items[0]?.berlinDateKey ?? "all";
  const openDiscoverHref =
    selectedDate !== "all"
      ? `/discover?view=calendar&date=${selectedDate}`
      : "/discover?view=list";

  return {
    selectedDate,
    selectedVibe,
    totalCount: items.length,
    schlachthausCount: items.filter((event) => event.vibeLabel.toLowerCase().includes("schlachthaus")).length,
    filteredCount: filteredItems.length,
    quickDate,
    openDiscoverHref,
    availableVibes,
    items: filteredItems,
  };
}
