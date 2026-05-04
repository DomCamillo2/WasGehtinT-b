import Link from "next/link";
import { updateProfileAction } from "@/app/actions/profile";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { getCopy } from "@/lib/i18n";
import { loadProfilePageData } from "@/services/profile/profile-page-service";

type SearchParams = Promise<{ saved?: string; error?: string }>;

function safeDateTimeLabel(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "Datum offen";
  }

  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function reviewStatusLabel(value: string | null): string {
  const status = String(value ?? "").toLowerCase();
  if (status === "pending") return "Im Admin-Review";
  if (status === "approved") return "Freigegeben";
  if (status === "rejected") return "Abgelehnt";
  return "Unbekannt";
}

function reviewStatusClassName(value: string | null): string {
  const status = String(value ?? "").toLowerCase();
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function publishStatusLabel(value: string | null): string {
  const status = String(value ?? "").toLowerCase();
  if (status === "published") return "Veröffentlicht";
  if (status === "draft") return "Entwurf";
  if (status === "cancelled") return "Abgelehnt/Beendet";
  if (status === "closed") return "Geschlossen";
  return "Unbekannt";
}

function getInfoBanner(params: { saved?: string; error?: string }) {
  if (params.saved === "1") {
    return { type: "success" as const, text: "Profil gespeichert." };
  }

  if (params.error === "display_name") {
    return { type: "error" as const, text: "Bitte gib einen Anzeigenamen mit mindestens 2 Zeichen ein." };
  }

  if (params.error === "age") {
    return { type: "error" as const, text: "Alter muss zwischen 16 und 99 liegen." };
  }

  if (params.error === "avatar") {
    return { type: "error" as const, text: "Avatar konnte nicht hochgeladen werden (JPG/PNG/WEBP, max. 3MB)." };
  }

  if (params.error === "save") {
    return { type: "error" as const, text: "Profil konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  return null;
}

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const t = getCopy("de").profile;
  const [params, profilePageData] = await Promise.all([searchParams, loadProfilePageData()]);

  if (!profilePageData) {
    return null;
  }
  const { profile, submissions, userEmail, userAvatarFallback, userDisplayFallback } = profilePageData;

  const banner = getInfoBanner(params);

  return (
    <AppShell theme="new">
      <ScreenHeader title="Mein Profil" subtitle="Verwalte Profildaten und Sichtbarkeit." />

      <Card className="space-y-4 border border-[color:var(--border-soft)] p-4">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profilbild"
              className="h-14 w-14 rounded-full border border-[color:var(--border-soft)] object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--bg-surface-2)] text-base font-bold text-[color:var(--text-main)]">
              {userAvatarFallback}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-main)]">{profile.displayName ?? userDisplayFallback ?? t.noName}</p>
            <p className="text-xs text-[color:var(--text-muted)]">{userEmail}</p>
          </div>
        </div>

        {banner ? (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              banner.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {banner.text}
          </p>
        ) : null}

        <form action={updateProfileAction} className="space-y-3">
          <input
            name="displayName"
            type="text"
            defaultValue={profile.displayName ?? ""}
            placeholder="Anzeigename"
            required
            className="h-12 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3.5 text-base text-[color:var(--text-main)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-strong)]"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              name="gender"
              defaultValue={profile.gender ?? ""}
              className="h-12 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3.5 text-sm text-[color:var(--text-main)] outline-none focus:border-[color:var(--accent-strong)]"
            >
              <option value="">Geschlecht (optional)</option>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
              <option value="diverse">divers</option>
            </select>

            <input
              name="age"
              type="number"
              min={16}
              max={99}
              defaultValue={profile.age ?? ""}
              placeholder="Alter"
              className="h-12 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3.5 text-base text-[color:var(--text-main)] outline-none focus:border-[color:var(--accent-strong)]"
            />
          </div>

          <input
            name="studyProgram"
            type="text"
            defaultValue={profile.studyProgram ?? ""}
            placeholder="Studiengang (optional)"
            className="h-12 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3.5 text-base text-[color:var(--text-main)] outline-none focus:border-[color:var(--accent-strong)]"
          />

          <div className="space-y-1">
            <label htmlFor="profileVisibility" className="text-xs font-medium text-[color:var(--text-muted)]">
              Profilsichtbarkeit
            </label>
            <select
              id="profileVisibility"
              name="profileVisibility"
              defaultValue={profile.profileVisibility ?? "members"}
              className="h-12 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3.5 text-sm text-[color:var(--text-main)] outline-none focus:border-[color:var(--accent-strong)]"
            >
              <option value="public">Öffentlich innerhalb der Plattform</option>
              <option value="members">Nur für eingeloggte Studis</option>
              <option value="hidden">Profilbild und Details verbergen</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="avatar" className="text-xs font-medium text-[color:var(--text-muted)]">
              Profilbild aktualisieren
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-main)] file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--bg-surface-2)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[color:var(--text-main)] hover:file:bg-[color:var(--surface-strong)]"
            />
            <p className="text-[11px] text-[color:var(--text-muted)]">JPG/PNG/WEBP, max. 3MB.</p>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-[color:var(--accent)] text-sm font-semibold text-[color:var(--accent-dark-text)]"
          >
            Profil speichern
          </button>
        </form>
      </Card>

      <Card className="mt-3 border border-[color:var(--border-soft)] p-4">
        <p className="text-xs text-[color:var(--text-muted)]">
          Deine Daten bleiben auf WasGehtTüb. Mehr Infos findest du in den rechtlichen Seiten.
        </p>
        <div className="mt-2 flex gap-3 text-xs">
          <Link
            href="/datenschutz"
            className="text-[color:var(--text-main)] underline decoration-[color:var(--border-soft)] underline-offset-2"
          >
            Datenschutz
          </Link>
          <Link
            href="/nutzungsbedingungen"
            className="text-[color:var(--text-main)] underline decoration-[color:var(--border-soft)] underline-offset-2"
          >
            AGB
          </Link>
        </div>
      </Card>

      <Card className="mt-3 border border-[color:var(--border-soft)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--text-main)]">Feedback oder Feature Request</h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Teile Bugs, Ideen oder Verbesserungswünsche direkt mit dem Team.
            </p>
          </div>
          <Link
            href="/feedback"
            className="inline-flex h-10 items-center rounded-xl bg-[color:var(--accent)] px-4 text-xs font-semibold text-[color:var(--accent-dark-text)]"
          >
            Senden
          </Link>
        </div>
      </Card>

      <Card className="mt-3 space-y-3 border border-[color:var(--border-soft)] p-4">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text-main)]">Meine Club-Event Einreichungen</h2>
          <p className="text-xs text-[color:var(--text-muted)]">Hier siehst du den Admin-Review und den Veröffentlichungsstatus.</p>
        </div>

        {submissions.length ? (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] p-3"
            >
              <p className="text-sm font-semibold text-[color:var(--text-main)]">{submission.title}</p>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                Start: {safeDateTimeLabel(submission.startsAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reviewStatusClassName(
                    submission.reviewStatus,
                  )}`}
                >
                  Review: {reviewStatusLabel(submission.reviewStatus)}
                </span>
                <span className="inline-flex rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300">
                  Status: {publishStatusLabel(submission.status)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-[color:var(--text-muted)]">Noch keine Club-Events eingereicht.</p>
        )}
      </Card>
    </AppShell>
  );
}
