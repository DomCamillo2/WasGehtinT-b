export function formatEuroFromCents(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format((cents || 0) / 100);
}

export function formatDateTime(input: string) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "Datum offen";
  }

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
