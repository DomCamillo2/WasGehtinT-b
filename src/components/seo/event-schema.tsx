type Props = {
  name: string;
  startDate: string;
  endDate?: string | null;
  location: string;
  description: string;
  url: string;
  organizerName?: string | null;
  externalLink?: string | null;
};

export function EventSchema({
  name,
  startDate,
  endDate,
  location,
  description,
  url,
  organizerName,
  externalLink,
}: Props) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    startDate,
    endDate: endDate ?? startDate,
    description,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: location,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Tübingen",
        addressCountry: "DE",
      },
    },
    organizer: organizerName
      ? {
          "@type": "Organization",
          name: organizerName,
          url: externalLink ?? undefined,
        }
      : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
