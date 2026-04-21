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
      <AppShell>
        <ScreenHeader title={t.title} subtitle={t.subtitle} />
        <Card>
          <p className="text-sm text-zinc-500">Profil nicht gefunden.</p>
        </Card>
      </AppShell>
    );
  }

  const profile = profileResult.profile;
  const initial = String(profile.displayName?.[0] ?? "U").toUpperCase();

  return (
    <AppShell>
      <ScreenHeader title={t.title} subtitle={t.subtitle} />

      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profilbild"
              className="h-14 w-14 rounded-full border border-zinc-200 object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full border border-zinc-200 bg-zinc-100 text-base font-bold text-zinc-700">
              {initial}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-zinc-900">{profile.displayName ?? t.noName}</p>
            <p className="text-xs text-zinc-500">ID: {profile.id.slice(0, 8)}...</p>
          </div>
        </div>

        {profileResult.canViewDetails ? (
          <div className="space-y-2 text-sm text-zinc-700">
            <p>
              <span className="font-semibold text-zinc-900">{t.gender}:</span>{" "}
              {profile.gender ? t.genderValues[profile.gender] : "-"}
            </p>
            <p>
              <span className="font-semibold text-zinc-900">{t.age}:</span> {profile.age ?? "-"}
            </p>
            <p>
              <span className="font-semibold text-zinc-900">{t.studyProgram}:</span>{" "}
              {profile.studyProgram || "-"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-sm font-semibold text-zinc-800">{t.hiddenTitle}</p>
            <p className="mt-1 text-xs text-zinc-600">{t.hiddenBody}</p>
          </div>
        )}
      </Card>

      <Card className="mt-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/discover" className="rounded-lg bg-zinc-100 px-3 py-2 text-zinc-700">
            {t.backToDiscover}
          </Link>
          {!profileResult.isOwnProfile ? (
            <Link href="/profile" className="rounded-lg bg-zinc-900 px-3 py-2 text-white">
              {t.ownProfileCta}
            </Link>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
