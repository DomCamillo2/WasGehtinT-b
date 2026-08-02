/**
 * Barrel re-exports for official venue scrapers.
 * Prefer importing from the specific module when editing a single venue.
 * @see ./README.md
 */

export { fetchSchlachthausEvents } from "@/lib/scrapers/schlachthaus";
export { fetchDignightsEvents } from "@/lib/scrapers/diginights";
export { fetchEpplehausEvents } from "@/lib/scrapers/epplehaus";
export {
  fetchTuebingenMarketEvents,
  fetchTuebingenFleaMarketEvents,
} from "@/lib/scrapers/markets";
export {
  fetchUniCalendarEvents,
  fetchSudhausEvents,
  fetchClubVoltaireEvents,
  fetchDaiEvents,
} from "@/lib/scrapers/generic-calendar";
export { fetchPartykelEvents } from "@/lib/scrapers/partykel";
export {
  fetchRedditEvents,
  fetchRedditEventBatches,
  type SourceScrapeResult,
} from "@/lib/scrapers/reddit";
