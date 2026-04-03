import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/layout/legal-page-shell";

export default function NutzungsbedingungenPage() {
  return (
    <LegalPageShell
      eyebrow="Bedingungen"
      title="AGB & Nutzungsbedingungen"
      description={"Die wichtigsten Rahmenbedingungen f\u00fcr die Nutzung von WasGehtT\u00fcb in einer klaren, mobilen Darstellung."}
      footer={
        <>
          Weitere Pflichtseiten:{" "}
          <Link href="/impressum" className="underline decoration-[color:var(--accent)] underline-offset-4">
            Impressum
          </Link>{" "}
          und{" "}
          <Link href="/datenschutz" className="underline decoration-[color:var(--accent)] underline-offset-4">
            Datenschutz
          </Link>
          .
        </>
      }
    >
      <LegalSection title="1. Rolle der Plattform">
        <p>
          {"WasGehtT\u00fcb stellt ausschlie\u00dflich eine Vermittlungsplattform zur Verf\u00fcgung. Vertr\u00e4ge \u00fcber Teilnahme an Partys kommen ausschlie\u00dflich zwischen Host und Gast zustande."}
        </p>
      </LegalSection>

      <LegalSection title="2. Haftung">
        <p>
          {"WasGehtT\u00fcb ist nicht Veranstalter der Parties und haftet nicht f\u00fcr Sch\u00e4den, Verletzungen oder Sachsch\u00e4den im Zusammenhang mit Veranstaltungen von Hosts, au\u00dfer bei Vorsatz oder grober Fahrl\u00e4ssigkeit im gesetzlichen Rahmen."}
        </p>
      </LegalSection>

      <LegalSection title={"3. Zul\u00e4ssige Nutzung / private Hosts"}>
        <p>
          {"Die Plattform ist f\u00fcr private, nicht-gewerbliche Veranstaltungen gedacht. Gewerbliche Nutzung, systematische Gewinnerzielung oder steuer-/erlaubnispflichtige T\u00e4tigkeiten sind ohne ausdr\u00fcckliche Freigabe untersagt."}
        </p>
      </LegalSection>

      <LegalSection title="4. Inhalte, Chat und Meldungen">
        <p>
          {"Illegale Inhalte (z. B. Beleidigungen, Gewaltaufrufe, Diskriminierung, strafbare Inhalte) sind verboten. Inhalte k\u00f6nnen \u00fcber \"Beitrag melden\" gemeldet werden und werden nach Pr\u00fcfung entfernt."}
        </p>
      </LegalSection>

      <LegalSection title="5. Sanktionen">
        <p>{"Bei Verst\u00f6\u00dfen k\u00f6nnen Inhalte gel\u00f6scht, Accounts eingeschr\u00e4nkt oder gesperrt werden."}</p>
      </LegalSection>

      <LegalSection title={"6. Kontakt f\u00fcr Meldungen"}>
        <p>{"Domile UG (haftungsbeschr\u00e4nkt)"}</p>
        <p>{"Graf-Wartenberg-Ring 11, 84577 T\u00fc\u00dfling"}</p>
        <p>Telefon: +49 (0) 1606969914</p>
        <p>E-Mail: info@mentor-pro.de</p>
      </LegalSection>
    </LegalPageShell>
  );
}
