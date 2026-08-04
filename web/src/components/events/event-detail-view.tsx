import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Music2,
  Ticket,
  Users,
} from "lucide-react";
import { EventDetailMotion } from "@/components/events/event-detail-motion";
import type { PublicEventPageData } from "@/services/events/external-event-page-service";

type Props = {
  event: PublicEventPageData;
};

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)]">
      {children}
    </span>
  );
}

export function EventDetailView({ event }: Props) {
  const chips = [
    event.kindLabel,
    event.scopeLabel,
    event.displayCategory,
    event.audienceLabel,
    event.priceInfo,
    event.isAllDay ? "Ganztägig" : event.durationLabel,
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  return (
    <article className="space-y-8">
      <EventDetailMotion>
        <Link
          href="/discover"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
        >
          ← Zurück zu Entdecken
        </Link>
      </EventDetailMotion>

      {/* Hero */}
      <EventDetailMotion delay={0.04}>
      <header className="overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface)]">
        <div className="relative aspect-[16/10] w-full bg-[color:var(--surface-elevated)] sm:aspect-[21/9]">
          {event.heroImageUrl ? (
            <Image
              src={event.heroImageUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 960px"
              className="object-cover object-center"
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(14,17,16,0.92) 0%, rgba(14,17,16,0.45) 45%, rgba(14,17,16,0.15) 100%)",
            }}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              {event.clubName}
            </p>
            <h1 className="font-wordmark text-3xl leading-tight text-white sm:text-4xl">
              {event.title}
            </h1>
            <p className="text-sm text-white/80 sm:text-base">
              {event.weekdayLabel}
              {event.isAllDay
                ? " · ganztägig"
                : ` · ${event.startTimeLabel}–${event.endTimeLabel}`}
            </p>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-[color:var(--border-soft)] px-4 py-3 sm:px-6">
            {chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </div>
        ) : null}
      </header>
      </EventDetailMotion>

      {/* Actions */}
      <EventDetailMotion delay={0.08} className="flex flex-wrap gap-2">
        {event.externalLink ? (
          <a
            href={event.externalLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[color:var(--accent)] px-4 text-sm font-semibold text-[color:var(--accent-dark-text)] transition-opacity hover:opacity-90 sm:flex-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Mehr beim Veranstalter
          </a>
        ) : null}
        {event.mapsLink ? (
          <a
            href={event.mapsLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-4 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--border-strong)] sm:flex-none"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Route / Karte
          </a>
        ) : null}
      </EventDetailMotion>

      {/* Quick facts */}
      <EventDetailMotion delay={0.12}>
      <section aria-labelledby="event-facts-heading" className="space-y-3">
        <h2 id="event-facts-heading" className="font-wordmark text-xl text-[color:var(--foreground)]">
          Auf einen Blick
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Datum
            </dt>
            <dd className="mt-2 text-sm font-semibold text-[color:var(--foreground)] sm:text-base">
              {event.weekdayLabel}
            </dd>
          </div>
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
              <Clock3 className="h-4 w-4" aria-hidden />
              Uhrzeit
            </dt>
            <dd className="mt-2 text-sm font-semibold tabular-nums text-[color:var(--foreground)] sm:text-base">
              {event.isAllDay
                ? "Ganztägig"
                : `${event.startTimeLabel} – ${event.endTimeLabel}`}
              {event.durationLabel && !event.isAllDay ? (
                <span className="mt-1 block text-xs font-medium text-[color:var(--muted-foreground)]">
                  {event.durationLabel}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
              <MapPin className="h-4 w-4" aria-hidden />
              Ort
            </dt>
            <dd className="mt-2 text-sm font-semibold text-[color:var(--foreground)] sm:text-base">
              {event.displayLocationName}
              {event.coordsEstimated ? (
                <span className="mt-1 block text-xs font-medium text-[color:var(--muted-foreground)]">
                  Pin geschätzt anhand des Veranstaltungsorts
                </span>
              ) : null}
            </dd>
          </div>
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
              {event.priceInfo ? (
                <Ticket className="h-4 w-4" aria-hidden />
              ) : (
                <Music2 className="h-4 w-4" aria-hidden />
              )}
              {event.priceInfo ? "Eintritt" : "Kategorie"}
            </dt>
            <dd className="mt-2 text-sm font-semibold text-[color:var(--foreground)] sm:text-base">
              {event.priceInfo ?? event.displayCategory}
            </dd>
          </div>
        </dl>
      </section>
      </EventDetailMotion>

      {/* Description / known facts */}
      <EventDetailMotion delay={0.16}>
      <section aria-labelledby="event-about-heading" className="space-y-3">
        <h2 id="event-about-heading" className="font-wordmark text-xl text-[color:var(--foreground)]">
          {event.weakDescription ? "Was wir wissen" : "Beschreibung"}
        </h2>
        {!event.weakDescription && event.description ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-[color:var(--foreground)]/90 sm:text-[15px]">
            {event.description}
          </p>
        ) : (
          <ul className="space-y-2 text-sm leading-6 text-[color:var(--foreground)]/90">
            {event.facts.map((fact) => (
              <li key={fact.label} className="flex gap-2">
                <span className="shrink-0 font-semibold text-[color:var(--muted-foreground)]">
                  {fact.label}:
                </span>
                <span>{fact.value}</span>
              </li>
            ))}
          </ul>
        )}
        {event.weakDescription ? (
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
            Viele Veranstalter liefern nur kurze Infos. Über den Link zum Veranstalter findest du oft
            Line-up, Tickets und Hausregeln.
          </p>
        ) : null}
      </section>
      </EventDetailMotion>

      {/* Extra meta */}
      <EventDetailMotion delay={0.2}>
      <section className="space-y-3" aria-labelledby="event-meta-heading">
        <h2 id="event-meta-heading" className="font-wordmark text-xl text-[color:var(--foreground)]">
          Mehr Infos
        </h2>
        <div className="divide-y divide-[color:var(--border-soft)] border-y border-[color:var(--border-soft)]">
          {event.audienceLabel ? (
            <div className="flex gap-3 py-3">
              <Users className="mt-0.5 h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  Zielgruppe
                </p>
                <p className="mt-1 text-sm text-[color:var(--foreground)]">{event.audienceLabel}</p>
              </div>
            </div>
          ) : null}
          {event.musicGenre && event.musicGenre !== event.displayCategory ? (
            <div className="flex gap-3 py-3">
              <Music2 className="mt-0.5 h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  Musik / Genre
                </p>
                <p className="mt-1 text-sm text-[color:var(--foreground)]">{event.musicGenre}</p>
              </div>
            </div>
          ) : null}
          {event.vibeLabel && event.vibeLabel !== event.displayCategory ? (
            <div className="flex gap-3 py-3">
              <Music2 className="mt-0.5 h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  Vibe
                </p>
                <p className="mt-1 text-sm text-[color:var(--foreground)]">{event.vibeLabel}</p>
              </div>
            </div>
          ) : null}
          {event.sourceBadge ? (
            <div className="flex gap-3 py-3">
              <ExternalLink className="mt-0.5 h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  Quelle
                </p>
                <p className="mt-1 text-sm text-[color:var(--foreground)]">{event.sourceBadge}</p>
              </div>
            </div>
          ) : null}
          {event.coordinatesLabel ? (
            <div className="flex gap-3 py-3">
              <MapPin className="mt-0.5 h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                  Koordinaten
                </p>
                <p className="mt-1 text-sm tabular-nums text-[color:var(--foreground)]">
                  {event.coordinatesLabel}
                </p>
                {event.openStreetMapLink ? (
                  <a
                    href={event.openStreetMapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-medium text-[color:var(--accent)] underline-offset-2 hover:underline"
                  >
                    Auf OpenStreetMap öffnen
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex gap-3 py-3">
            <CalendarDays className="mt-0.5 h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                Zeitfenster
              </p>
              <p className="mt-1 text-sm text-[color:var(--foreground)]">
                Start: {event.startDateLabel}
              </p>
              <p className="mt-0.5 text-sm text-[color:var(--foreground)]">
                Ende: {event.endDateLabel}
              </p>
            </div>
          </div>
        </div>
      </section>
      </EventDetailMotion>

      {event.relatedEvents.length > 0 ? (
        <EventDetailMotion delay={0.24}>
        <section aria-labelledby="event-related-heading" className="space-y-3">
          <h2
            id="event-related-heading"
            className="font-wordmark text-xl text-[color:var(--foreground)]"
          >
            Mehr bei {event.clubName}
          </h2>
          <ul className="space-y-2">
            {event.relatedEvents.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.detailHref}
                  className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-4 py-3 transition-colors hover:border-[color:var(--border-strong)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[color:var(--foreground)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[color:var(--muted-foreground)]">
                      {item.whenLabel} · {item.venueLabel}
                    </span>
                  </span>
                  <span className="shrink-0 text-[color:var(--accent)]" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </EventDetailMotion>
      ) : null}
    </article>
  );
}
