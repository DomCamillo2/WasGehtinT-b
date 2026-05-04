import Link from "next/link";
import { PrivacyConsentControls } from "@/components/legal/privacy-consent-controls";
import { LegalPageShell, LegalSection } from "@/components/layout/legal-page-shell";

export default function DatenschutzPage() {
  return (
    <LegalPageShell
      eyebrow="Datenschutz"
      title={"Datenschutzerkl\u00e4rung"}
      description={"DSGVO-Informationsseite f\u00fcr WasGehtT\u00fcb nach Art. 13 DSGVO, optimiert f\u00fcr dunkle Darstellung auf mobilen Ger\u00e4ten."}
      footer={
        <>
          {"Zur\u00fcck zur"}{" "}
          <Link href="/" className="font-medium underline decoration-[color:var(--accent)] underline-offset-4">
            Startseite
          </Link>
          .
        </>
      }
    >
      <LegalSection title="1. Verantwortlicher">
        <p>{"Domile UG (haftungsbeschr\u00e4nkt)"}</p>
        <p>{"Graf-Wartenberg-Ring 11, 84577 T\u00fc\u00dfling"}</p>
        <p>E-Mail: info@mentor-pro.de</p>
        <p>Telefon: +49 (0) 1606969914</p>
      </LegalSection>

      <LegalSection title="2. Verarbeitete Daten">
        <ul className="list-disc space-y-1 pl-5">
          <li>Accountdaten (Uni-E-Mail, Anzeigename, Auth-ID)</li>
          <li>{"Party- und Anfrage-Daten (Titel, Beschreibung, Gruppengr\u00f6\u00dfe, Nachrichten)"}</li>
          <li>{"Standortdaten (grob f\u00fcr Discover, ggf. manuell gesetzter Pin)"}</li>
          <li>Technische Server- und Sicherheitslogs</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Zwecke und Rechtsgrundlagen">
        <ul className="list-disc space-y-1 pl-5">
          <li>{"Vertragserf\u00fcllung (Art. 6 Abs. 1 lit. b DSGVO) f\u00fcr Kernfunktionen der Plattform"}</li>
          <li>{"Rechtliche Pflichten (Art. 6 Abs. 1 lit. c DSGVO), soweit einschl\u00e4gig"}</li>
          <li>Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO), z. B. Systemsicherheit</li>
        </ul>
      </LegalSection>

      <LegalSection title={"4. Empf\u00e4nger / Auftragsverarbeiter"}>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {"Supabase (Datenbank/Auth): Hosting der Datenbank- und Auth-Infrastruktur. Bei Drittlandbezug erfolgt \u00dcbermittlung auf Basis geeigneter Garantien, insbesondere Standardvertragsklauseln (SCC). Regionale Verarbeitung m\u00f6glichst EU-nah (z. B. Frankfurt) konfigurieren."}
          </li>
          <li>Vercel (Hosting)</li>
          <li>
            Resend (Transaktionsmails): Versand von System-E-Mails. Datenverarbeitung auf Grundlage eines
            Auftragsverarbeitungsvertrags (AVV) bzw. gleichwertiger vertraglicher Regelungen.
          </li>
          <li>
            {"Karten-/Geodienste (OpenStreetMap/Nominatim): Bei Nutzung der Karten- und Geocoding-Funktionen k\u00f6nnen technische Nutzungsdaten (z. B. IP-Adresse) an die jeweiligen Dienstanbieter \u00fcbertragen werden."}
          </li>
          <li>
            Google Ireland Limited / Google LLC (Google Analytics): Analyse der Nutzung unserer Website nach erteilter Einwilligung.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Speicherdauer">
        <p>
          {"Daten werden nur so lange gespeichert, wie es f\u00fcr die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen."}
        </p>
      </LegalSection>

      <LegalSection title="6. Betroffenenrechte">
        <p>
          {"Du hast Rechte auf Auskunft, Berichtigung, L\u00f6schung, Einschr\u00e4nkung, Daten\u00fcbertragbarkeit und Widerspruch sowie ein Beschwerderecht bei einer Aufsichtsbeh\u00f6rde."}
        </p>
      </LegalSection>

      <LegalSection title="7. Pflicht zur Bereitstellung von Daten">
        <p>
          {"Bestimmte Daten (z. B. E-Mail und Login-Daten) sind f\u00fcr die Nutzung der Plattform erforderlich. Ohne diese Daten kann kein Account bereitgestellt werden."}
        </p>
      </LegalSection>

      <LegalSection title="8. Sicherheit der Verarbeitung">
        <p>
          {"Wir setzen technische und organisatorische Ma\u00dfnahmen ein, um deine Daten zu sch\u00fctzen (z. B. Zugriffsbeschr\u00e4nkungen, Transportverschl\u00fcsselung, Sicherheits-Header)."}
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies und Einwilligung">
        <p>
          {"Es werden technisch notwendige Cookies fuer Login, Sitzungsverwaltung und Sicherheit eingesetzt. Fuer optionale externe Dienste und Webanalyse (Google Analytics) holen wir vor der Aktivierung eine Einwilligung ueber das Cookie-Consent-Banner ein (Art. 6 Abs. 1 lit. a DSGVO, Section 25 Abs. 1 TDDDG)."}
        </p>
        <PrivacyConsentControls />
      </LegalSection>

      <LegalSection title="10. Google Analytics (GA4)">
        <p>
          Wir nutzen Google Analytics 4 (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland)
          nur nach deiner Einwilligung.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO und Section 25 Abs. 1 TDDDG.</li>
          <li>Zweck: Reichweitenmessung, Nutzungsanalyse und technische Optimierung.</li>
          <li>
            IP-Anonymisierung ist aktiv (anonymize_ip). Eine direkte Personenidentifikation durch uns ist nicht
            beabsichtigt.
          </li>
          <li>
            Es kann zu Datenuebermittlungen in die USA kommen. Google stützt Uebermittlungen auf das EU-US Data
            Privacy Framework sowie Standardvertragsklauseln (SCC), soweit erforderlich.
          </li>
          <li>
            Du kannst deine Einwilligung jederzeit mit Wirkung fuer die Zukunft widerrufen (siehe Cookie-Einstellungen
            oben).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={"11. Kontakt fuer Datenschutzanfragen"}>
        <p>{"Domile UG (haftungsbeschr\u00e4nkt)"}</p>
        <p>{"Graf-Wartenberg-Ring 11, 84577 T\u00fc\u00dfling"}</p>
        <p>E-Mail: info@mentor-pro.de</p>
        <p>Telefon: +49 (0) 1606969914</p>
      </LegalSection>
    </LegalPageShell>
  );
}
