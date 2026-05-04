import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { getCopy } from "@/lib/i18n";
import { loadPublicProfilePageData } from "@/services/profile/public-profile-service";

type Params = Promise<{ userId: string }>;

export default async function PublicProfilePage({ params }: { params: Params }) {
  const { userId } = await params;
  const t = getCopy("de").profile;

  const profileResult = await loadPublicProfilePageData(userId);

  if (!profileResult.profile) {
    return (
      <AppShell theme="new">
        <ScreenHeader title={t.title} subtitle={t.subtitle} />
        <Card className="border border-[color:var(--border-soft)]">
          <p className="text-sm text-[color:var(--text-muted)]">Profil nicht gefunden.</p>
        </Card>
      </AppShell>
    );
  }

  const profile = profileResult.profile;
  const initial = String(profile.displayName?.[0] ?? "U").toUpperCase();

  return (
    <AppShell theme="new">
      <ScreenHeader title={t.title} subtitle={t.subtitle} />

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
              {initial}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-[color:var(--text-main)]">{profile.displayName ?? t.noName}</p>
            <p className="text-xs text-[color:var(--text-muted)]">ID: {profile.id.slice(0, 8)}...</p>
          </div>
        </div>

        {profileResult.canViewDetails ? (
          <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
            <p>
              <span className="font-semibold text-[color:var(--text-main)]">{t.gender}:</span>{" "}
              {profile.gender ? t.genderValues[profile.gender] : "-"}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text-main)]">{t.age}:</span> {profile.age ?? "-"}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text-main)]">{t.studyProgram}:</span>{" "}
              {profile.studyProgram || "-"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 py-2">
            <p className="text-sm font-semibold text-[color:var(--text-main)]">{t.hiddenTitle}</p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">{t.hiddenBody}</p>
          </div>
        )}
      </Card>

      <Card className="mt-3 border border-[color:var(--border-soft)] p-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/discover" className="rounded-lg bg-[color:var(--bg-surface-2)] px-3 py-2 text-[color:var(--text-main)]">
            {t.backToDiscover}
          </Link>
          {!profileResult.isOwnProfile ? (
            <Link
              href="/profile"
              className="rounded-lg bg-[color:var(--accent)] px-3 py-2 text-[color:var(--accent-dark-text)]"
            >
              {t.ownProfileCta}
            </Link>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
