import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/layout/legal-page-shell";

export default function ImpressumPage() {
  return (
    <LegalPageShell
      eyebrow="Rechtliches"
      title="Impressum"
      description={"Alle Pflichtangaben zum Diensteanbieter von WasGehtT\u00fcb in einer mobilen, gut lesbaren Ansicht."}
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
      <LegalSection title="1. Diensteanbieter">
        <p>{"Domile UG (haftungsbeschr\u00e4nkt)"}</p>
        <p>Graf-Wartenberg-Ring 11</p>
        <p>{"84577 T\u00fc\u00dfling"}</p>
      </LegalSection>

      <LegalSection title="2. Kontakt">
        <p>Telefon: +49 (0) 1606969914</p>
        <p>E-Mail: info@mentor-pro.de</p>
        <p>Meldestelle Inhalte: info@mentor-pro.de</p>
      </LegalSection>

      <LegalSection title="3. Vertretungsberechtigte Person">
        <p>Leonhard Steiner</p>
      </LegalSection>

      <LegalSection title="4. Registereintrag (falls vorhanden)">
        <p>Handelsregister: HRB 32736</p>
        <p>Registergericht: Amtsgericht Traunstein</p>
      </LegalSection>

      <LegalSection title={"5. Verantwortlich f\u00fcr Inhalte"}>
        <p>{"Leonhard Steiner, Graf-Wartenberg-Ring 11, 84577 T\u00fc\u00dfling"}</p>
      </LegalSection>
    </LegalPageShell>
  );
}
