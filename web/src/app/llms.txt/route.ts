import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

export const revalidate = 3600;

export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a public event discovery site for Tuebingen, Germany. The primary public page is the Discover page, which aggregates upcoming club nights, student parties, community meetups, and daytime events in Tuebingen.

Important notes:

- Primary language: German
- Primary timezone: Europe/Berlin
- Primary crawl entry point: ${absoluteUrl("/discover")}
- Event detail pages for public external events live under ${absoluteUrl("/event/[id]")}
- The site exposes structured data on public event pages and the discover page

## Primary Pages

- [Discover](https://www.wasgehttueb.app/discover): Main public overview of upcoming events in Tuebingen
- [Sitemap](https://www.wasgehttueb.app/sitemap.xml): Crawlable list of public routes and event detail pages
- [Robots](https://www.wasgehttueb.app/robots.txt): Crawl directives for search and AI crawlers

## Content Areas

- [Feedback](https://www.wasgehttueb.app/feedback): Public feedback page
- [Impressum](https://www.wasgehttueb.app/impressum): Legal notice
- [Datenschutz](https://www.wasgehttueb.app/datenschutz): Privacy information
- [Nutzungsbedingungen](https://www.wasgehttueb.app/nutzungsbedingungen): Terms of use

## Optional

- [Home](https://www.wasgehttueb.app/): Entry page for the app
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
