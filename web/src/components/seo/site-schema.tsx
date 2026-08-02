import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/security";

export function SiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "de-DE",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
