import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/layout/legal-page-shell";
import { ReportForm } from "@/components/report/report-form";

type SearchParams = {
  type?: string;
  id?: string;
};

export default async function MeldenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = params.type ?? "unbekannt";
  const id = params.id ?? "-";
  const reportLink = `mailto:info@mentor-pro.de?subject=${encodeURIComponent(`Meldung Inhalt (${type})`)}`;

  return (
    <LegalPageShell
      eyebrow="Sicherheit"
      title="Beitrag melden"
      description={"Danke f\u00fcr deinen Hinweis. Gemeldete Inhalte pr\u00fcfen wir zeitnah und entfernen rechtswidrige Inhalte nach Bewertung."}
      footer={
        <>
          {"Zur\u00fcck zu"}{" "}
          <Link href="/discover" className="underline decoration-[color:var(--accent)] underline-offset-4">
            Entdecken
          </Link>{" "}
          oder{" "}
          <Link href="/chat" className="underline decoration-[color:var(--accent)] underline-offset-4">
            Chat
          </Link>
          .
        </>
      }
    >
      <LegalSection title="Meldedetails">
        <p>Typ: {type}</p>
        <p>ID: {id}</p>
      </LegalSection>

      <LegalSection title="Meldung absenden (in App)">
        <p>{"Deine Meldung wird serverseitig gespeichert und intern gepr\u00fcft."}</p>
        <ReportForm targetType={type} targetId={id} />
      </LegalSection>

      <LegalSection title="Fallback">
        <p>Falls das Formular nicht funktioniert, kannst du uns alternativ per E-Mail schreiben.</p>
        <p>{"Kontakt: info@mentor-pro.de \u00b7 +49 (0) 1606969914"}</p>
        <a
          href={reportLink}
          className="inline-flex h-10 items-center rounded-2xl border px-4 text-sm font-semibold"
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
        >
          Meldung per E-Mail
        </a>
      </LegalSection>
    </LegalPageShell>
  );
}
