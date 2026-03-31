import Link from "next/link";
import { updateProfileAction } from "@/app/actions/profile";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { getCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ saved?: string; error?: string }>;

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  gender: "female" | "male" | "diverse" | null;
  age: number | null;
  study_program: string | null;
  profile_visibility: "public" | "members" | "hidden" | null;
};

type SubmissionRow = {
  id: string;
  title: string;
  starts_at: string;
  created_at: string;
  status: string | null;
  review_status: string | null;
};

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

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
  if (status === "published") return "Veroeffentlicht";
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
  const supabase = await createClient();
  const [params, authResult] = await Promise.all([searchParams, supabase.auth.getUser()]);
  const user = authResult.data.user;

  if (!user) {
    return null;
  }

  const profileResult = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url, gender, age, study_program, profile_visibility")
    .eq("id", user.id)
    .maybeSingle();

  const submissionQuery = await supabase
    .from("parties")
    .select("id, title, starts_at, created_at, status, review_status")
    .eq("host_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const fallbackSubmissionQuery = await (isMissingColumnError(submissionQuery.error?.code)
    ? supabase
        .from("parties")
        .select("id, title, starts_at, created_at, status")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
    : Promise.resolve({ data: null as null, error: null as null }));

  const useFallback = isMissingColumnError(submissionQuery.error?.code);
  const fallbackErrorCode = useFallback ? fallbackSubmissionQuery.error?.code : submissionQuery.error?.code;

  const legacySubmissionQuery = await (isMissingColumnError(fallbackErrorCode)
    ? supabase
        .from("parties")
        .select("id, title, date, created_at, is_published, review_status")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
    : Promise.resolve({ data: null as null }));

  const useLegacy = isMissingColumnError(fallbackErrorCode);

  const rawSubmissionRows = useLegacy
    ? ((legacySubmissionQuery.data ?? []) as Array<Record<string, unknown>>)
    : useFallback
      ? ((fallbackSubmissionQuery.data ?? []) as Array<Record<string, unknown>>)
      : ((submissionQuery.data ?? []) as Array<Record<string, unknown>>);

  const submissions = rawSubmissionRows.map((row) => {
    const rawStatus = row.status;
    const rawPublished = row.is_published;

    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? "Unbenannt"),
      starts_at: String(row.starts_at ?? row.date ?? row.created_at ?? ""),
      created_at: String(row.created_at ?? ""),
      status:
        typeof rawStatus === "string"
          ? rawStatus
          : typeof rawPublished === "boolean"
            ? rawPublished
              ? "published"
              : "draft"
            : null,
      review_status: typeof row.review_status === "string" ? row.review_status : null,
    } as SubmissionRow;
  });

  const profile = (profileResult.data ?? {
    display_name: user.user_metadata.display_name ?? user.email?.split("@")[0] ?? "",
    avatar_url: null,
    gender: null,
    age: null,
    study_program: null,
    profile_visibility: "members",
  }) as ProfileRow;

  const banner = getInfoBanner(params);

  return (
    <AppShell>
      <ScreenHeader title="Mein Profil" subtitle="Verwalte Profildaten und Sichtbarkeit." />

      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profilbild"
              className="h-14 w-14 rounded-full border border-zinc-200 object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full border border-zinc-200 bg-zinc-100 text-base font-bold text-zinc-700">
              {String(profile.display_name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-900">{profile.display_name ?? t.noName}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
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
            defaultValue={profile.display_name ?? ""}
            placeholder="Anzeigename"
            required
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 outline-none focus:border-zinc-400"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              name="gender"
              defaultValue={profile.gender ?? ""}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
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
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 outline-none focus:border-zinc-400"
            />
          </div>

          <input
            name="studyProgram"
            type="text"
            defaultValue={profile.study_program ?? ""}
            placeholder="Studiengang (optional)"
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 outline-none focus:border-zinc-400"
          />

          <div className="space-y-1">
            <label htmlFor="profileVisibility" className="text-xs font-medium text-zinc-600">
              Profilsichtbarkeit
            </label>
            <select
              id="profileVisibility"
              name="profileVisibility"
              defaultValue={profile.profile_visibility ?? "members"}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            >
              <option value="public">Öffentlich innerhalb der Plattform</option>
              <option value="members">Nur für eingeloggte Studis</option>
              <option value="hidden">Profilbild und Details verbergen</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="avatar" className="text-xs font-medium text-zinc-600">
              Profilbild aktualisieren
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <p className="text-[11px] text-zinc-500">JPG/PNG/WEBP, max. 3MB.</p>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white"
          >
            Profil speichern
          </button>
        </form>
      </Card>

      <Card className="mt-3 p-4">
        <p className="text-xs text-zinc-600">
          Deine Daten bleiben auf WasGehtTueb. Mehr Infos findest du in den rechtlichen Seiten.
        </p>
        <div className="mt-2 flex gap-3 text-xs">
          <Link href="/datenschutz" className="text-zinc-700 underline decoration-zinc-300 underline-offset-2">
            Datenschutz
          </Link>
          <Link href="/nutzungsbedingungen" className="text-zinc-700 underline decoration-zinc-300 underline-offset-2">
            AGB
          </Link>
        </div>
      </Card>

      <Card className="mt-3 space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Meine Club-Event Einreichungen</h2>
          <p className="text-xs text-zinc-500">Hier siehst du den Admin-Review und den Veröffentlichungsstatus.</p>
        </div>

        {submissions.length ? (
          submissions.map((submission) => (
            <div key={submission.id} className="rounded-xl border border-zinc-200 bg-white p-3">
              <p className="text-sm font-semibold text-zinc-900">{submission.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Start: {safeDateTimeLabel(submission.starts_at)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reviewStatusClassName(
                    submission.review_status,
                  )}`}
                >
                  Review: {reviewStatusLabel(submission.review_status)}
                </span>
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  Status: {publishStatusLabel(submission.status)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-500">Noch keine Club-Events eingereicht.</p>
        )}
      </Card>
    </AppShell>
  );
}
